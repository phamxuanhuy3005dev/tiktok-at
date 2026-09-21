# Tài Liệu API (RESTful API Specification) 📡

Hệ thống Backend cung cấp bộ REST API chuẩn mực trên cổng mặc định `3001` (`http://localhost:3001/api`).

---

## 1. Profiles API (`/api/profiles`)

### `GET /api/profiles`
Lấy danh sách tất cả các profile hiện có trong hệ thống.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "1789996681591_xasu52",
      "name": "devyfunkk",
      "status": "idle",
      "video_folder": null,
      "is_scheduled": 0,
      "auto_increment_schedule": 1,
      "schedule_interval": 10,
      "upload_count": 1,
      "remove_title": 1,
      "set_music": 1,
      "music_search": "chill, lofi",
      "need_content_check": 0,
      "created_at": "2026-09-21 13:18:01"
    }
  ]
  ```

### `POST /api/profiles`
Tạo mới một profile.
- **Request Body**:
  ```json
  {
    "name": "kenh_tiktok_moi",
    "video_folder": "/Users/user/Videos/TikTok",
    "group_id": "group_123",
    "remove_title": 1,
    "set_music": 1,
    "music_search": "trending, viral",
    "auto_increment_schedule": 1,
    "schedule_interval": 10
  }
  ```
- **Response `201 Created`**: Trả về object profile vừa tạo.

### `PUT /api/profiles/:id`
Cập nhật cấu hình profile.
- **Request Body**: Chứa các trường cần cập nhật (ví dụ: `video_folder`, `set_music`, `music_search`, `schedule_interval`...).
- **Response `200 OK`**: Trả về object profile sau cập nhật.

### `DELETE /api/profiles/:id`
Xóa profile khỏi hệ thống và dọn dẹp thư mục dữ liệu trình duyệt tương ứng.
- **Response `200 OK`**: `{ "success": true }`

---

## 2. Automation API (`/api`)

### `POST /api/start`
Khởi động quy trình đăng video tự động cho một hoặc nhiều profile.
- **Request Body**:
  ```json
  {
    "profileId": "1789996681591_xasu52",
    "runMode": "sequential",
    "limitUploads": false,
    "uploadLimitCount": 0
  }
  ```
- Hoặc chạy hàng loạt:
  ```json
  {
    "profileIds": ["id1", "id2", "id3"],
    "runMode": "parallel",
    "limitUploads": true,
    "uploadLimitCount": 3
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "started",
    "count": 1,
    "runMode": "sequential"
  }
  ```

### `GET /api/batch-status`
Lấy tiến trình hiện tại của phiên chạy hàng loạt (Round 1, Retry, Completed, Failed).

### `POST /api/open-profile`
Mở trình duyệt Google Chrome với profile biệt lập để người dùng thao tác thủ công (login, giải captcha, chỉnh sửa tài khoản).
- **Request Body**: `{ "profileId": "1789996681591_xasu52" }`
- **Response `200 OK`**: `{ "status": "opened" }`

### `POST /api/close-profile`
Đóng cửa sổ trình duyệt thủ công đang mở của profile.
- **Request Body**: `{ "profileId": "1789996681591_xasu52" }`

### `POST /api/warmup-profile`
Kích hoạt chu trình tương tác tự động (xem video, lướt feed ngẫu nhiên).
- **Request Body**: `{ "profileId": "...", "durationMinutes": 10 }`

---

## 3. System & Config API (`/api/system` & `/api/config`)

### `GET /api/system/stats`
Lấy thông tin tài nguyên hệ thống (RAM sử dụng, dung lượng cache).

### `POST /api/system/clean-cache`
Dọn dẹp toàn bộ dữ liệu tạm và bộ nhớ đệm của các profile để giải phóng ổ cứng.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "freedMb": 450.2
  }
  ```

### `POST /api/system/test-telegram`
Kiểm tra cấu hình Bot Telegram.
- **Request Body**:
  ```json
  {
    "token": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
  ```
- **Response `200 OK`**: `{ "success": true, "message": "Test notification sent successfully" }`

### `GET /api/config`
Lấy toàn bộ cấu hình hệ thống (Telegram, đường dẫn video mặc định, v.v.).

### `POST /api/config`
Lưu cấu hình hệ thống.
- **Request Body**: `{ "key": "value" }`
