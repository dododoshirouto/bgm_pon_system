@echo off
setlocal enabledelayedexpansion

echo =============================
echo  BGM PON SYSTEM
echo =============================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
  set "RAW=%%a"
  set "IP=!RAW: =!"
  echo  iPad URL: http://!IP!:3000
)

echo.
echo  PC URL: http://localhost:3000
echo.
echo  Stop: Ctrl+C
echo =============================
echo.

cd /d "%~dp0server"
node index.js
endlocal
cd /d "%~dp0"
pause
