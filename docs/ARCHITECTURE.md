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
