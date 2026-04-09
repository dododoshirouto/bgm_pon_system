chcp 65001

setlocal
@echo off

echo =============================
echo  BGM PON SYSTEM - セットアップ
echo =============================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
  echo Gitをインストール中...
  winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
)

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.jsをインストール中...
  winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
)

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
  echo FFmpegをインストール中...
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
)

echo 環境のセットアップが完了しました。
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
