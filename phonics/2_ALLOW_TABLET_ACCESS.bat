@echo off
setlocal
cd /d "%~dp0"
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting Administrator permission to add a PRIVATE-network firewall rule...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Adding Windows Firewall rule for TCP port 8765 for devices on the LOCAL SUBNET...
netsh advfirewall firewall delete rule name="Phonics Offline Tablet 8765" >nul 2>&1
netsh advfirewall firewall add rule name="Phonics Offline Tablet 8765" dir=in action=allow protocol=TCP localport=8765 profile=any remoteip=localsubnet

echo.
echo Done. You can close this window and run 1_START_TABLET_DEMO.bat again.
pause
