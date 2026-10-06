@echo off
title Expense Tracker
echo Starting Expense Tracker local server...
start /b powershell.exe -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
timeout /t 2 /nobreak > nul
echo Opening in default browser...
start http://localhost:8080/
echo.
echo Expense Tracker is running at: http://localhost:8080/
echo To stop, close this command window.
pause
