#!/bin/bash
clear
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "======================================================="
echo "   ĐÓNG GÓI BẢN CÀI ĐẶT CHO NGƯỜI DÙNG KHÁC (ZIP)      "
echo "======================================================="
echo ""

# 1. Build frontend
echo "🔨 [1/3] Đang build Frontend mới nhất..."
npm run build --prefix frontend

# 2. Xóa file zip cũ nếu có trên Desktop
OUTPUT_ZIP="$HOME/Desktop/TikTok-Automation.zip"
rm -f "$OUTPUT_ZIP"

# 3. Tạo file ZIP sạch sẽ
echo "📦 [2/3] Đang nén file sạch sẽ (loại trừ node_modules, profiles, cache)..."
zip -r "$OUTPUT_ZIP" . \
    -x "*.git*" \
    -x "*node_modules*" \
    -x "*profiles/*" \
    -x "*trash/*" \
    -x "*uploads/*" \
    -x "*data/tiktok.db*" \
    -x "*.DS_Store*" \
    -x "*backend/*.log*" \
    -x "*backend/*.png*"

echo ""
echo "======================================================="
SIZE=$(ls -lh "$OUTPUT_ZIP" | awk '{print $5}')
echo "✅ [3/3] HOÀN TẤT! File zip đã được tạo trên Desktop:"
echo "   📁 Đường dẫn: $OUTPUT_ZIP"
echo "   📊 Dung lượng: $SIZE"
echo "======================================================="
echo "Bạn chỉ việc gửi file TikTok-Automation.zip này cho người khác!"
echo ""

open -R "$OUTPUT_ZIP"
