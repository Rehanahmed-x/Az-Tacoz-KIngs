@echo off
title Az Tacos King - Auto GitHub Push Watcher
cd /d "%~dp0"
echo Starting automatic GitHub sync watcher...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch_and_push.ps1"
pause
