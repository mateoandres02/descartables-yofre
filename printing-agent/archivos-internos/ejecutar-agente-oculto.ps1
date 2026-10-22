$ErrorActionPreference = "Continue"

$agentDirectory = $PSScriptRoot
$agentScript = Join-Path $agentDirectory "start-print-agent.ps1"
$nativePowerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$logDirectory = Join-Path $agentDirectory "logs"
$logFile = Join-Path $logDirectory "agent.log"
$previousLog = Join-Path $logDirectory "agent.previous.log"

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Write-AgentLog($message) {
  $message | Out-File -FilePath $logFile -Append -Encoding Unicode
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\DescartablesYofrePrintAgentLauncher", [ref]$createdNew)
if (!$createdNew) {
  $mutex.Dispose()
  exit 0
}

try {
  while ($true) {
    try {
      if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 2MB) {
        Move-Item $logFile $previousLog -Force
      }

      Write-AgentLog "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Iniciando agente"
      & $nativePowerShell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $agentScript 2>&1 |
        Out-File -FilePath $logFile -Append -Encoding Unicode
      Write-AgentLog "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] El agente se detuvo. Reintentando en 5 segundos."
    } catch {
      Write-AgentLog "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Error del supervisor: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 5
  }
} finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
