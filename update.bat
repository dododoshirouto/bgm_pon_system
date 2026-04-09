@echo off
chcp 65001
setlocal

where git >nul 2>nul
if %errorlevel% neq 0 (
  winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
)
where node >nul 2>nul
if %errorlevel% neq 0 (
  winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
)
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
)

git fetch
git pull

cd /d "%~dp0server"
npm install
npm update

endlocal