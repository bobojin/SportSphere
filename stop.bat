@echo off
setlocal

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" -Action stop

exit /b %errorlevel%
