# TikTok Multi-Profile Automation System 🎬🚀

> **Hệ thống Quản trị & Tự động hoá Kênh TikTok Đa Tài Khoản Đẳng Cấp Sản Phẩm (Production-Ready)**  
> Tối ưu hóa cho quy trình xây dựng mạng lưới kênh TikTok tự động, quản lý hàng loạt tài khoản biệt lập, tự động chèn nhạc thịnh hành, lên lịch phát hành thông minh và chạy đa luồng ổn định.

---

## 🌟 Tổng Quan Dự Án

**TikTok Multi-Profile Automation System** là giải pháp phần mềm hoàn chỉnh (Full-stack) được thiết kế cho các nhà sáng tạo nội dung, agency, affiliate marketer và MCN:
- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI, Lucide Icons, Sonner (Floating toast notification chống giật layout).
- **Backend**: Express.js 5, SQLite (`better-sqlite3` tối ưu WAL mode & indexing), Playwright Automation Engine.
- **Khả năng tương thích**: macOS (Apple Silicon & Intel), Windows, Linux.

---

## ⚡ Các Tính Năng Cốt Lõi

### 1. Quản Trị Đa Hồ Sơ (Multi-Profile Isolation)
- Mỗi profile sở hữu một môi trường trình duyệt Chrome biệt lập: User Data Dir, cache, proxy và phiên đăng nhập hoàn toàn riêng biệt.
- Tự động bắt và đồng bộ Cookie vào cơ sở dữ liệu sau mỗi phiên đăng nhập, loại bỏ tình trạng phải login lại nhiều lần.
- Phân nhóm tài khoản (Groups) để quản lý chiến dịch dễ dàng.

### 2. Tự Động Đăng Video & Lên Lịch Thông Minh (Auto Schedule & Post)
- **Hỗ trợ giao diện mới nhất của TikTok Studio (2025/2026)**.
- **Auto-Increment Schedule**:
  - Tự động nhận diện danh sách video đã lên lịch sẵn trên TikTok Studio.
  - Tự động tính toán mốc thời gian tiếp theo nối tiếp lịch cũ (bước nhảy 5 phút hoặc 10 phút tuỳ chọn), không trùng lặp thời gian phát sóng.
- Hỗ trợ xóa caption/tiêu đề mặc định (lấy từ tên file) để kênh có giao diện chuyên nghiệp.

### 3. Tự Động Chèn Nhạc & Kiểm Soát Âm Lượng (Smart Music Insertion) 🎵
- **Tự động mở trình biên tập TikTok Studio (Web Video Editor)**.
- **2 chế độ chọn nhạc linh hoạt**:
  1. **Keyword Search Rotation**: Tìm kiếm theo danh sách từ khóa do người dùng định nghĩa (ví dụ: `chill, lofi, viral beat, trending`), tự động luân phiên đổi từ khóa cho từng video.
  2. **Favorites Sound Rotation**: Tự động lấy danh sách nhạc Yêu Thích (Favorites) của kênh, tự động đổi bài sau mỗi 10 video để phân bổ lượt dùng nhạc.
- **Tự động giảm âm lượng nhạc nền xuống -50 dB**: Giữ trọn âm thanh gốc (giọng nói, âm thanh video) nhưng vẫn hưởng đầy đủ quyền lợi đề xuất từ bài nhạc thịnh hành của TikTok.
- Tự động lưu bản dựng (Save) và quay lại màn hình xuất bản mượt mà.

### 4. Kiểm Duyệt Bản Quyền Nội Dung (Content Check Lite)
- Tự động kích hoạt tính năng kiểm tra bản quyền âm thanh & video trước khi đăng.
- Cơ chế tự retry khi TikTok bị kẹt ở trạng thái "Checking".

### 5. Nuôi Tài Khoản Tự Động (Auto Engage / Warm-up)
- Giả lập hành vi người dùng thật: lướt For You feed, xem video với thời lượng ngẫu nhiên, tự động like xác suất ngẫu nhiên.
- Giúp tăng điểm tin cậy (Trust score) cho các kênh mới.

### 6. Dọn Dẹp Cache & Tối Ưu Hệ Thống
- Nút bấm 1-click giải phóng hàng GB dung lượng cache duyệt web của các profile.

### 7. Bộ Công Cụ Tạo Video Mẫu (Dummy Video Generator)
- Tích hợp sẵn công cụ tạo video chuẩn dọc 9:16 (720x1280 H.264+AAC) bằng FFmpeg phục vụ thử nghiệm tính năng mà không cần chuẩn bị video thủ công.

