@echo off
title Smart AI Telecom Campaign System Launcher
echo ==============================================================
echo        LAUNCHING SMART AI TELECOM CAMPAIGN DASHBOARD
echo ==============================================================

:: Check if Python FastAPI is already running on port 8000
echo Checking for active FastAPI instance on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [System] Found process on port 8000 (PID: %%a). Terminating old instance...
    taskkill /F /PID %%a
)

:: Check if Java Gateway is already running on port 8080
echo Checking for active Java Gateway instance on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo [System] Found process on port 8080 (PID: %%a). Terminating old instance...
    taskkill /F /PID %%a
)

echo.
echo [1/3] Starting Python FastAPI Backend on port 8000...
start /b python main.py

echo [2/3] Compiling Java Gateway Orchestrator...
javac TelecomCampaignGateway.java
if %errorlevel% neq 0 (
    echo [Error] Java Compilation failed!
    pause
    exit /b %errorlevel%
)

echo [3/3] Starting Java Gateway Server on port 8080...
start /b java TelecomCampaignGateway

echo.
echo ==============================================================
echo  Both services initialized successfully!
echo  FastAPI running on http://127.0.0.1:8000
echo  Java Gateway running on http://127.0.0.1:8080
echo.
echo  Opening the Campaign Dashboard...
echo ==============================================================
start index.html
pause
