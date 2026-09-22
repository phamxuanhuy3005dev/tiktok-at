# Kiến Trúc Hệ Thống (System Architecture) 🏗️

Tài liệu này mô tả chi tiết kiến trúc kĩ thuật, cơ chế lưu trữ dữ liệu, mô hình tự động hóa và quy trình tương tác của hệ thống **TikTok Multi-Profile Automation**.

---

## 1. Sơ Đồ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND UI                           │
│     React 18 + Vite + Tailwind CSS + Radix UI + Sonner      │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST Requests            │ Server-Sent /
               │ (Axios API Client)            │ Polling State
┌──────────────▼───────────────────────────────┴──────────────┐
│                    BACKEND SERVER (Express 5)               │
│  ├── Routes: /api/profiles, /api/automation, /api/system... │
│  ├── Tracker Service: Quản lý trạng thái realtime           │
│  ├── Batch Runner: Điều phối chạy đơn lẻ / hàng loạt        │
│  └── System Service: Dọn cache, RAM, chọn thư mục native     │
└──────────────┬───────────────────────────────┬──────────────┘
               │ SQLite Reads/Writes           │ Playwright Automation
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│       DATABASE LAYER        │ │      PLAYWRIGHT ENGINE      │
│  SQLite (better-sqlite3)    │ │  Persistent Chromium Context│
│  - profiles (indexed)       │ │  - Cookie Injector          │
│  - groups, app_config       │ │  - Clean Native Chrome Mode │
│  - WAL journal mode         │ │  - DOM Event Interceptor    │
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │
                                ┌──────────────▼──────────────┐
                                │     TIKTOK STUDIO CLOUD     │
                                │  https://tiktok.com/        │
                                │  tiktokstudio/upload        │
                                └─────────────────────────────┘
```

---

## 2. Cơ Sở Dữ Liệu (Database Schema)

Hệ thống sử dụng SQLite thông qua driver hiệu năng cao `better-sqlite3`, kích hoạt chế độ **WAL (Write-Ahead Logging)** để đảm bảo đọc ghi đồng thời không bị lock database.

### 2.1 Bảng `profiles`
Lưu trữ thông tin cấu hình của từng kênh TikTok:
| Cột | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` | TEXT PRIMARY KEY | ID định danh duy nhất (ví dụ: `1789996681591_xasu52`) |
| `name` | TEXT UNIQUE NOT NULL | Tên profile / handle kênh (ví dụ: `devyfunkk`) |
| `status` | TEXT DEFAULT 'idle' | Trạng thái: `idle`, `uploading`, `success`, `error`... |
| `video_folder`| TEXT | Đường dẫn thư mục video riêng (NULL nếu dùng mặc định) |
| `group_id` | TEXT | Khóa ngoại liên kết bảng `groups` |
| `cookies` | TEXT (JSON) | Chuỗi JSON chứa mảng cookies phiên đăng nhập |
| `auto_increment_schedule` | INTEGER | `1` để bật tự động cộng dồn thời gian đăng, `0` để tắt |
| `schedule_interval` | INTEGER | Khoảng cách giữa các bài đăng (phút, mặc định `10`) |
| `set_music` | INTEGER | `1` để bật tự động chèn nhạc, `0` để bỏ qua |
| `music_search`| TEXT | Chuỗi từ khóa tìm nhạc, phân tách bởi dấu phẩy |
| `remove_title`| INTEGER | `1` để tự động xóa caption/tiêu đề từ tên file |
| `need_content_check` | INTEGER | `1` để chạy Content Check Lite trước khi đăng |
| `created_at` | DATETIME | Thời gian khởi tạo profile |

### 2.2 Bảng `groups`
Phân nhóm kênh theo chủ đề hoặc chiến dịch:
- `id`: TEXT PRIMARY KEY
- `name`: TEXT UNIQUE
- `created_at`: DATETIME

### 2.3 Bảng `app_config`
Lưu trữ cấu hình toàn cục:
- `key`: TEXT PRIMARY KEY (e.g. `videoFolder`)
- `value`: TEXT

---

## 3. Quy Trình Tự Động Hoá Đăng Video (Upload Automation Pipeline)

Mỗi lần `uploadVideo` được kích hoạt, hệ sinh thái tự động hoá thực hiện theo chu trình tuần tự nghiêm ngặt sau:

