#!/bin/bash
clear

# Chuyển vào thư mục chứa script
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "======================================================="
echo "   HỆ THỐNG TỰ ĐỘNG HÓA KÊNH TIKTOK (TIKTOK STUDIO)    "
echo "======================================================="
echo ""

# 1. Kiểm tra Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ [LỖI] Máy tính của bạn chưa có Node.js!"
    echo ""
    echo "Vui lòng cài đặt Node.js để chạy công cụ:"
    echo "1. Tải bản cài đặt (LTS) tại: https://nodejs.org/"
    echo "   Hoặc nếu bạn dùng Homebrew: brew install node"
    echo "2. Chạy file cài đặt .pkg vừa tải về."
    echo "3. Nhấp đúp mở lại file Chay-Tren-Mac.command này."
    echo ""
    read -p "Bạn có muốn mở trang web tải Node.js ngay bây giờ? (y/n) " ans
    if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
        open "https://nodejs.org/"
    fi
    exit 1
fi

# 2. Cài đặt thư viện lần đầu
if [ ! -d "backend/node_modules" ]; then
    echo "📦 [HỆ THỐNG] Đang chuẩn bị thư viện lần đầu tiên... Vui lòng đợi trong giây lát!"
    cd backend
    npm install --omit=dev
    echo "🌐 [HỆ THỐNG] Đang chuẩn bị trình duyệt Playwright Chromium..."
    npx playwright install chromium
    cd ..
    echo "✅ [HỆ THỐNG] Cài đặt hoàn tất!"
    echo ""
fi

# 3. Khởi chạy ứng dụng
echo "🚀 [HỆ THỐNG] Đang khởi chạy TikTok Automation..."
echo "🌐 [HỆ THỐNG] Trình duyệt web sẽ tự động mở tại: http://localhost:3001"
echo ""
echo "💡 Nhấn tổ hợp phím [Ctrl + C] tại cửa sổ này khi muốn dừng chương trình."
echo "======================================================="
echo ""

export AUTO_OPEN=true
node backend/server.js
