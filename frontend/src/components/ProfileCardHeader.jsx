import { Check, Edit3, Globe, Users, X } from 'lucide-react';
import React from 'react';

// Identity cell of a profile row: selection checkbox, avatar, editable name.
const ProfileCardHeader = React.memo(
  ({
    profile,
    isSelected,
    onToggleSelected,
    onUpdateName,
    editingId,
    setEditingId,
    editingValue,
    setEditingValue,
    onEdit,
    followers,
  }) => (
    <>
      <label className="table-check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelected(profile.id)}
          className="checkbox checkbox--sm"
        />
      </label>

      <div className="table-identity" onClick={() => onEdit(profile.id)}>
        <div className="table-avatar">
          <Globe size={15} color="var(--accent)" />
        </div>
        {Boolean(editingId) && editingId === profile.id ? (
          <div className="table-name-edit" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              className="input input-compact"
              style={{ width: '140px' }}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onUpdateName(profile.id, editingValue);
                if (e.key === 'Escape') setEditingId(null);
              }}
            />
            <button
              type="button"
              className="icon-btn icon-btn--success"
              onClick={() => onUpdateName(profile.id, editingValue)}
              data-tooltip="Lưu tên"
              aria-label="Lưu tên profile"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              onClick={() => setEditingId(null)}
              data-tooltip="Hủy"
              aria-label="Hủy sửa tên"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="table-name">
            <span className="table-name-text">{profile.name}</span>
            {followers !== undefined && followers !== null && (
              <span
                className="badge-followers"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  marginLeft: '4px',
                  flexShrink: 0
                }}
                title={`Số lượng followers: ${typeof followers === 'number' ? followers.toLocaleString('vi-VN') : followers}`}
              >
                <Users size={11} />
                {typeof followers === 'number' ? followers.toLocaleString('vi-VN') : followers}
              </span>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(profile.id);
                setEditingValue(profile.name);
              }}
              data-tooltip="Sửa tên"
              aria-label="Sửa tên profile"
              style={{ opacity: 0.5 }}
            >
              <Edit3 size={13} />
            </button>
          </div>
        )}
      </div>
    </>
  ),
);

export default ProfileCardHeader;
