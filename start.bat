@echo off
title RustAdmin Web Launcher
echo ========================================================
echo Starting RustAdmin Web Backend and Frontend...
echo ========================================================

:: Change working directory to this script's directory
cd /d "%~dp0"

:: Start backend in its own window with auto-reload
start "RustAdmin Server" cmd /k "cd /d ""%~dp0server"" && npm run dev"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start frontend in its own window
start "RustAdmin Client" cmd /k "cd /d ""%~dp0client"" && npm run dev"

echo.
echo ========================================================
echo RustAdmin Web is starting!
echo Web Dashboard will be available at: http://localhost:5173
echo ========================================================
echo.
pause
