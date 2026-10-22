# Agente local de impresión para Descartables Yofre. Requiere Windows PowerShell 5.1+.
# Escucha únicamente en 127.0.0.1 y valida cada solicitud contra el backend autenticado.
$ErrorActionPreference = "Stop"
$config = Get-Content (Join-Path $PSScriptRoot "agent.config.json") -Raw | ConvertFrom-Json
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$($config.port)/")

Add-Type -ReferencedAssemblies System.Drawing @"
using System;
using System.Drawing;
using System.Drawing.Printing;

public static class SilentTicketPrinter {
  public static string Print(string printerName, string text) {
    using (PrintDocument document = new PrintDocument()) {
      document.PrinterSettings.PrinterName = printerName;
      if (!document.PrinterSettings.IsValid) {
        throw new InvalidOperationException("La impresora seleccionada no es válida para Windows.");
      }

      string documentName = "Ticket Yofre " + DateTime.Now.ToString("yyyyMMdd-HHmmss-fff");
      string[] lines = text.Replace("\r\n", "\n").Split('\n');
      int paperHeight = Math.Max(360, Math.Min(12000, lines.Length * 23 + 100));

      document.DocumentName = documentName;
      document.PrintController = new StandardPrintController();
      document.DefaultPageSettings.Margins = new Margins(4, 4, 4, 4);
      document.DefaultPageSettings.PaperSize = new PaperSize("Ticket 58 mm", 228, paperHeight);
      document.OriginAtMargins = true;

      document.PrintPage += delegate(object sender, PrintPageEventArgs e) {
        using (Font bold = new Font("Consolas", 8.5f, FontStyle.Bold))
        using (StringFormat format = new StringFormat(StringFormat.GenericTypographic)) {
          format.FormatFlags |= StringFormatFlags.NoWrap;
          // Texto sin suavizado: los puntos negros se imprimen enteros y con más contraste.
          e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;
          float y = 0;
          float lineHeight = bold.GetHeight(e.Graphics) + 2;
          float width = e.MarginBounds.Width;
          for (int i = 0; i < lines.Length; i++) {
            e.Graphics.DrawString(lines[i], bold, Brushes.Black, new RectangleF(0, y, width, lineHeight), format);
            // Segunda pasada, apenas desplazada: incrementa el grosor de los trazos térmicos.
            e.Graphics.DrawString(lines[i], bold, Brushes.Black, new RectangleF(0.20f, y + 0.20f, width, lineHeight), format);
            y += lineHeight;
          }
          e.HasMorePages = false;
        }
      };

      document.Print();
      return documentName;
    }
  }
}
"@

function Write-Response($context, $status, $body) {
  $response = $context.Response
  $response.StatusCode = $status
  $response.ContentType = "application/json; charset=utf-8"
  $response.Headers["Access-Control-Allow-Origin"] = $config.appOrigin
  $response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  $response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  $response.Headers["Access-Control-Allow-Private-Network"] = "true"

  # Una respuesta 204 no puede contener cuerpo. Para el resto, HttpListener
  # exige declarar el tamaño antes de escribir o lanza ProtocolViolationException.
  if ($status -eq 204) {
    $response.ContentLength64 = 0
    $response.Close()
    return
  }

  $json = $body | ConvertTo-Json -Compress -Depth 8
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $response.ContentLength64 = $bytes.Length
  try {
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } finally {
    $response.OutputStream.Close()
  }
}

function Assert-Authorized($request) {
  if ($request.Headers["Origin"] -ne $config.appOrigin) { throw "Origen no autorizado." }
  $auth = $request.Headers["Authorization"]
  if (!$auth -or !$auth.StartsWith("Bearer ")) { throw "Falta autenticación." }
  try {
    Invoke-RestMethod -Uri "$($config.apiUrl)/printing/authorize-agent" -Method Post -Headers @{ Authorization = $auth } -ContentType "application/json" | Out-Null
  } catch { throw "Sesión no autorizada." }
}

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
function Center($text, $width = 32) {
  $value = [string]$text
  if ($value.Length -ge $width) { return $value }
  return (" " * [Math]::Floor(($width - $value.Length) / 2)) + $value
}
function Ticket-Text($ticket) {
  $text = [Text.StringBuilder]::new(); $line = "-" * 32
  [void]$text.AppendLine((Center "DESCARTABLES YOFRE"))
  [void]$text.AppendLine("Fecha: $($ticket.date)  $($ticket.time)")
  [void]$text.AppendLine("Venta #$($ticket.id)")
  [void]$text.AppendLine($line)
  $subtotal = 0
  foreach ($item in @($ticket.items)) { foreach ($part in @(Wrap $item.productName 32)) { [void]$text.AppendLine($part) }; [void]$text.Append((Row "$($item.quantity) x $(Money $item.price)" (Money $item.total))); $subtotal += [double]$item.price * [double]$item.quantity }
  [void]$text.AppendLine($line); [void]$text.Append((Row 'Subtotal' (Money $subtotal))); $discount = [Math]::Max(0, $subtotal - [double]$ticket.total); if ($discount -gt 0.005) { [void]$text.Append((Row 'Descuento / promoción' "-$(Money $discount)")) }
  foreach ($payment in @($ticket.payments)) { if ([double]$payment.surchargePercent -gt 0) { [void]$text.Append((Row "Recargo $($payment.methodName)" (Money ([double]$payment.amount-[double]$payment.baseAmount)))) } }
  [void]$text.Append((Row 'TOTAL FINAL' (Money $ticket.total))); if (@($ticket.payments).Count) { [void]$text.AppendLine("Forma de pago:"); foreach ($payment in @($ticket.payments)) { [void]$text.AppendLine("$($payment.methodName): $(Money $payment.amount)") } }
  [void]$text.AppendLine($line); [void]$text.AppendLine((Center "¡Gracias por su compra!")); [void]$text.AppendLine(); [void]$text.AppendLine()
  return $text.ToString()
}

$listener.Start(); Write-Host "Agente de impresión listo en http://127.0.0.1:$($config.port)"
while ($listener.IsListening) {
  $context = $listener.GetContext(); $request = $context.Request
  try {
    if ($request.HttpMethod -eq "OPTIONS") { Write-Response $context 204 @{}; continue }
    Assert-Authorized $request
    if ($request.HttpMethod -eq "GET" -and $request.Url.AbsolutePath -eq "/printers") { Write-Response $context 200 @{ printers = @(Get-Printer | Select-Object -ExpandProperty Name) }; continue }
    if ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/print") { $body = (New-Object IO.StreamReader($request.InputStream)).ReadToEnd() | ConvertFrom-Json; if (!(Get-Printer -Name $body.printer -ErrorAction SilentlyContinue)) { throw "La impresora seleccionada no existe." }; $document = [SilentTicketPrinter]::Print($body.printer, (Ticket-Text $body.ticket)); Write-Host "$document enviado a $($body.printer) mediante el controlador de Windows"; Write-Response $context 202 @{ accepted = $true; printer = $body.printer; document = $document }; continue }
    Write-Response $context 404 @{ message = "Ruta no encontrada." }
  } catch { Write-Response $context 403 @{ message = $_.Exception.Message } }
}
