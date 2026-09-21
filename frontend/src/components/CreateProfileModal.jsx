import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderOpen,
  Video,
  Search,
  Trash2,
  Music,
  ShieldCheck
} from 'lucide-react';

// Modal used to create a new TikTok profile, fully synchronized with EditProfileModal.
const CreateProfileModal = ({
  open,
  newProfileName,
  setNewProfileName,
  newProfileGroupId,
  setNewProfileGroupId,
  newProfileVideoFolder,
  setNewProfileVideoFolder,
  newProfileMusicSearch,
  setNewProfileMusicSearch,
  newProfileAutoIncrementSchedule,
  setNewProfileAutoIncrementSchedule,
  newProfileScheduleInterval,
  setNewProfileScheduleInterval,
  newProfileRemoveTitle,
  setNewProfileRemoveTitle,
  newProfileSetMusic,
  setNewProfileSetMusic,
  newProfileNeedContentCheck,
  setNewProfileNeedContentCheck,
  groups,
  isCreatingProfile,
  isSelectingFolder,
  closeCreateProfileModal,
  addProfile,
  handleSelectFolderForCreateProfile
}) => {
  const busy = isCreatingProfile || isSelectingFolder;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-backdrop"
          onClick={() => closeCreateProfileModal()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="glass modal-card modal-card--md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Tạo Profile Mới</h3>
                <p className="modal-subtitle">Thêm profile mới và thiết lập kênh</p>
              </div>
              <button
                type="button"
                onClick={() => closeCreateProfileModal()}
                disabled={busy}
                className="modal-close"
                aria-label="Close create profile modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              paddingRight: '4px'
            }}>
              {/* Profile Name */}
              <div style={{ marginBottom: '20px' }}>
                <div className="field-title">
                  Tên Profile <span style={{ color: 'var(--error)' }}>*</span>
                </div>
                <input
                  autoFocus
                  className="input"
                  style={{ fontSize: '0.75rem', padding: '8px 12px', width: '100%' }}
                  placeholder="Nhập tên profile (VD: Kenh_TikTok_01)..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addProfile();
                    if (e.key === 'Escape') closeCreateProfileModal();
                  }}
                  disabled={busy}
                />
              </div>

              {/* Group */}
              <div style={{ marginBottom: '20px' }}>
                <div className="field-title">
                  <FolderOpen size={14} />
                  Nhóm Profile
                </div>
                <select
                  className="input"
                  style={{ fontSize: '0.75rem', padding: '8px 12px', width: '100%' }}
                  value={newProfileGroupId}
                  onChange={(e) => setNewProfileGroupId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Không thuộc nhóm nào</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Folder */}
              <div style={{ marginBottom: '20px' }}>
                <div className="field-title">
                  <Video size={14} />
                  Upload Folder
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input"
                    style={{ fontSize: '0.75rem', padding: '8px 12px', flex: 1 }}
                    placeholder="Global Default (/path/to/videos)"
                    value={newProfileVideoFolder}
                    onChange={(e) => setNewProfileVideoFolder(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={handleSelectFolderForCreateProfile}
                    className="btn btn-secondary"
                    style={{ padding: '8px', minWidth: 'auto', display: 'flex', alignItems: 'center' }}
                    disabled={busy}
                    title="Chọn thư mục chứa video"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Để trống để dùng thư mục video mặc định của hệ thống.
                </span>
              </div>

              {/* Favorite Music */}
              <div style={{ marginBottom: '20px' }}>
                <div className="field-title">
                  <Search size={14} />
                  Favorite Music (Nhập nhiều bài cách nhau bằng dấu phẩy ",")
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    className="input"
                    rows={3}
                    style={{ fontSize: '0.75rem', padding: '8px 12px', flex: 1, resize: 'vertical', minHeight: '64px' }}
                    placeholder="Nhập danh sách bài hát cách nhau bởi dấu phẩy (VD: Bài 1, Bài 2, Bài 3)..."
                    value={newProfileMusicSearch}
                    onChange={(e) => setNewProfileMusicSearch(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Nếu để trống: Tự động dùng danh sách trong tab Yêu thích (Favorites) của kênh & xoay vòng mỗi 10 video. Nếu nhập từ khóa: Tìm kiếm và chèn bài nhạc tương ứng (xoay vòng theo danh sách).
                </span>
              </div>

              {/* Auto Increment Schedule */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newProfileAutoIncrementSchedule}
                      onChange={(e) => setNewProfileAutoIncrementSchedule(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      disabled={busy}
                    />
                    <div className="toggle-body">
                      <span className="toggle-title">Lên lịch nối tiếp</span>
                      <span className="toggle-desc">V1: Public, V2: Mặc định, V3+: +{newProfileScheduleInterval} phút</span>
                    </div>
                  </label>
                </div>

                {newProfileAutoIncrementSchedule && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--divider)', paddingLeft: '28px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Khoảng cách:</span>
                    {[5, 10, 15, 20].map((mins) => (
                      <label key={mins} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="new_profile_schedule_interval"
                          value={mins}
                          checked={newProfileScheduleInterval === mins}
                          onChange={() => setNewProfileScheduleInterval(mins)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                          disabled={busy}
                        />
                        {mins} phút
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Remove title */}
              <div style={{ marginBottom: '20px' }}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={newProfileRemoveTitle}
                    onChange={(e) => setNewProfileRemoveTitle(e.target.checked)}
                    disabled={busy}
                  />
                  <div className="toggle-body">
                    <span className="toggle-title">
                      <Trash2 size={14} color="var(--error)" />
                      Xóa tiêu đề khi upload
                    </span>
                    <span className="toggle-desc">
                      Bật: tự động xóa tiêu đề mặc định khi đăng. Tắt: giữ tiêu đề gốc.
                    </span>
                  </div>
                </label>
              </div>

              {/* Set music */}
              <div style={{ marginBottom: '20px' }}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={newProfileSetMusic}
                    onChange={(e) => setNewProfileSetMusic(e.target.checked)}
                    disabled={busy}
                  />
                  <div className="toggle-body">
                    <span className="toggle-title">
                      <Music size={14} color="var(--accent)" />
                      Set nhạc khi upload
                    </span>
                    <span className="toggle-desc">
                      Bật: mở Edit video, tự động chọn nhạc từ tab Yêu thích (Favorites) & xoay vòng mỗi 10 video một bài (chỉnh âm lượng -50).
                    </span>
                  </div>
                </label>
              </div>

              {/* Content Check */}
              <div style={{ marginBottom: '20px' }}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={newProfileNeedContentCheck}
                    onChange={(e) => setNewProfileNeedContentCheck(e.target.checked)}
                    disabled={busy}
                  />
                  <div className="toggle-body">
                    <span className="toggle-title">
                      <ShieldCheck size={14} color="var(--success)" />
                      Kiểm tra nội dung (Content Check)
                    </span>
                    <span className="toggle-desc">
                      Bật: tự động kiểm tra bản quyền / nội dung bằng Content Check Lite. Tắt: bỏ qua kiểm tra (mặc định tắt).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => closeCreateProfileModal()}
                disabled={busy}
                style={{ padding: '8px 20px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addProfile}
                disabled={busy || !newProfileName.trim()}
                style={{ padding: '8px 20px' }}
              >
                {isCreatingProfile ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateProfileModal;
