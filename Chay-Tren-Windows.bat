@echo off
chcp 65001 >nul
title TikTok Automation Tool

echo =======================================================
echo    HỆ THỐNG TỰ ĐỘNG HÓA KÊNH TIKTOK (TIKTOK STUDIO)    
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LỖI] Máy tính của bạn chưa được cài đặt Node.js!
    echo.
    echo Vui lòng cài đặt Node.js (phiên bản LTS) để chạy ứng dụng:
    echo 1. Tải bộ cài tại: https://nodejs.org/ (chọn bản LTS)
    echo 2. Cài đặt theo mặc định (Next -^> Finish).
    echo 3. Mở lại file Chay-Tren-Windows.bat này sau khi cài đặt xong.
    echo.
    set /p OPEN_NODE="Bạn có muốn tự động mở trang tải Node.js ngay bây giờ? (Y/N): "
    if /i "%OPEN_NODE%"=="Y" start https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Chạy Runner điều phối toàn bộ quá trình
node scripts\runner.js %*
if %errorlevel% neq 0 (
    echo.
    echo [THÔNG BÁO] Chương trình đã dừng.
    pause
)
