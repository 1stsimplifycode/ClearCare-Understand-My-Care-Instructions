@echo off
rem Creates a "ClearCare" shortcut (with icon) on your Desktop and in the Start menu.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ClearCare.ps1" -CreateShortcut