---

## 🛠 Yêu Cầu Hệ Thống

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
| :--- | :--- | :--- |
| **Hệ điều hành** | macOS 12+, Windows 10/11, Ubuntu 20.04+ | macOS / Linux |
| **Node.js** | `>= 18.0.0` | `20.x` hoặc `22.x LTS` |
| **NPM** | `>= 8.0.0` | Phiên bản đi kèm Node |
| **Trình duyệt** | Google Chrome hoặc Chromium (Playwright) | Google Chrome mới nhất |
| **FFmpeg** | Tùy chọn (cho dummy video generator) | `brew install ffmpeg` |

---

## 🚀 Cài Đặt Nhanh

### Bước 1: Clone Repository
```bash
git clone https://github.com/phamxuanhuy3005dev/tiktok-at.git
cd tiktok-at
```

### Bước 2: Cài Đặt Dependencies & Trình Duyệt

```bash
# 1. Cài đặt Backend
cd backend
npm install
npx playwright install chromium

# 2. Cài đặt Frontend
cd ../frontend
npm install
```

### Bước 3: Tạo Video Mẫu Kiểm Thử (Tùy chọn)
Nếu bạn chưa có video để test, hãy chạy script tạo video mẫu dọc:
```bash
cd ../backend
npm run generate-dummy
```
Script sẽ tự động tạo các video chuẩn 9:16 trong thư mục `dummy_videos/`.

---

## 🏃‍♂️ Khởi Chạy Ứng Dụng (1-Click Cho Windows & macOS)

Hệ thống được thiết kế để **tự động hoàn toàn**: khi bạn hoặc người khác clone dự án về, chỉ cần nhấp đúp file chạy tương ứng với hệ điều hành:

- **Trên Windows**: Nhấp đúp chuột vào file **`Chay-Tren-Windows.bat`**.
- **Trên macOS**: Nhấp đúp chuột vào file **`Chay-Tren-Mac.command`** trong Finder.
- **Hoặc dùng Terminal (Mọi OS)**: Chạy lệnh `npm start`.

### ⚡ Hệ thống sẽ tự động thực hiện:
1. **Kiểm tra Node.js**: Hướng dẫn cài đặt nếu máy tính chưa có.
2. **Cài đặt thư viện**: Tự động cài dependencies cho cả `backend` và `frontend`, đồng thời chuẩn bị trình duyệt Playwright Chromium.
3. **Tự động Build**: Tự động nhận diện nếu chưa có bản build giao diện (khi mới clone) hoặc khi bạn vừa kéo code mới về (`git pull`) để biên dịch lại ngay lập tức.
4. **Khởi chạy ứng dụng**: Bật server và tự động mở trình duyệt web đến địa chỉ: `http://localhost:3001`.

---

### 🛠 Dành Cho Lập Trình Viên (Chạy Thủ Công)

**Terminal 1 (Backend Server):**
```bash
cd backend
npm start
# Hoặc chế độ dev auto-reload:
npm run dev
```

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm run dev
```

Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết

### 1. Tạo & Đăng Nhập Profile
1. Vào tab **Dashboard** hoặc **Quản lý Profile**.
2. Nhấn nút **Thêm Profile**:
   - Nhập tên Profile (ví dụ: `kenh_review_01`).
   - Chọn Thư mục video (để trống nếu dùng thư mục mặc định `uploads` hoặc `dummy_videos`).
   - Nhập Proxy (nếu có: `http://user:pass@ip:port`).
3. Nhấn **Mở Profile**: Trình duyệt Chrome độc lập sẽ mở ra. Bạn thực hiện đăng nhập vào TikTok trên cửa sổ này. Sau khi login thành công, hệ thống tự động lưu session cookies.

### 2. Thiết Lập Tự Động Đăng & Chèn Nhạc
Tại bảng danh sách Profile, bấm nút **Sửa** (icon bút chì):
- **Xoá tiêu đề mặc định**: Bật (1) nếu muốn xoá tên file video khỏi caption.
- **Chèn nhạc tự động**: Bật (1).
- **Từ khoá tìm nhạc**: Nhập danh sách từ khóa cách nhau bởi dấu phẩy (ví dụ: `chill, lofi, trending`). Nếu để trống, hệ thống sẽ tự động chọn từ tab **Yêu thích (Favorites)** của kênh.
- **Tự động lên lịch nối tiếp**: Bật (1).
- **Khoảng cách lên lịch**: Chọn `5 phút` hoặc `10 phút`.
- **Content Check Lite**: Bật (1) nếu muốn kiểm duyệt vi phạm bản quyền trước khi xuất bản.

