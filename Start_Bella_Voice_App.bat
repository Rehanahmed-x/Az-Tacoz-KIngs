@echo off
title Az Tacos King - Bella AI Voice Assistant
echo ========================================================
echo   AZ TACOS KING - BELLA AI VOICE ORDERING DESK
echo   2030 W Camelback Rd, Phoenix, AZ ^| (480) 410-1914
echo ========================================================
echo.
echo Starting local secure web server for voice recognition...

:: Check if server is already running on port 8085
netstat -ano | findstr 8085 >nul
if %errorlevel% equ 0 (
    echo Local server already active on port 8085!
) else (
    start /b "" python -m http.server 8085 --directory "C:\Users\DELL\Desktop\Az Tacos King" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo Opening Bella in your browser...
start http://localhost:8085

echo.
echo ========================================================
echo   BELLA IS READY FOR CLIENT DEMO!
echo   Tap 'Call Bella to Order' or click the microphone to talk!
echo ========================================================
echo (Keep this small window open while using voice recognition)
pause >nul
