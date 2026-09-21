import { toast } from 'sonner';

/**
 * Common translations for error and status messages across the system.
 * Translates server responses, Playwright errors, SQLite constraints, and network errors into clear Vietnamese.
 */
const ERROR_TRANSLATIONS = [
  { match: /Cannot delete group: it still has profiles assigned/i, text: 'Không thể xóa nhóm: vẫn còn profile trong nhóm này' },
  { match: /Group id is required/i, text: 'Thiếu mã định danh nhóm' },
  { match: /Group name is required/i, text: 'Vui lòng nhập tên nhóm' },
  { match: /Group name already exists/i, text: 'Tên nhóm này đã tồn tại' },
  { match: /Group does not exist/i, text: 'Nhóm không tồn tại' },
  { match: /Group not found/i, text: 'Không tìm thấy nhóm' },
  { match: /Profile not found/i, text: 'Không tìm thấy profile' },
  { match: /Profile name is required/i, text: 'Vui lòng nhập tên profile' },
  { match: /Profile name already exists/i, text: 'Tên profile này đã tồn tại' },
  { match: /Profile ID already exists/i, text: 'Mã profile đã tồn tại' },
  { match: /Profile ID is required/i, text: 'Thiếu mã định danh profile' },
  { match: /profileId is required/i, text: 'Thiếu mã định danh profile' },
  { match: /profileIds array is required/i, text: 'Vui lòng chọn danh sách profile' },
  { match: /Profile is currently running automation or processing a video/i, text: 'Profile đang chạy tự động hoặc đang xử lý video' },
  { match: /Profile already running or processing a video/i, text: 'Profile đang chạy tự động hoặc đang xử lý video' },
  { match: /No matching profiles for the given selection/i, text: 'Không tìm thấy profile phù hợp với lựa chọn' },
  { match: /No profiles available to run/i, text: 'Không có profile nào khả dụng để chạy' },
  { match: /No idle profiles in selection/i, text: 'Không có profile nào ở trạng thái rảnh trong danh sách chọn' },
  { match: /Profile is already in login verification process/i, text: 'Profile đang trong quá trình xác thực đăng nhập' },
  { match: /Profile is not in login process/i, text: 'Profile không ở trong quá trình đăng nhập' },
  { match: /Profile is already adding favorite music/i, text: 'Profile đang trong quá trình thêm nhạc yêu thích' },
  { match: /Failed to launch browser:?\s*(.*)/i, text: 'Không thể khởi chạy trình duyệt: $1' },
  { match: /Failed to close browser:?\s*(.*)/i, text: 'Không thể đóng trình duyệt: $1' },
  { match: /Failed to add profile/i, text: 'Không thể tạo profile mới' },
  { match: /Failed to rename profile/i, text: 'Không thể đổi tên profile' },
  { match: /Profile added successfully/i, text: 'Tạo profile thành công' },
  { match: /Profile renamed successfully/i, text: 'Đổi tên profile thành công' },
  { match: /Settings updated/i, text: 'Đã lưu cấu hình hệ thống thành công!' },
  { match: /Failed to create group/i, text: 'Không thể tạo nhóm mới' },
  { match: /Failed to rename group/i, text: 'Không thể đổi tên nhóm' },
  { match: /Failed to delete group/i, text: 'Không thể xóa nhóm' },
  { match: /Failed to update profile group/i, text: 'Không thể cập nhật nhóm cho profile' },
  { match: /Failed to start login/i, text: 'Không thể bắt đầu đăng nhập' },
  { match: /Failed to stop login/i, text: 'Không thể dừng phiên đăng nhập' },
  { match: /Failed to add favorite music/i, text: 'Không thể thêm nhạc yêu thích' },
  { match: /Folder selection cancelled or failed/i, text: 'Đã hủy chọn thư mục' },
  { match: /No folder selected/i, text: 'Chưa chọn thư mục nào' },
  { match: /Body must be an object/i, text: 'Dữ liệu cấu hình không hợp lệ' },
  { match: /Both video_id and channel_id are required/i, text: 'Cần có cả video_id và channel_id' },
  { match: /No profile found managing channel ID/i, text: 'Không tìm thấy profile nào quản lý channel ID này' },
  { match: /Network Error/i, text: 'Lỗi kết nối mạng đến máy chủ' },
  { match: /Request failed with status code 500/i, text: 'Máy chủ gặp sự cố (500) khi xử lý yêu cầu' },
  { match: /Request failed with status code 400/i, text: 'Yêu cầu không hợp lệ (400)' },
  { match: /Request failed with status code 404/i, text: 'Không tìm thấy dữ liệu yêu cầu (404)' },
  { match: /Request failed with status code (\d+)/i, text: 'Yêu cầu thất bại với mã lỗi $1' }
];

export const translateText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const trimmed = rawText.trim();
  for (const item of ERROR_TRANSLATIONS) {
    if (item.match.test(trimmed)) {
      return trimmed.replace(item.match, item.text).trim();
    }
  }
  return trimmed;
};

/**
 * Helper to display floating toast notifications without shifting the layout.
 * Supports both string messages and { type, text } objects for seamless integration.
 * All messages are passed through translateText to guarantee 100% Vietnamese display.
 *
 * @param {string | { type?: 'success' | 'error' | 'warning' | 'info', text: string }} message
 * @param {object} [options]
 */
export const showToast = (message, options = {}) => {
  if (!message) return;

  if (typeof message === 'string') {
    return toast(translateText(message), options);
  }

  const { type = 'info', text } = message;
  if (!text) return;
  const translatedText = translateText(text);

  switch (type) {
    case 'success':
      return toast.success(translatedText, options);
    case 'error':
      return toast.error(translatedText, options);
    case 'warning':
      return typeof toast.warning === 'function'
        ? toast.warning(translatedText, options)
        : toast(translatedText, { ...options, icon: '⚠️' });
    case 'info':
    default:
      return typeof toast.info === 'function'
        ? toast.info(translatedText, options)
        : toast(translatedText, options);
  }
};

export { toast };
export default showToast;