### 3. Thực Hiện Đăng Video
- **Đăng 1 profile**: Bấm nút **Chạy** (icon Play) tại dòng profile tương ứng.
- **Đăng hàng loạt**:
  - Tích chọn các profile cần chạy.
  - Chọn chế độ: **Tuần tự (Sequential)** (an toàn, tiết kiệm RAM) hoặc **Cùng lúc (Parallel)** (nhanh chóng).
  - Nhấn **Bắt đầu chạy hàng loạt**.

---

## 🗂 Cấu Trúc Dự Án

```
tiktok-at/
├── backend/                    # Máy chủ Node.js & Tự động hoá
│   ├── routes/                 # Express API endpoints (profiles, automation, system, config)
│   ├── services/               # Nghiệp vụ:
│   │   ├── tiktok-automation.js# Script Playwright tương tác TikTok Studio
│   │   ├── batch-runner.js     # Trình điều phối chạy hàng loạt & retry
│   │   ├── cookie-service.js   # Quản lý & inject cookie phiên
│   │   ├── system-service.js   # Dọn cache, RAM, chọn thư mục native
│   │   └── tracker.js          # Theo dõi trạng thái realtime của profiles
│   ├── scripts/                # Utility scripts (generate-dummy-videos, e2e tests)
│   ├── tests/                  # Unit tests (Node.js test runner tích hợp)
│   ├── db.js                   # Kết nối SQLite & Schema migrations
│   └── package.json
├── frontend/                   # Ứng dụng giao diện người dùng
│   ├── src/
│   │   ├── components/         # ProfileTable, SettingsView, BatchControlModal, ...
│   │   ├── App.jsx             # Main application & routing
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── dummy_videos/               # Thư mục chứa video mẫu phục vụ thử nghiệm
├── data/                       # Cơ sở dữ liệu SQLite (tiktok.db)
├── profiles/                   # Dữ liệu cache & browser profile của từng kênh
├── scripts/                    # Scripts điều phối & kiểm thử
│   └── runner.js               # Bộ khởi chạy thông minh đa nền tảng
├── Chay-Tren-Windows.bat       # Phím tắt khởi chạy 1-click cho Windows
├── Chay-Tren-Mac.command       # Phím tắt khởi chạy 1-click cho macOS
└── README.md                   # Tài liệu hướng dẫn sử dụng
```

---

## 🧪 Kiểm Thử Tự Động (Automated Testing)

Toàn bộ logic cốt lõi (xử lý lịch đăng, validation profile, browser options, group management) đều được bao phủ bởi Unit Tests:

```bash
cd backend
npm test
```
*Kết quả kiểm thử: 32/32 tests passing (100% pass, 0 failures).*

---

## 🛡 Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. TikTok bắt giải Captcha / Xác minh 2 bước (OTP)
- **Hiện tượng**: Màn hình dừng hoặc báo lỗi timeout khi login.
- **Cách xử lý**: Nhấn nút **"Mở Profile"** trên giao diện dashboard. Trình duyệt xuất hiện, bạn giải captcha hoặc nhập mã OTP trực tiếp bằng tay. Phiên đăng nhập sẽ tự động được lưu lại cho các lần chạy tiếp theo.

### 2. Video không nhận diện được nút chèn nhạc
- **Nguyên nhân**: TikTok cập nhật giao diện Studio sang layout mới.
- **Giải pháp**: Bản cập nhật hiện tại đã hỗ trợ selector chuẩn `.editor-entrance[data-button-name="sounds"]`, tự động scroll vào vùng nhìn và tự động dismiss hộp thoại hướng dẫn "Phone mode".

### 3. Port 3001 đã bị chiếm dụng
- Khi khởi động qua `Chay-Tren-Windows.bat` hoặc `Chay-Tren-Mac.command`, hệ thống sẽ tự động phát hiện và giải phóng tiến trình cũ bị treo trên port 3001 để khởi chạy an toàn.

---

## 📄 Bản Quyền & Giấy Phép

Dự án phát triển phục vụ mục đích tự động hóa quản lý nội dung chính đáng. Người dùng chịu trách nhiệm tuân thủ Điều khoản dịch vụ và Nguyên tắc cộng đồng của TikTok.
