$ErrorActionPreference = "Stop"
$appUrl = "https://descartables-yofre.vercel.app"
$profileDirectory = Join-Path $env:LOCALAPPDATA "DescartablesYofre\ChromeProfile"

$chromeCandidates = @(@(
  (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
) | Where-Object { $_ -and (Test-Path $_) })

if (!$chromeCandidates.Count) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("No se encontró Google Chrome. Instalalo y volvé a ejecutar este archivo.", "Descartables Yofre", "OK", "Error") | Out-Null
  exit 1
}

$chromePath = $chromeCandidates[0]
$printers = @(Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue)
$defaultPrinter = $printers | Where-Object { $_.Default } | Select-Object -First 1
$thermalPrinters = @($printers | Where-Object { $_.Name -match "(?i)(TP[- ]?POS|POS[- ]?58|POS58|Global|Thermal|Receipt)" })

# Evita que Windows cambie automáticamente la impresora predeterminada según
# cuál se haya usado por última vez.
$windowsPrinterKey = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Windows"
New-Item -Path $windowsPrinterKey -Force | Out-Null
New-ItemProperty -Path $windowsPrinterKey -Name "LegacyDefaultPrinterMode" -PropertyType DWord -Value 1 -Force | Out-Null

if ($thermalPrinters.Count -eq 1 -and (!$defaultPrinter -or $defaultPrinter.Name -ne $thermalPrinters[0].Name)) {
  try {
    Invoke-CimMethod -InputObject $thermalPrinters[0] -MethodName SetDefaultPrinter | Out-Null
    $defaultPrinter = $thermalPrinters[0]
  } catch {
    Start-Process -FilePath "$env:SystemRoot\System32\rundll32.exe" -ArgumentList @("printui.dll,PrintUIEntry", "/y", "/n", "`"$($thermalPrinters[0].Name)`"") -Wait -WindowStyle Hidden
    $defaultPrinter = $thermalPrinters[0]
  }
}

$oldRunKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $oldRunKey -Name "DescartablesYofrePrintAgent" -ErrorAction SilentlyContinue
$oldAgentDirectory = Join-Path $env:LOCALAPPDATA "DescartablesYofre\PrintAgent"
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*$oldAgentDirectory*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Path $profileDirectory -Force | Out-Null
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Descartables Yofre.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $chromePath
$shortcut.Arguments = "--app=`"$appUrl`" --kiosk-printing --no-first-run --disable-session-crashed-bubble --user-data-dir=`"$profileDirectory`""
$shortcut.WorkingDirectory = Split-Path $chromePath
$shortcut.IconLocation = "$chromePath,0"
$shortcut.Description = "Descartables Yofre - impresión silenciosa"
$shortcut.Save()

$printerText = if ($defaultPrinter) { "Impresora predeterminada: $($defaultPrinter.Name)" } else { "No hay impresora predeterminada. Configurá la TP-POS58 como predeterminada en Windows." }
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show("Acceso directo creado en el escritorio.`n`n$printerText`n`nAbrí siempre la aplicación desde ese acceso directo para imprimir sin ventanas.", "Descartables Yofre", "OK", "Information") | Out-Null
