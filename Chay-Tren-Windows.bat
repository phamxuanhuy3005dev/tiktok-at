@echo off
chcp 65001 >nul
title TikTok Automation Tool
color 0A

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
    echo 2. Cài đặt và tích hợp mặc định (Next -> Finish).
    echo 3. Mở lại file này sau khi cài đặt xong.
    echo.
    echo Bạn có muốn tự động mở trang tải Node.js ngay bây giờ? (Y/N)
    set /p OPEN_NODE="Chọn: "
    if /i "%OPEN_NODE%"=="Y" start https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Kiểm tra thư viện Backend
if not exist "backend\node_modules" (
    echo [HỆ THỐNG] Đang khởi tạo thư viện lần đầu tiên... Vui lòng đợi trong giây lát!
    cd backend
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        echo [LỖI] Cài đặt thư viện thất bại. Vui lòng kiểm tra kết nối mạng.
        pause
        exit /b 1
    )
    echo [HỆ THỐNG] Đang chuẩn bị trình duyệt tự động hóa Playwright...
    call npx playwright install chromium
    cd ..
    echo [HỆ THỐNG] Đã cài đặt hoàn tất!
    echo.
)

:: 3. Khởi động ứng dụng
echo [HỆ THỐNG] Đang khởi chạy TikTok Automation...
echo [HỆ THỐNG] Trình duyệt web sẽ tự động mở tại: http://localhost:3001
echo.
echo Nhấn Ctrl + C để dừng chương trình khi muốn đóng.
echo =======================================================
echo.

set AUTO_OPEN=true
node backend\server.js

pause
