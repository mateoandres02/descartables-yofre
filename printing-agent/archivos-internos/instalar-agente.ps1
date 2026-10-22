$ErrorActionPreference = "Stop"

$sourceDirectory = $PSScriptRoot
$installDirectory = Join-Path $env:LOCALAPPDATA "DescartablesYofre\PrintAgent"
$nativePowerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$runName = "DescartablesYofrePrintAgent"

$files = @(
  "agent.config.json",
  "start-print-agent.ps1",
  "ejecutar-agente-oculto.ps1"
)

foreach ($file in $files) {
  if (!(Test-Path (Join-Path $sourceDirectory $file))) {
    throw "Falta el archivo requerido: $file"
  }
}

Write-Host "Instalando el agente de impresion..." -ForegroundColor Cyan

# Detener una version instalada anteriormente antes de reemplazar archivos.
$escapedInstallDirectory = [WildcardPattern]::Escape($installDirectory)
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*$escapedInstallDirectory*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
$existingLog = Join-Path $installDirectory "logs\agent.log"
if (Test-Path $existingLog) {
  Move-Item $existingLog (Join-Path $installDirectory "logs\agent.previous-install.log") -Force
}
foreach ($file in $files) {
  Copy-Item (Join-Path $sourceDirectory $file) (Join-Path $installDirectory $file) -Force
}

$launcher = Join-Path $installDirectory "ejecutar-agente-oculto.ps1"
$runCommand = "`"$nativePowerShell`" -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name $runName -Value $runCommand

Start-Process -FilePath $nativePowerShell -WindowStyle Hidden -ArgumentList @(
  "-NoProfile",
  "-NonInteractive",
  "-WindowStyle", "Hidden",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$launcher`""
)

$available = $false
for ($attempt = 0; $attempt -lt 20 -and !$available; $attempt++) {
  Start-Sleep -Milliseconds 500
  $client = New-Object Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect("127.0.0.1", 9108, $null, $null)
    if ($pending.AsyncWaitHandle.WaitOne(300)) {
      $client.EndConnect($pending)
      $available = $client.Connected
    }
  } catch {
    $available = $false
  } finally {
    $client.Close()
  }
}

if (!$available) {
  throw "El agente se instalo, pero no pudo iniciar. Revisa $installDirectory\logs\agent.log"
}

Write-Host ""
Write-Host "Instalacion completada." -ForegroundColor Green
Write-Host "El agente ya esta activo y se iniciara automaticamente con Windows."
Write-Host "Ubicacion: $installDirectory"
