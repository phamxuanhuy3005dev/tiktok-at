import { Cookie, ExternalLink, Play, RefreshCw } from 'lucide-react';
import React from 'react';
import IconActionButton from './IconActionButton';

// Icon-only actions for a profile row. Hover uses the instant data-tooltip toast.
const ProfileCardActions = React.memo(
  ({
    profile,
    onOpen,
    onClose,
    isTogglingBrowser = false,
    isStarting = false,
    onStart,
    onOpenCookieModal,
  }) => {
    const hasCookies = Boolean(profile.cookies && profile.cookies.trim());
    const uploading = profile.status === 'uploading' || isStarting;
    const isBrowserOpen = Boolean(profile.is_browser_open);

    const browserTooltip = isTogglingBrowser
      ? isBrowserOpen
        ? 'Đang đóng trình duyệt...'
        : 'Đang mở trình duyệt...'
      : isBrowserOpen
        ? 'Trình duyệt đang mở • Nhấp để đóng'
        : 'Mở profile (Chrome để kiểm tra / đăng nhập)';

    return (
      <div className="table-actions">
        <IconActionButton
          icon={
            isTogglingBrowser ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <ExternalLink size={15} />
            )
          }
          onClick={() =>
            isBrowserOpen && onClose ? onClose(profile.id) : onOpen(profile.id)
          }
          disabled={isTogglingBrowser}
          title={browserTooltip}
          color={isBrowserOpen ? '#10b981' : 'var(--text)'}
          bg={
            isBrowserOpen
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(255, 255, 255, 0.05)'
          }
          border={isBrowserOpen ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)'}
          size="32px"
        />
        <IconActionButton
          icon={
            uploading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Play size={15} fill="currentColor" />
            )
          }
          onClick={() => onStart(profile.id)}
          disabled={uploading}
          title={
            uploading ? 'Đang xử lý / upload video...' : 'Bắt đầu upload video'
          }
          color={uploading ? 'var(--accent)' : 'var(--text)'}
          bg={uploading ? 'transparent' : 'rgba(255, 255, 255, 0.05)'}
          border="var(--border)"
          size="32px"
        />
        <IconActionButton
          icon={<Cookie size={15} />}
          onClick={() => onOpenCookieModal(profile.id)}
          title={
            hasCookies
              ? 'Quản lý Cookie (Đã đăng nhập) • Xem / Xuất file JSON / Đồng bộ'
              : 'Quản lý Cookie (Chưa có cookie) • Nhấp để xem hoặc nhập cookie'
          }
          color={hasCookies ? '#10b981' : 'var(--text-muted)'}
          bg={
            hasCookies
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(255, 255, 255, 0.05)'
          }
          border={hasCookies ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}
          size="32px"
        />
      </div>
    );
  },
);

export default ProfileCardActions;
