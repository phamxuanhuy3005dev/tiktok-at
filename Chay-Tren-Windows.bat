@echo off
chcp 65001 >nul
title TikTok Automation Tool
color 0A

echo =======================================================
echo    HE THONG TU DONG HOA KENH TIKTOK (TIKTOK STUDIO)    
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Kiem tra Node.js
where node >nul 2>nul
if %errorlevel% equ 0 goto :check_modules

color 0C
echo [LOI] May tinh cua ban chua duoc cai dat Node.js!
echo.
echo Vui long cai dat Node.js (phien ban LTS) de chay ung dung:
echo 1. Tai bo cai tai: https://nodejs.org/ (chon ban LTS)
echo 2. Cai dat va tich hop mac dinh (Next -> Finish).
echo 3. Mo lai file nay sau khi cai dat xong.
echo.
echo Ban co muon tu dong mo trang tai Node.js ngay bay gio? (Y/N)
set /p OPEN_NODE="Chon: "
if /i "%OPEN_NODE%"=="Y" start https://nodejs.org/
pause
exit /b 1

:check_modules
:: 2. Kiem tra thu vien Backend (tu dong cai neu lan dau chay)
if exist "backend\node_modules\express" goto :start_app

echo [HE THONG] Dang khoi tao thu vien lan dau tien... Vui long doi trong giay lat!
cd /d "%~dp0backend"
call npm install --omit=dev
if %errorlevel% neq 0 goto :npm_failed

echo [HE THONG] Dang chuan bi trinh duyet tu dong hoa Playwright...
call npx playwright install chromium
cd /d "%~dp0"
echo [HE THONG] Da cai dat hoan tat!
echo.

:start_app
:: 3. Khoi dong ung dung
echo [HE THONG] Dang khoi chay TikTok Automation...
echo [HE THONG] Trinh duyet web se tu dong mo tai: http://localhost:3001
echo.
echo Nhan Ctrl + C de dung chuong trinh khi muon dong.
echo =======================================================
echo.

set AUTO_OPEN=true
cd /d "%~dp0"
node backend\server.js
pause
exit /b 0

:npm_failed
color 0C
echo [LOI] Cai dat thu vien that bai. Vui long kiem tra ket noi mang.
cd /d "%~dp0"
pause
exit /b 1
