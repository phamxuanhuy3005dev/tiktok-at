import React from 'react';
import { Plus, Users, Check, X, Edit3, Trash2 } from 'lucide-react';

// The "Groups" tab: create, rename and delete groups.
const GroupsView = ({
  groups,
  newGroupName,
  setNewGroupName,
  addGroup,
  editingGroupId,
  setEditingGroupId,
  editingGroupValue,
  setEditingGroupValue,
  updateGroupName,
  deleteGroup
}) => (
  <section>
    <div className="page-header">
      <div>
        <h2 className="page-title">Nhóm Profile</h2>
        <p className="page-subtitle" style={{ maxWidth: '640px', lineHeight: 1.5 }}>
          Tạo và đổi tên nhóm để gom profile theo chủ đề hoặc kênh. Gán profile vào nhóm từ trang Quản lý Profile; chỉ được xóa nhóm khi không còn profile nào bên trong.
        </p>
      </div>
    </div>

    <div className="glass" style={{ padding: '20px 24px', borderRadius: '20px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Nhập tên nhóm mới..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: '1 1 220px', minWidth: '200px', padding: '10px 14px' }}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
        />
        <button type="button" className="btn btn-primary" onClick={addGroup}>
          <Plus size={18} />
          Tạo nhóm
        </button>
      </div>
    </div>

    {groups.length === 0 ? (
      <div
        className="glass"
        style={{
          textAlign: 'center',
          padding: '56px 32px',
          borderRadius: '24px',
          color: 'var(--text-muted)',
          border: '2px dashed var(--border)'
        }}
      >
        <Users size={40} style={{ margin: '0 auto 16px', opacity: 0.35 }} />
        <p style={{ color: 'var(--text)', fontWeight: '600', marginBottom: '8px' }}>Chưa có nhóm nào</p>
        <p style={{ fontSize: '0.9rem' }}>Nhập tên và bấm "Tạo nhóm" để thêm nhóm đầu tiên.</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.map((g) => (
          <div key={g.id} className="glass group-row">
            {editingGroupId === g.id ? (
              <>
                <input
                  autoFocus
                  className="input"
                  style={{ flex: '1 1 240px', padding: '8px 12px' }}
                  value={editingGroupValue}
                  onChange={(e) => setEditingGroupValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateGroupName(g.id, editingGroupValue);
                    if (e.key === 'Escape') setEditingGroupId(null);
                  }}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--success"
                  onClick={() => updateGroupName(g.id, editingGroupValue)}
                  data-tooltip="Lưu tên mới"
                  aria-label="Lưu tên mới"
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => setEditingGroupId(null)}
                  data-tooltip="Hủy bỏ"
                  aria-label="Hủy bỏ"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <span className="group-name">{g.name}</span>
                <span className="group-count">
                  {g.profile_count ?? 0} profile
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setEditingGroupId(g.id);
                    setEditingGroupValue(g.name);
                  }}
                  data-tooltip="Đổi tên nhóm"
                  aria-label="Đổi tên nhóm"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => deleteGroup(g.id)}
                  data-tooltip="Xóa nhóm"
                  aria-label="Xóa nhóm"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
);

export default GroupsView;
