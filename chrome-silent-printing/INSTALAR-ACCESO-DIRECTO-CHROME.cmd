@echo off
title Instalar acceso directo - Descartables Yofre
cd /d "%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear-acceso-directo.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo crear el acceso directo.
  pause
  exit /b 1
)
echo.
echo Instalacion completada. Usa el acceso directo Descartables Yofre del escritorio.
pause
