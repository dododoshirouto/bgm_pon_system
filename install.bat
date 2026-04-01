chcp 65001

setlocal
@echo off

echo =============================
echo  BGM PON SYSTEM - セットアップ
echo =============================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js がインストールされていません。
  echo winget install OpenJS.NodeJS でインストールしてください。
  pause
  endlocal
  exit /b 1
)

echo [OK] Node.js が見つかりました。
echo.
echo 依存パッケージをインストール中...
cd /d "%~dp0server"
npm install

if %errorlevel% neq 0 (
  echo [ERROR] npm install に失敗しました。
  pause
  endlocal
  exit /b 1
)

echo.
echo =============================
echo  セットアップ完了！
echo  起動するには start.bat を実行してください。
echo =============================
pause
endlocal
