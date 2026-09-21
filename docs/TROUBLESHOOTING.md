# Cẩm Nang Xử Lý Sự Cố (Troubleshooting & FAQs) 🛠️

Tài liệu tổng hợp các tình huống thường gặp khi vận hành hệ thống **TikTok Multi-Profile Automation** và giải pháp xử lý triệt để.

---

## 1. Vấn Đề Về Đăng Nhập & Phiên Cookie

### ❓ Triệu chứng: Profile báo lỗi "Chưa đăng nhập" hoặc "Cookie hết hạn"
- **Nguyên nhân**: TikTok có thể thu hồi session sau một khoảng thời gian không hoạt động hoặc khi phát hiện địa chỉ IP thay đổi đột ngột.
- **Cách xử lý**:
  1. Trên Dashboard, bấm nút **"Mở Profile"** tương ứng với kênh đó.
  2. Một cửa sổ Google Chrome sẽ mở ra với đúng môi trường của profile.
  3. Bạn đăng nhập vào tài khoản trên cửa sổ này (qua Email, Số điện thoại hoặc QR code).
  4. Sau khi avatar của bạn xuất hiện trên thanh điều hướng TikTok, hệ thống sẽ tự động đồng bộ cookie mới vào cơ sở dữ liệu SQLite.
  5. Đóng cửa sổ Chrome và bấm **"Chạy"** để tiếp tục tự động hoá.

### ❓ Triệu chứng: Xuất hiện Captcha xoay hình hoặc ghép hình
- **Nguyên nhân**: Cơ chế bảo vệ chống bot của TikTok khi đăng nhập hoặc thực hiện hành động liên tục.
- **Cách xử lý**: Dùng chức năng **"Mở Profile"** để tự tay giải captcha 1 lần. Playwright lưu cookie và cache trên disk, các lần chạy ngầm sau sẽ không bị hỏi lại.

---

## 2. Vấn Đề Về Đăng Video & Chèn Nhạc

### ❓ Triệu chứng: Video bị hủy tải lên ngay sau khi chọn file
- **Nguyên nhân trước đây**: Hàm đóng popup (`dismissPopups`) cũ tìm nút có chữ "Discard" và bấm nhầm vào nút hủy của form TikTok Studio.
- **Đã khắc phục**: Hệ thống đã lọc hoàn toàn từ khóa "Discard" khỏi các selector đóng modal thông thường. Nếu TikTok hỏi "Discard this post?", hệ thống luôn chọn "Not now" hoặc "Cancel".

### ❓ Triệu chứng: Không mở được giao diện chọn nhạc (Sounds Editor)
- **Nguyên nhân**: Giao diện TikTok Studio 2025/2026 đặt nút Sounds nằm bên dưới khung xem trước điện thoại di động, đòi hỏi phải cuộn trang (`scrollIntoView`).
- **Đã khắc phục**: Hệ thống tự động cuộn xuống `.editor-entrance[data-button-name="sounds"]`, đồng thời tự động đóng cửa sổ hướng dẫn "Phone mode" của TikTok trước khi chọn nhạc.

### ❓ Triệu chứng: Không tìm thấy bài hát yêu thích
- **Nguyên nhân**: Kênh chưa từng bấm "Lưu vào mục yêu thích" cho bất kỳ bài nhạc nào trên TikTok.
- **Cách xử lý**:
  - Cách 1: Sử dụng tính năng **Từ khoá tìm nhạc** (Keyword search rotation) trong cài đặt Profile (ví dụ: nhập `chill, lofi, trending`), hệ thống sẽ tự gõ từ khoá vào ô tìm kiếm của TikTok Studio và chọn bài hát đầu tiên.
  - Cách 2: Vào ứng dụng TikTok hoặc trình duyệt, lưu 2-3 bài hát hot vào mục Yêu thích (Favorites) của kênh.

---

## 3. Vấn Đề Về Lên Lịch (Auto-Increment Schedule)

### ❓ Triệu chứng: Video bị đăng ngay lập tức thay vì lên lịch
- **Nguyên nhân**: Theo thuật toán của hệ thống:
  - Nếu kênh **chưa có** bất kỳ video nào đang chờ lên lịch trên TikTok Studio: Video đầu tiên sẽ được đăng ngay lập tức (Public Now), các video tiếp theo sẽ tự động được lên lịch nối tiếp theo bước nhảy (`5 phút` hoặc `10 phút`).
  - Nếu kênh **đã có sẵn** video trong tab "Scheduled": Toàn bộ video tải lên đều sẽ được lên lịch tiếp theo sau mốc thời gian của video cuối cùng trong hàng đợi.

---

## 4. Vấn Đề Kết Nối & Môi Trường Máy Tính

### ❓ Triệu chứng: Báo lỗi `Cannot find module 'better-sqlite3'` hoặc `playwright`
- **Nguyên nhân**: Chưa cài đặt dependencies trong thư mục `backend`.
- **Cách xử lý**:
  ```bash
  cd backend
  npm install
  npx playwright install chromium
  ```

### ❓ Triệu chứng: Thông báo Telegram không gửi về
- **Kiểm tra**:
  1. Bot Token và Chat ID đã chính xác chưa.
  2. Bạn đã nhấn `/start` trên bot của mình chưa (nếu chưa nhắn cho bot, bot sẽ không có quyền gửi tin nhắn đến Chat ID của bạn).
  3. Dùng nút **"Kiểm tra Telegram"** trong mục Cài đặt (Settings) trên giao diện để kiểm tra trực tiếp.
