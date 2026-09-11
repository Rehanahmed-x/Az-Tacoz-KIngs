@echo off
title Authorize Git Push - Az Tacos King
cd /d "%~dp0"
echo ========================================================
echo   ONE-TIME GITHUB PUSH AUTHORIZATION
echo ========================================================
echo.
echo This connects your Git CLI to your GitHub account.
echo A browser window will open asking you to Sign In / Authorize.
echo Once approved, Windows will remember your credentials permanently,
echo allowing Antigravity AI to auto-push silently after every edit!
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   SUCCESS! GitHub Push is now permanently authorized!
    echo   Antigravity will now auto-push after every edit.
    echo ========================================================
) else (
    echo.
    echo Notice: If browser did not open, you can also click
    echo 'Push origin' once in GitHub Desktop!
)
pause
