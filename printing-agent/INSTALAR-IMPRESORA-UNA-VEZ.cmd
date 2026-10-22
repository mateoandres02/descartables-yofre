@echo off
title Instalador del agente de impresion - Descartables Yofre
cd /d "%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0archivos-internos\instalar-agente.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo completar la instalacion. Revisa el mensaje anterior.
  pause
  exit /b 1
)
echo.
echo Ya puedes cerrar esta ventana. No tendras que volver a iniciar el agente manualmente.
pause
