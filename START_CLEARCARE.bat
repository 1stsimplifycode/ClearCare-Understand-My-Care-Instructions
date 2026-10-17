@echo off
rem Opens ClearCare as a desktop application window. Closing the window stops ClearCare.
cd /d "%~dp0"
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0ClearCare.ps1"
