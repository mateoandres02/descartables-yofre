# Agente local de impresión para Descartables Yofre. Requiere Windows PowerShell 5.1+.
# Escucha únicamente en 127.0.0.1 y valida cada solicitud contra el backend autenticado.
$ErrorActionPreference = "Stop"
$config = Get-Content (Join-Path $PSScriptRoot "agent.config.json") -Raw | ConvertFrom-Json
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$($config.port)/")

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string pDataType; }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO doc);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle, byte[] bytes, int count, out int written);
}
"@

function Write-Response($context, $status, $body) {
  $json = $body | ConvertTo-Json -Compress -Depth 8
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $context.Response.StatusCode = $status
  $context.Response.ContentType = "application/json; charset=utf-8"
  $context.Response.Headers["Access-Control-Allow-Origin"] = $config.appOrigin
  $context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

function Assert-Authorized($request) {
  if ($request.Headers["Origin"] -ne $config.appOrigin) { throw "Origen no autorizado." }
  $auth = $request.Headers["Authorization"]
  if (!$auth -or !$auth.StartsWith("Bearer ")) { throw "Falta autenticación." }
  try {
    Invoke-RestMethod -Uri "$($config.apiUrl)/printing/authorize-agent" -Method Post -Headers @{ Authorization = $auth } -ContentType "application/json" | Out-Null
  } catch { throw "Sesión no autorizada." }
}

function Add-Text($buffer, $encoding, $text) { [void]$buffer.AddRange($encoding.GetBytes([string]$text)) }
function Add-Bytes($buffer, [byte[]]$bytes) { [void]$buffer.AddRange($bytes) }
function Money($value) { return (('{0:N2}' -f [double]$value).Replace(",", "X").Replace(".", ",").Replace("X", ".")) }
function Wrap($text, $width = 32) {
  $words = ([string]$text -split "\s+") | Where-Object { $_ }
  $lines = @(); $current = ""
  foreach ($word in $words) {
    if ($word.Length -gt $width) { if ($current) { $lines += $current; $current = "" }; for ($i=0; $i -lt $word.Length; $i += $width) { $lines += $word.Substring($i, [Math]::Min($width, $word.Length-$i)) } }
    elseif (!$current -or $current.Length + $word.Length + 1 -le $width) { $current += $(if ($current) { " " }) + $word }
    else { $lines += $current; $current = $word }
  }
  if ($current) { $lines += $current }; return $lines
}
function Row($left, $right) {
  $right = [string]$right; $max = [Math]::Max(1, 32 - $right.Length - 1); $lines = @(Wrap $left $max); $first = [string]$lines[0]
  $out = $first + (" " * [Math]::Max(1, 32-$first.Length-$right.Length)) + $right + "`n"
  if ($lines.Count -gt 1) { $out += (($lines | Select-Object -Skip 1) -join "`n") + "`n" }; return $out
}
function Add-Logo($buffer, $url) {
  if (!$url -or !$url.StartsWith($config.appOrigin)) { return }
  $file = Join-Path $env:TEMP ("yofre-logo-" + [guid]::NewGuid() + ".img")
  try {
    Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
    Add-Type -AssemblyName System.Drawing
    $source = [System.Drawing.Image]::FromFile($file); $width = [Math]::Min(320, $source.Width); $height = [Math]::Max(1, [int]($source.Height * $width / $source.Width))
    $bmp = [System.Drawing.Bitmap]::new($width, $height); $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.DrawImage($source, 0, 0, $width, $height); $graphics.Dispose(); $source.Dispose()
    $rowBytes = [Math]::Ceiling($width / 8); Add-Bytes $buffer ([byte[]](0x1D,0x76,0x30,0x00,($rowBytes -band 255),($rowBytes -shr 8),($height -band 255),($height -shr 8)))
    for ($y=0; $y -lt $height; $y++) { for ($xb=0; $xb -lt $rowBytes; $xb++) { $value=0; for ($bit=0; $bit -lt 8; $bit++) { $x=$xb*8+$bit; if ($x -lt $width) { $p=$bmp.GetPixel($x,$y); if ((0.299*$p.R + 0.587*$p.G + 0.114*$p.B) -lt 180) { $value = $value -bor (128 -shr $bit) } } }; [void]$buffer.Add([byte]$value) } }
    $bmp.Dispose()
  } catch { Write-Warning "No se pudo cargar el logo: $_" } finally { Remove-Item $file -Force -ErrorAction SilentlyContinue }
}
function Ticket-Bytes($ticket) {
  $cp858 = [Text.Encoding]::GetEncoding(858); $b = [Collections.Generic.List[byte]]::new(); $line = ("-" * 32) + "`n"
  Add-Bytes $b ([byte[]](0x1B,0x40,0x1B,0x74,0x13,0x1B,0x45,0x01,0x1B,0x61,0x01)); Add-Logo $b $ticket.logoUrl
  Add-Text $b $cp858 "DESCARTABLES YOFRE`nFecha: $($ticket.date)  $($ticket.time)`nVenta #$($ticket.id)`n$line"; Add-Bytes $b ([byte[]](0x1B,0x61,0x00))
  $subtotal = 0
  foreach ($item in @($ticket.items)) { foreach ($part in @(Wrap $item.productName 32)) { Add-Text $b $cp858 "$part`n" }; Add-Text $b $cp858 (Row "$($item.quantity) x $(Money $item.price)" (Money $item.total)); $subtotal += [double]$item.price * [double]$item.quantity }
  Add-Text $b $cp858 "$line$(Row 'Subtotal' (Money $subtotal))"; $discount = [Math]::Max(0, $subtotal - [double]$ticket.total); if ($discount -gt 0.005) { Add-Text $b $cp858 (Row 'Descuento / promoción' "-$(Money $discount)") }
  foreach ($payment in @($ticket.payments)) { if ([double]$payment.surchargePercent -gt 0) { Add-Text $b $cp858 (Row "Recargo $($payment.methodName)" (Money ([double]$payment.amount-[double]$payment.baseAmount))) } }
  Add-Bytes $b ([byte[]](0x1B,0x21,0x30)); Add-Text $b $cp858 (Row 'TOTAL FINAL' (Money $ticket.total)); Add-Bytes $b ([byte[]](0x1B,0x21,0x00)); if (@($ticket.payments).Count) { Add-Text $b $cp858 "Forma de pago:`n"; foreach ($payment in @($ticket.payments)) { Add-Text $b $cp858 "$($payment.methodName): $(Money $payment.amount)`n" } }
  Add-Bytes $b ([byte[]](0x1B,0x61,0x01)); Add-Text $b $cp858 "$line¡Gracias por su compra!`n`n`n"; return $b.ToArray()
}
function Send-Raw($printer, [byte[]]$bytes) {
  $handle = [IntPtr]::Zero; if (![RawPrinter]::OpenPrinter($printer, [ref]$handle, [IntPtr]::Zero)) { throw "No se pudo abrir la impresora seleccionada." }
  try { $doc = [RawPrinter+DOCINFO]::new(); $doc.pDocName = "Ticket Descartables Yofre"; $doc.pDataType = "RAW"; if ([RawPrinter]::StartDocPrinter($handle, 1, $doc) -le 0) { throw "No se pudo iniciar el trabajo de impresión." }; [RawPrinter]::StartPagePrinter($handle) | Out-Null; $written = 0; if (![RawPrinter]::WritePrinter($handle, $bytes, $bytes.Length, [ref]$written) -or $written -ne $bytes.Length) { throw "No se pudo enviar el ticket a Windows." }; [RawPrinter]::EndPagePrinter($handle) | Out-Null; [RawPrinter]::EndDocPrinter($handle) | Out-Null } finally { [RawPrinter]::ClosePrinter($handle) | Out-Null }
}

$listener.Start(); Write-Host "Agente de impresión listo en http://127.0.0.1:$($config.port)"
while ($listener.IsListening) {
  $context = $listener.GetContext(); $request = $context.Request
  try {
    if ($request.HttpMethod -eq "OPTIONS") { Write-Response $context 204 @{}; continue }
    Assert-Authorized $request
    if ($request.HttpMethod -eq "GET" -and $request.Url.AbsolutePath -eq "/printers") { Write-Response $context 200 @{ printers = @(Get-Printer | Select-Object -ExpandProperty Name) }; continue }
    if ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/print") { $body = (New-Object IO.StreamReader($request.InputStream)).ReadToEnd() | ConvertFrom-Json; if (!(Get-Printer -Name $body.printer -ErrorAction SilentlyContinue)) { throw "La impresora seleccionada no existe." }; Send-Raw $body.printer (Ticket-Bytes $body.ticket); Write-Response $context 202 @{ accepted = $true }; continue }
    Write-Response $context 404 @{ message = "Ruta no encontrada." }
  } catch { Write-Response $context 403 @{ message = $_.Exception.Message } }
}
