import { Cookie, FileJson, Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import IconActionButton from './IconActionButton';

const ProfilesToolbar = ({
  hasSelection = false,
  setIsCreateProfileModalOpen,
  handleExportCookiesJson,
  handleImportCookiesJson,
  clearTrash,
  displayedCount = 0,
  totalProfiles = 0,
}) => {
  const cookieFileInputRef = useRef(null);

  const onCookieFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportCookiesJson(file);
      e.target.value = '';
    }
  };

  return (
    <div className="dash-top">
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <h2 className="page-title" style={{ margin: 0 }}>
            Quản lý Profile
          </h2>
          <span className="badge-profile-counter">
            {displayedCount !== totalProfiles
              ? `Hiển thị ${displayedCount} / ${totalProfiles} profile`
              : `${totalProfiles} profile`}
          </span>
        </div>
        <p className="page-subtitle" style={{ marginTop: '4px' }}>
          Quản lý và tự động hóa các kênh TikTok
        </p>
      </div>
      <div className="dash-tools">
        <button
          type="button"
          className="btn-add"
          onClick={() => setIsCreateProfileModalOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          Thêm mới
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <input
          type="file"
          ref={cookieFileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={onCookieFileSelected}
        />
        <IconActionButton
          icon={<Cookie size={16} />}
          onClick={handleExportCookiesJson}
          title="Xuất Cookies toàn bộ Profile ra file JSON (dùng chung cho các máy)"
          color="#10B981"
          bg="rgba(16, 185, 129, 0.1)"
          border="rgba(16, 185, 129, 0.3)"
        />
        <IconActionButton
          icon={<FileJson size={16} />}
          onClick={() => cookieFileInputRef.current?.click()}
          title="Nhập Cookies từ file JSON (Tự động cập nhật cookie hoặc tạo profile mới trên máy này)"
          color="#F59E0B"
          bg="rgba(245, 158, 11, 0.1)"
          border="rgba(245, 158, 11, 0.3)"
        />
        <IconActionButton
          icon={<Trash2 size={16} />}
          onClick={clearTrash}
          disabled={!hasSelection}
          title={
            hasSelection
              ? 'Dọn dẹp rác - giải phóng cache/dữ liệu tạm của profile đã chọn'
              : 'Chọn checkbox trên từng profile cần dọn rác'
          }
          color="var(--status-warn)"
          bg="rgba(245, 158, 11, 0.08)"
          border="rgba(245, 158, 11, 0.25)"
        />
      </div>
    </div>
  );
};

export default ProfilesToolbar;
