@echo off
title Rustiniere Desktop Launcher
echo ========================================================
echo Launching Rustiniere Standalone Desktop App...
echo ========================================================

cd /d "%~dp0"
npx electron .
