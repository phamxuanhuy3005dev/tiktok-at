import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import ProfileCardHeader from './ProfileCardHeader';
import ProfileCardActions from './ProfileCardActions';
import { getStatusColor, STATUS_LABELS } from '../status';

// Compact table row for a profile: checkbox, name, status, icon actions, delete.
// Optimized with React.memo and native CSS transitions to prevent layout jitter on polling.
const ProfileCard = React.memo(React.forwardRef(({
  profile,
  isSelected,
  onToggleSelected,
  onDelete,
  onOpen,
  onClose,
  isTogglingBrowser = false,
  isStarting = false,
  onStart,
  onLoginTikTok,
  onStopLoginTikTok,
  isLoggingIn,
  onUpdateName,
  onOpenCookieModal,
  onAddFavoriteMusic,
  isAddingFavoriteMusic,
  musicSearchTerm,
  editingId,
  setEditingId,
  editingValue,
  setEditingValue,
  onEdit
}, ref) => {
  const statusColor = getStatusColor(profile.status);
  const statusLabel = STATUS_LABELS[profile.status] || STATUS_LABELS.idle;
  const isActive = profile.status === 'uploading' || isLoggingIn;

  return (
    <div
      ref={ref}
      className={`table-row${isSelected ? ' table-row-selected' : ''}`}
    >
      <ProfileCardHeader
        profile={profile}
        isSelected={isSelected}
        onToggleSelected={onToggleSelected}
        onUpdateName={onUpdateName}
        editingId={editingId}
        setEditingId={setEditingId}
        editingValue={editingValue}
        setEditingValue={setEditingValue}
        onEdit={onEdit}
      />

      <div className="table-status">
        <div className="table-status-label" style={{ color: statusColor }}>
          <span
            className={`status-dot-glow${isActive ? ' status-dot-active' : ''}`}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              color: statusColor,
              boxShadow: isActive ? `0 0 8px ${statusColor}` : `0 0 4px ${statusColor}`,
              flexShrink: 0
            }}
          />
          {statusLabel}
        </div>
        <div className="table-status-meta">
          <Clock size={10} />
          {profile.last_run ? new Date(profile.last_run).toLocaleString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa chạy'}
        </div>
      </div>

      <ProfileCardActions
        profile={profile}
        onOpen={onOpen}
        onClose={onClose}
        isTogglingBrowser={isTogglingBrowser}
        isStarting={isStarting}
        onStart={onStart}
        onOpenCookieModal={onOpenCookieModal}
      />

      <button
        type="button"
        className="icon-btn icon-btn--danger"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(profile.id);
        }}
        data-tooltip="Xóa profile"
        aria-label="Xóa profile"
        style={{ justifySelf: 'center' }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}));

export default ProfileCard;