```
[1. Khởi động Context] ──► Mở Chromium với Persistent User Data Dir & nạp Cookies
         │
[2. Quét Lịch Cũ]     ──► Truy cập Content Studio, quét xem có video nào đã lên lịch
         │
[3. Điều hướng Upload] ──► Mở https://www.tiktok.com/tiktokstudio/upload
         │
[4. Chọn File Video]  ──► Bắt sự kiện filechooser qua button.upload-stage-btn
         │
[5. Xử lý Popup]      ──► dismissPopups() dọn sạch thông báo, tuyệt đối KHÔNG bấm Discard
         │
[6. Dọn Dẹp Tiêu Đề]  ──► Nếu remove_title = 1, focus caption và xóa sạch nội dung
         │
[7. Chèn Nhạc Studio] ──► Nếu set_music = 1:
         │                  ├─ Scroll tới .editor-entrance[data-button-name="sounds"]
         │                  ├─ Dismiss "Phone mode" tutorial
         │                  ├─ Tìm từ khóa (music_search) HOẶC chọn tab Favorites
         │                  ├─ Bấm nút đỏ thêm nhạc vào timeline
         │                  ├─ Giảm âm lượng nhạc nền xuống -50 dB
         │                  └─ Bấm Save ở góc trên phải để render & quay về form
         │
[8. Content Check]    ──► Kiểm tra bản quyền âm thanh và video (nếu bật)
         │
[9. Lên Lịch / Đăng]  ──► Chọn Schedule + điền Date/Time HOẶC bấm Post trực tiếp
         │
[10. Xác Nhận & Kết Thúc]─ Bắt publish_id từ API response, xóa video nguồn, cập nhật DB
```

---

## 4. Cơ Chế Chống Phát Hiện & Bảo Vệ Tài Khoản

1. **Persistent Contexts**: Lưu trữ trọn vẹn cache, IndexedDB, Service Workers như người dùng Chrome thực thụ.
2. **Loại bỏ cờ Automation**: Ẩn `navigator.webdriver`, override các thuộc tính Chromium bị lộ.
3. **Randomized Human Delays**: Sử dụng khoảng nghỉ ngẫu nhiên mô phỏng tốc độ gõ phím và di chuột của người thật.
4. **Resilient Popup Handling**: Nhận diện thông minh các modal "Turn on content checks", "Discard post", "Phone mode" để đóng an toàn mà không làm hủy tiến trình tải lên.

---

## 5. Cơ Chế Khởi Chạy Đa Nền Tảng (Unified Cross-Platform Runner)

Để tối ưu trải nghiệm cho người dùng cuối (không cần biết lập trình) và hỗ trợ đồng bộ hoàn hảo giữa **Windows** và **macOS**, hệ thống sử dụng kiến trúc khởi chạy tập trung:

```
[Chay-Tren-Windows.bat]   \
                            ──► [scripts/runner.js] ──► [backend/server.js]
[Chay-Tren-Mac.command]   /          │                        │
                                     ├── Auto-check & Install ├── Phục vụ API (/api/*)
                                     │   (Backend + Frontend) └── Phục vụ Frontend (/dist/*)
                                     ├── Auto-build Frontend      tại http://localhost:3001
                                     │   (Hash-based detection)
                                     └── Auto-free port 3001
```

### Nguyên lý hoạt động:
1. **Lớp vỏ kích hoạt (OS-level Launchers)**:
   - `Chay-Tren-Windows.bat`: Được viết chuẩn hóa cú pháp DOS/CMD, tự động dò tìm `node.exe` trên hệ thống và chuyển giao cho `runner.js`.
   - `Chay-Tren-Mac.command`: Script bash có quyền thực thi `chmod +x`, kiểm tra Node.js và chuyển giao cho `runner.js`.
2. **Lớp điều phối trung tâm (`scripts/runner.js`)**:
   - **Tự động cài đặt**: So sánh checksum `package.json` của Backend và Frontend; nếu thiếu `node_modules` hoặc file cấu hình thay đổi thì tự chạy `npm install` và tải Playwright Chromium.
   - **Tự động biên dịch thông minh (Smart Build)**: Tính toán hàm băm SHA-256 trên toàn bộ cây thư mục mã nguồn `frontend/src/**` và file cấu hình. Nếu phát hiện code mới (sau khi người dùng kéo code về qua `git pull`) hoặc chưa có thư mục `dist/` (khi mới clone), hệ thống sẽ tự động build lại giao diện trước khi bật server.
   - **Quản lý cổng mạng**: Tự động giải phóng cổng 3001 nếu phát hiện tiến trình cũ bị treo từ các phiên làm việc trước.
3. **Phục vụ giao diện tích hợp (Single Port Serving)**:
   - Backend Express lắng nghe trên cổng 3001, vừa phục vụ các REST API endpoint vừa phân phối các static assets từ `frontend/dist`. Người dùng chỉ cần mở 1 địa chỉ duy nhất `http://localhost:3001`.
