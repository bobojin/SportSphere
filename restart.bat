@echo off
setlocal

cd /d "%~dp0"

if /I "%~1"=="/noopen" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" -Action restart -NoOpen
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" -Action restart
)

exit /b %errorlevel%
