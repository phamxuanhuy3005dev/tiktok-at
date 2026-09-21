import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderOpen,
  Music,
  Search,
  ShieldCheck,
  Trash2,
  Video,
  X
} from 'lucide-react';
import { getStatusColor } from '../status';

const EditProfileModal = ({
  isOpen,
  onClose,
  profile,
  groups,
  onUpdateGroup,
  onUpdateFolder,
  onSelectFolder,
  onUpdateChannelIds,
  onUpdateSetMusic,
  onUpdateAutoIncrementSchedule,
  onUpdateScheduleInterval,
  onUpdateUploadCount,
  onUpdateRemoveTitle,
  onUpdateNeedContentCheck,
  musicSearchTerm,
  onUpdateMusicSearchTerm
}) => {
  if (!profile) return null;

  const handleBackdropClick = (e) => {
    onClose();
  };

  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-backdrop"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="glass modal-card modal-card--md"
            onClick={handleCardClick}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Chỉnh Sửa Profile</h3>
                <p className="modal-subtitle">{profile.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="modal-close"
                aria-label="Close edit profile modal"
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
              {/* Group */}
              <div style={{ marginBottom: '20px' }}>
                <div className="field-title">
                  <FolderOpen size={14} />
                  Nhóm Profile
                </div>
                <select
                  className="input"
                  style={{ fontSize: '0.75rem', padding: '8px 12px', width: '100%' }}
                  value={profile.group_id || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdateGroup(profile.id, v === '' ? null : v);
                  }}
                >
                  <option value="">Không thuộc nhóm nào</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
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
                    placeholder="Global Default"
                    value={profile.video_folder || ''}
                    onChange={(e) => onUpdateFolder(profile.id, e.target.value)}
                  />
                  <button
                    onClick={() => onSelectFolder(profile.id)}
                    className="btn-secondary"
                    style={{ padding: '8px', minWidth: 'auto' }}
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
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
                    value={musicSearchTerm || ''}
                    onChange={(e) => onUpdateMusicSearchTerm(profile.id, e.target.value)}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Nếu để trống: Tự động dùng danh sách trong tab Yêu thích (Favorites) của kênh &amp; xoay vòng mỗi 10 video. Nếu nhập từ khóa: Tìm kiếm và chèn bài nhạc tương ứng (xoay vòng theo danh sách).
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
                      checked={profile.auto_increment_schedule === 1}
                      onChange={(e) => onUpdateAutoIncrementSchedule(profile.id, e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div className="toggle-body">
                      <span className="toggle-title">Lên lịch nối tiếp</span>
                      <span className="toggle-desc">V1: Public, V2: Mặc định, V3+: +{(profile.schedule_interval || 5)} phút</span>
                    </div>
                  </label>
                </div>

                {profile.auto_increment_schedule === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--divider)', paddingLeft: '28px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Khoảng cách:</span>
                    {[5, 10, 15, 20].map((mins) => (
                      <label key={mins} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`schedule_interval_${profile.id}`}
                          value={mins}
                          checked={(profile.schedule_interval || 5) === mins}
                          onChange={() => onUpdateScheduleInterval && onUpdateScheduleInterval(profile.id, mins)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
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
                    checked={profile.remove_title !== 0}
                    onChange={(e) => onUpdateRemoveTitle(profile.id, e.target.checked)}
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
                    checked={profile.set_music === 1}
                    onChange={(e) => onUpdateSetMusic(profile.id, e.target.checked)}
                  />
                  <div className="toggle-body">
                    <span className="toggle-title">
                      <Music size={14} color="var(--accent)" />
                      Set nhạc khi upload
                    </span>
                    <span className="toggle-desc">
                      Bật: mở Edit video, tự động chọn nhạc từ tab Yêu thích (Favorites) &amp; xoay vòng mỗi 10 video một bài (chỉnh âm lượng -50).
                    </span>
                  </div>
                </label>
              </div>

              {/* Content Check */}
              <div style={{ marginBottom: '20px' }}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={profile.need_content_check === 1}
                    onChange={(e) => onUpdateNeedContentCheck(profile.id, e.target.checked)}
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

            {/* Footer with status */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(profile.status)
                }} />
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: getStatusColor(profile.status),
                  textTransform: 'uppercase'
                }}>
                  {profile.status}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
