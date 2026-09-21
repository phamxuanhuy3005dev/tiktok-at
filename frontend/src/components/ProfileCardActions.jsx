import React from 'react';
import {
  ExternalLink,
  Play,
  RefreshCw,
  Cookie
} from 'lucide-react';
import IconActionButton from './IconActionButton';

// Icon-only actions for a profile row. Hover uses the instant data-tooltip toast.
const ProfileCardActions = React.memo(({
  profile,
  onOpen,
  onStart,
  onOpenCookieModal
}) => {
  const hasCookies = Boolean(profile.cookies && profile.cookies.trim());
  const uploading = profile.status === 'uploading';

  return (
    <div className="table-actions">
      <IconActionButton
        icon={<ExternalLink size={15} />}
        onClick={() => onOpen(profile.id)}
        title="Mở profile (Mở Chrome để đăng nhập hoặc kiểm tra)"
        color="var(--text)"
        bg="rgba(255, 255, 255, 0.05)"
        border="var(--border)"
        size="32px"
      />
      <IconActionButton
        icon={uploading ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
        onClick={() => onStart(profile.id)}
        disabled={uploading}
        title={uploading ? 'Đang upload video...' : 'Bắt đầu upload video'}
        color={uploading ? 'var(--accent)' : 'var(--text)'}
        bg={uploading ? 'transparent' : 'rgba(255, 255, 255, 0.05)'}
        border="var(--border)"
        size="32px"
      />
      <IconActionButton
        icon={<Cookie size={15} />}
        onClick={() => onOpenCookieModal(profile.id)}
        title={hasCookies ? 'Quản lý Cookie (Đã đăng nhập) • Xem / Xuất file JSON / Đồng bộ' : 'Quản lý Cookie (Chưa có cookie) • Nhấp để xem hoặc nhập cookie'}
        color={hasCookies ? '#10b981' : 'var(--text-muted)'}
        bg={hasCookies ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)'}
        border={hasCookies ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}
        size="32px"
      />
    </div>
  );
});

export default ProfileCardActions;

