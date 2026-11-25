@echo off
setlocal
cd /d "%~dp0"
title Phonics Learning System - Tablet QR Demo

echo Starting tablet QR demo...
echo.
start "Phonics Tablet Server" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline_server.ps1"
timeout /t 2 /nobreak >nul
exit /b 0
