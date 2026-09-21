# TikTok Multi-Profile Automation System

Hệ thống quản lý nhiều profile TikTok và tự động hóa quá trình đăng video với giao diện hiện đại (Glassmorphism), thông báo Sonner dạng nổi (không giật layout), hỗ trợ đa nền tảng (macOS, Windows, Linux).

## 🚀 Tính năng chính

- Quản lý đa hồ sơ (Multi-profile) với SQLite (đã được đánh chỉ mục tối ưu).
- Tự động hóa đăng video, lên lịch nối tiếp bằng Playwright.
- Tương tác tự động (Auto Engage) xem video, lướt feed ngẫu nhiên.
- Hỗ trợ Proxy, Fingerprint Generator/Injector độc lập cho từng profile.
- Hệ thống thông báo floating toast (Sonner) mượt mà, không giật layout.
- Giao diện Dashboard cao cấp, phản hồi nhanh, tối ưu render bảng dữ liệu với React.memo.
- Quản lý Cookie & phiên đăng nhập TikTok (không cần đăng nhập lại nhiều lần).
- Hỗ trợ xuất / nhập file và thư mục kèm file nén ZIP trên mọi hệ điều hành.

## 🛠 Yêu cầu hệ thống

- **Node.js**: Phiên bản 18 trở lên.
- **npm** hoặc **yarn**.
- **Trình duyệt Google Chrome** hoặc Chromium thông qua Playwright.

## 📦 Cài đặt dự án

### 1. Cài đặt Backend

```bash
cd backend
npm install
npx playwright install chromium
```

### 2. Cài đặt Frontend

```bash
cd ../frontend
npm install
```

## 🏃‍♂️ Cách chạy ứng dụng

### Cách 1: Chạy nhanh bằng script đồng thời

Tại thư mục gốc của dự án:

```bash
chmod +x start.sh
./start.sh
```

### Cách 2: Chạy riêng từng service

**Bước 1: Chạy Backend**

```bash
cd backend
npm start
# hoặc npm run dev nếu muốn auto-reload
```

_Backend chạy tại: `http://localhost:3001`_

**Bước 2: Chạy Frontend**

```bash
cd frontend
npm run dev
```

_Frontend chạy tại: `http://localhost:3000`_

## 📂 Cấu trúc thư mục

- `/backend`: Mã nguồn server Express.js, SQLite database và Playwright automation.
- `/frontend`: Mã nguồn giao diện React (Vite, Sonner, Lucide-React).
- `/data`: Chứa cơ sở dữ liệu SQLite (`tiktok.db`).
- `/profiles`: Chứa dữ liệu trình duyệt Chrome của từng profile TikTok.
- `/uploads`: Thư mục chứa video để tải lên.
- `/extensions`: Chứa các extension trình duyệt hỗ trợ.

## 📝 Lưu ý

- Đảm bảo video được đặt đúng định dạng `.mp4` hoặc `.mov` trong thư mục profile tương ứng.
- Cấu hình Proxy nếu cần thiết trong phần Sửa Profile hoặc Cập nhật hàng loạt.
