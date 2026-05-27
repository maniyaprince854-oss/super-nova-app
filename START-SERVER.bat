@echo off
:: Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator access...
    powershell -Command "Start-Process cmd '/k cd /d \"%~dp0\" && npm start' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit
)

:: Already admin — run directly
cd /d "%~dp0"
npm start
