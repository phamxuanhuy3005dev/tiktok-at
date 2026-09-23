import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Plus,
  Users,
  Check,
  X,
  Edit3,
  Trash2,
  FolderOpen,
  Play,
  Search,
  RefreshCw,
  Eye,
  Film
} from 'lucide-react';

const GroupsView = ({
  groups = [],
  newGroupName,
  setNewGroupName,
  addGroup,
  editingGroupId,
  setEditingGroupId,
  editingGroupValue,
  setEditingGroupValue,
  updateGroupName,
  updateGroup,
  deleteGroup,
  setMessage
}) => {
  const [groupSearch, setGroupSearch] = useState('');
  const [automationModalGroup, setAutomationModalGroup] = useState(null);
  const [modalVideoFolder, setModalVideoFolder] = useState('');
  const [modalRunMode, setModalRunMode] = useState('parallel');
  const [distributionPreview, setDistributionPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isStartingAutomation, setIsStartingAutomation] = useState(false);

  const notify = (type, text) => {
    if (typeof setMessage === 'function') {
      setMessage({ type, text });
    } else {
      alert(text);
    }
  };

  const totalAssignedProfiles = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.profile_count || 0), 0);
  }, [groups]);

  const displayedGroups = useMemo(() => {
    let list = [...groups];
    if (groupSearch.trim()) {
      const q = groupSearch.trim().toLowerCase();
      list = list.filter((g) => g.name && g.name.toLowerCase().includes(q));
    }
    return list;
  }, [groups, groupSearch]);

  // Open the Group Automation modal and load preview
  const handleOpenAutomationModal = async (group) => {
    if (!group.profile_count || group.profile_count === 0) {
      notify('error', `Nhóm "${group.name}" chưa có profile nào. Vui lòng gán profile vào nhóm trước.`);
      return;
    }

    const folder = group.video_folder || '';
    setAutomationModalGroup(group);
    setModalVideoFolder(folder);
    setDistributionPreview(null);

    if (folder) {
      loadDistributionPreview(group.id, folder);
    }
  };

  const loadDistributionPreview = async (groupId, folder) => {
    if (!folder) return;
    setIsLoadingPreview(true);
    try {
      const res = await axios.post(`/api/groups/${groupId}/preview-distribution`, { videoFolder: folder });
      setDistributionPreview(res.data);
    } catch (err) {
      setDistributionPreview(null);
      notify('error', err.response?.data?.error || 'Không thể xem trước phân chia video');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSelectFolderForGroup = async (group) => {
    try {
      const res = await axios.post('/api/select-folder');
      if (res.data?.path) {
        const folder = res.data.path;
        if (typeof updateGroup === 'function') {
          await updateGroup(group.id, { video_folder: folder });
        } else {
          await axios.patch(`/api/groups/${group.id}`, { video_folder: folder });
        }
        notify('success', `Đã lưu thư mục video cho nhóm "${group.name}"`);
      }
    } catch (err) {
      notify('error', 'Không thể chọn thư mục: ' + err.message);
    }
  };

  const handleSelectFolderInModal = async () => {
    try {
      const res = await axios.post('/api/select-folder');
      if (res.data?.path && automationModalGroup) {
        const folder = res.data.path;
        setModalVideoFolder(folder);
        if (typeof updateGroup === 'function') {
          updateGroup(automationModalGroup.id, { video_folder: folder });
        }
        loadDistributionPreview(automationModalGroup.id, folder);
      }
    } catch (err) {
      notify('error', 'Không thể chọn thư mục: ' + err.message);
    }
  };

  const handleStartGroupAutomation = async () => {
    if (!automationModalGroup) return;
    if (!modalVideoFolder) {
      notify('error', 'Vui lòng chọn thư mục chứa video trước khi bắt đầu.');
      return;
    }

    setIsStartingAutomation(true);
    try {
      await axios.post(`/api/groups/${automationModalGroup.id}/start-automation`, {
        videoFolder: modalVideoFolder,
        runMode: modalRunMode
      });
      notify('success', `Đã kích hoạt tự động hóa nhóm "${automationModalGroup.name}"! Video được chia đều cho các profile.`);
      setAutomationModalGroup(null);
    } catch (err) {
      notify('error', err.response?.data?.error || 'Không thể bắt đầu tự động hóa nhóm');
    } finally {
      setIsStartingAutomation(false);
    }
  };

  return (
    <section>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 className="page-title" style={{ margin: 0 }}>Nhóm Profile</h2>
          <span className="badge-profile-counter">
            {groups.length} nhóm · {totalAssignedProfiles} profile đã gom nhóm
          </span>
        </div>
        <p className="page-subtitle" style={{ maxWidth: '700px', lineHeight: 1.5, marginTop: '6px' }}>
          Tạo nhóm và quản lý các kênh theo chủ đề. Bạn có thể chọn thư mục video cho cả nhóm, hệ thống sẽ tự động <strong>chia đều video cho từng profile</strong> để upload cùng lúc.
        </p>
      </div>

      {/* Group Actions Bar */}
      <div className="glass" style={{ padding: '16px 20px', borderRadius: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Nhập tên nhóm mới..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: '180px', padding: '9px 14px' }}
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          />
          <button type="button" className="btn btn-primary" onClick={addGroup} style={{ height: '38px' }}>
            <Plus size={16} />
            Tạo nhóm
          </button>

          {groups.length > 1 && (
            <>
              <span className="toolbar-divider" style={{ height: '24px' }} />

              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Tìm nhóm..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  style={{ height: '38px', minWidth: '160px' }}
                />
                {groupSearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setGroupSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Group Cards List */}
      {displayedGroups.length === 0 ? (
        <div
          className="glass"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderRadius: '20px',
            color: 'var(--text-muted)',
            border: '2px dashed var(--border)'
          }}
        >
          <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
          <p style={{ color: 'var(--text)', fontWeight: '600', marginBottom: '6px' }}>
            {groups.length === 0 ? 'Chưa có nhóm nào' : 'Không tìm thấy nhóm phù hợp'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            {groups.length === 0
              ? 'Nhập tên và bấm "Tạo nhóm" để bắt đầu tổ chức các kênh của bạn.'
              : 'Thử tìm kiếm với từ khóa khác.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedGroups.map((g) => (
            <div
              key={g.id}
              className="glass"
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
            >
              {/* Group Name & Count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 240px', minWidth: '220px' }}>
                {editingGroupId === g.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <input
                      autoFocus
                      className="input input-compact"
                      style={{ flex: 1 }}
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
                      title="Lưu tên mới"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => setEditingGroupId(null)}
                      title="Hủy bỏ"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text)' }}>
                        {g.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {g.profile_count ?? 0} profile
                      </span>
                    </div>

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setEditingGroupId(g.id);
                        setEditingGroupValue(g.name);
                      }}
                      title="Đổi tên nhóm"
                    >
                      <Edit3 size={15} />
                    </button>
                  </>
                )}
              </div>

              {/* Group Video Folder Indicator & Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: '2 1 260px',
                  minWidth: '220px',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '0.82rem'
                }}
              >
                <FolderOpen size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    color: g.video_folder ? 'var(--text)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}
                  title={g.video_folder || 'Chưa chọn thư mục video nhóm'}
                >
                  {g.video_folder || 'Chưa gắn thư mục video'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', height: '28px', fontSize: '0.75rem', flexShrink: 0 }}
                  onClick={() => handleSelectFolderForGroup(g)}
                  title="Chọn thư mục video cho cả nhóm"
                >
                  Chọn thư mục
                </button>
              </div>

              {/* Actions: Run Group Automation & Delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleOpenAutomationModal(g)}
                  disabled={!g.profile_count || g.profile_count === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '0.82rem',
                    background: (!g.profile_count || g.profile_count === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10B981, #059669)'
                  }}
                  title={
                    (!g.profile_count || g.profile_count === 0)
                      ? 'Nhóm chưa có profile'
                      : 'Tự động chia đều video và chạy upload cho các profile trong nhóm'
                  }
                >
                  <Play size={14} fill="currentColor" />
                  <span>Tự động theo nhóm</span>
                </button>

                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => deleteGroup(g.id)}
                  title="Xóa nhóm (nhóm phải không còn profile nào)"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Group Video Distribution & Run Confirmation */}
      {automationModalGroup && (
        <div
          className="modal-backdrop"
          onClick={() => setAutomationModalGroup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)' }}>
                  Tự Động Hóa Nhóm: {automationModalGroup.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Phân chia đều video cho {automationModalGroup.profile_count || 0} profile trong nhóm
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAutomationModalGroup(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Folder Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Thư mục chứa video nguồn:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input"
                    value={modalVideoFolder}
                    onChange={(e) => {
                      setModalVideoFolder(e.target.value);
                      if (e.target.value) {
                        loadDistributionPreview(automationModalGroup.id, e.target.value);
                      }
                    }}
                    placeholder="Chọn hoặc nhập đường dẫn thư mục chứa video..."
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSelectFolderInModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                  >
                    <FolderOpen size={16} />
                    <span>Chọn thư mục</span>
                  </button>
                </div>
              </div>

              {/* Mode Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Chế độ chạy:
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="modalRunMode"
                      value="parallel"
                      checked={modalRunMode === 'parallel'}
                      onChange={() => setModalRunMode('parallel')}
                    />
                    <span>Song song (Nhiều profile cùng lúc)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="modalRunMode"
                      value="sequential"
                      checked={modalRunMode === 'sequential'}
                      onChange={() => setModalRunMode('sequential')}
                    />
                    <span>Tuần tự (Từng profile một - phù hợp máy yếu)</span>
                  </label>
                </div>
              </div>

              {/* Video Distribution Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                    Bảng phân chia video dự kiến:
                  </span>
                  {modalVideoFolder && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => loadDistributionPreview(automationModalGroup.id, modalVideoFolder)}
                      disabled={isLoadingPreview}
                      style={{ padding: '2px 8px', height: '24px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} className={isLoadingPreview ? 'animate-spin' : ''} />
                      <span>Quét lại</span>
                    </button>
                  )}
                </div>

                {isLoadingPreview ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Đang quét video trong thư mục...</p>
                  </div>
                ) : distributionPreview ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Tổng video tìm thấy: <strong style={{ color: '#10B981' }}>{distributionPreview.totalVideos}</strong> video</span>
                      <span>Số profile nhận video: <strong style={{ color: 'var(--primary)' }}>{distributionPreview.profilesCount}</strong> profile</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {distributionPreview.preview?.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Film size={15} color="var(--primary)" />
                            <strong>{item.name}</strong>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {item.videos.length > 0 ? (
                              <span style={{ color: '#10B981', fontWeight: 600 }}>
                                Nhận {item.videos.length} video ({item.videos[0]} {item.videos.length > 1 ? `... ${item.videos[item.videos.length - 1]}` : ''})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Không có video</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chọn thư mục video ở trên để xem bảng phân bổ đều cho từng profile.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAutomationModalGroup(null)}
                disabled={isStartingAutomation}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartGroupAutomation}
                disabled={isStartingAutomation || !distributionPreview || distributionPreview.totalVideos === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10B981, #059669)'
                }}
              >
                {isStartingAutomation ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                <span>Bắt đầu Upload Nhóm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GroupsView;
