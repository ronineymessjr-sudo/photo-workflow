@echo off
setlocal
cd /d "%~dp0"
start "PhotoAtelier Local" cmd /k "npm start"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8123/legacy/"
