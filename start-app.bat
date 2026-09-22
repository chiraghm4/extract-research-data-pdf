@echo off
title ParsePDF launcher
cd /d "%~dp0"
echo Starting ParsePDF...
echo The app will open in your browser. When you are done, come back to
echo this window and press Enter to stop everything.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1" %*
set code=%errorlevel%
if not "%code%"=="0" (
    echo.
    echo Some servers did not start. See the messages above.
)
echo.
pause