@echo off
title Rustiniere - Standalone Desktop App
echo ========================================================
echo Launching Rustiniere Standalone Desktop App...
echo ========================================================

cd /d "%~dp0"

if exist "dist-desktop\win-unpacked\Rustiniere.exe" (
    start "" "dist-desktop\win-unpacked\Rustiniere.exe"
    exit /b
)

if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
    exit /b
)

call npm start
