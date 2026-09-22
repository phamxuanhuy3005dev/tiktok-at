@echo off
title TikTok Automation Tool
color 0A

cd /d "%~dp0"

echo =======================================================
echo    HE THONG TU DONG HOA KENH TIKTOK (TIKTOK STUDIO)
echo =======================================================
echo.

:: 1. Kiem tra Node.js trong PATH
where node >nul 2>nul
if %errorlevel% equ 0 goto :has_node

:: 1.1 Kiem tra duong dan cai dat mac dinh cua Node.js tren Windows
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    goto :has_node
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    goto :has_node
)
if exist "%LocalAppData%\Programs\node\node.exe" (
    set "PATH=%LocalAppData%\Programs\node;%PATH%"
    goto :has_node
)

:: 1.2 May tinh chua cai dat Node.js -> Huong dan cai dat
color 0C
echo [LOI] May tinh cua ban chua duoc cai dat Node.js!
echo.
echo Vui long cai dat Node.js (phien ban LTS) de chay ung dung:
echo 1. Nhan phim bat ky de mo trang web tai Node.js.
echo 2. Tai ban cai dat LTS va cai dat theo mac dinh (Next -> Finish).
echo 3. Mo lai file Chay-Tren-Windows.bat sau khi cai dat xong.
echo.
echo Nhan phim bat ky de mo trang tai Node.js (https://nodejs.org)...
pause >nul
start https://nodejs.org/
exit /b 1

:has_node
:: 2. Khoi chay thong qua Runner dieu phoi
node scripts\runner.js %*
set "RUNNER_EXIT=%errorlevel%"

:: 3. Kiem tra trang thai ket thuc va luon giu cua so khong bi tat dot ngot
if %RUNNER_EXIT% neq 0 (
    echo.
    echo =======================================================
    echo [THONG BAO] Chuong trinh da dung voi ma loi: %RUNNER_EXIT%
    echo Vui long kiem tra thong tin loi o tren.
    echo =======================================================
    echo.
    pause
    exit /b %RUNNER_EXIT%
)

echo.
echo [THONG BAO] Chuong trinh da dong.
pause
