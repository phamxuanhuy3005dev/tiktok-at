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
- **Response `200 OK`**: `{ "status": "closed", "profile": "devyfunkk" }`

---

## 3. Cookie Management API (`/api/profiles`)

### `POST /api/profiles/import-cookies-json`
Nhập mảng cookie JSON để cập nhật hàng loạt hoặc tự động tạo profile mới (mặc định bật Lên lịch nối tiếp 10 phút).
- **Request Body**:
  ```json
  [
    {
      "name": "channel_01",
      "cookies": [...]
    }
  ]
  ```
- **Response `200 OK`**: `{ "success": true, "updated": 1, "created": 1 }`

### `POST /api/profiles/export-cookies-json`
Xuất toàn bộ cookie của các profile đã chọn ra file JSON để sao lưu hoặc chuyển đổi thiết bị.
- **Request Body**: `{ "profileIds": ["id1", "id2"] }` (hoặc rỗng để xuất tất cả)
- **Response `200 OK`**: Mảng JSON chứa thông tin và cookies của các profile.

### `POST /api/profiles/:id/cookies`
Lưu dữ liệu cookie trực tiếp (định dạng chuỗi hoặc mảng JSON) cho profile.
- **Request Body**: `{ "cookies": "[{\"name\":\"sessionid\",...}]" }`

### `POST /api/profiles/:id/capture-cookies`
Đồng bộ nhanh cookie hiện tại từ phiên trình duyệt đang mở hoặc file lưu trữ của Chrome trên đĩa.

### `POST /api/profiles/:id/logout`
Đăng xuất tài khoản, đóng trình duyệt và xóa sạch cookies của profile.

---

## 4. System & Config API (`/api/system` & `/api/config`)

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

### `GET /api/config`
Lấy toàn bộ cấu hình hệ thống (đường dẫn video mặc định, v.v.).

### `POST /api/config`
Lưu cấu hình hệ thống (thư mục video mặc định, số luồng song song).
- **Request Body**: `{ "videoFolder": "/path/to/videos", "maxConcurrency": 4 }`
- **Response `200 OK`**: `{ "success": true }`

---

## 5. Groups API (`/api/groups`)

### `GET /api/groups`
Lấy danh sách tất cả các nhóm kèm số lượng profile được gán vào mỗi nhóm.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "grp_1789996681_ab12c",
      "name": "Kênh Giải Trí",
      "created_at": "2026-09-21 22:30:00",
      "profile_count": 3
    }
  ]
  ```

### `POST /api/groups`
Tạo nhóm mới. Nếu không truyền `id`, backend tự động sinh ID duy nhất chuẩn `grp_${timestamp}_${hash}`.
- **Request Body**: `{ "name": "Kênh Thương Mại Điện Tử" }`
- **Response `201 Created`**: Trả về object nhóm vừa được tạo.

### `PATCH /api/groups/:id`
Đổi tên nhóm.
- **Request Body**: `{ "name": "Tên nhóm mới" }`
- **Response `200 OK`**: Trả về object nhóm đã cập nhật.

### `DELETE /api/groups/:id`
Xóa nhóm khỏi hệ thống. Thao tác này sẽ bị chặn an toàn và trả về `400 Bad Request` nếu nhóm vẫn còn ít nhất 1 profile được gán.
- **Response `200 OK`**: `{ "success": true }`

