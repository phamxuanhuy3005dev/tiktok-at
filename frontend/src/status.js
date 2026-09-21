// Shared status helpers for the TikTok Manager UI.
// Centralizes the status → color mapping and human-readable labels so that
// cards, badges and modals stay consistent.

export const STATUS_LABELS = {
  idle: 'Sẵn sàng',
  uploading: 'Đang upload',
  logging_in: 'Đang đăng nhập',
  changing_avatar: 'Đang đổi avatar',
  adding_favorite_music: 'Đang thêm nhạc',
  success: 'Thành công',
  error: 'Lỗi',
  no_videos: 'Không có video'
};

export const getStatusColor = (status = 'idle') => {
  switch (status) {
    case 'uploading': return 'var(--accent)';
    case 'logging_in': return 'var(--success)';
    case 'changing_avatar': return 'var(--status-avatar)';
    case 'adding_favorite_music': return 'var(--status-music-active)';
    case 'success': return 'var(--success)';
    case 'error': return 'var(--error)';
    case 'no_videos': return 'var(--status-skip)';
    default: return 'var(--text-muted)';
  }
};

// Backwards-compatible alias.
export const statusColor = getStatusColor;

export const getStatusLabel = (status = 'idle') => STATUS_LABELS[status] || status || 'Sẵn sàng';

