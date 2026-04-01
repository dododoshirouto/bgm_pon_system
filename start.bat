chcp 65001

setlocal
@echo off

echo =============================
echo  BGM PON SYSTEM - 起動中...
echo =============================
echo.

:: IPv4アドレスを取得（192.168. または 10. または 172. のLAN IP）
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4"') do (
  set "RAW=%%a"
  setlocal enabledelayedexpansion
  set "IP=!RAW: =!"
  echo  PC のIPアドレス: !IP!
  echo  iPad からのアクセス URL: http://!IP!:3000
)

echo.
echo  PC からのアクセス URL: http://localhost:3000
echo.
echo  終了するには Ctrl+C を押してください。
echo =============================
echo.

cd /d "%~dp0server"
node index.js
endlocal
pause
