@echo off
setlocal enabledelayedexpansion

:: ポート引数のパース
set PORT=3000
:parse_args
if "%~1"=="" goto end_parse
if /i "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto parse_args
)
shift
goto parse_args
:end_parse

echo =============================
echo  BGM PON SYSTEM
echo =============================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
  set "RAW=%%a"
  set "IP=!RAW: =!"
  echo  iPad URL: http://!IP!:%PORT%
)

echo.
echo  PC URL: http://localhost:%PORT%
echo.
echo  Stop: Ctrl+C
echo =============================
echo.

cd /d "%~dp0server"
node index.js --port %PORT%
endlocal
cd /d "%~dp0"
pause
