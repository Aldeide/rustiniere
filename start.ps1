Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting RustAdmin Web Backend and Frontend..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process cmd.exe -ArgumentList "/k cd /d `"$scriptDir\server`" && npm run dev"
Start-Sleep -Seconds 2
Start-Process cmd.exe -ArgumentList "/k cd /d `"$scriptDir\client`" && npm run dev"

Write-Host "`nRustAdmin Web started!" -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Yellow
