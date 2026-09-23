import React, { useState } from 'react';
import axios from 'axios';
import {
  Video,
  AlertCircle,
  ShieldCheck,
  FolderOpen,
  RefreshCw,
  Trash2,
  Sparkles,
  FileImage,
  HardDrive
} from 'lucide-react';

const SettingsView = ({
  config,
  setConfig,
  updateConfig,
  isSaving = false,
  onSelectFolder,
  setMessage
}) => {
  const [isClearingTrash, setIsClearingTrash] = useState(false);
  const [isClearingDebug, setIsClearingDebug] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const notify = (type, text) => {
    if (typeof setMessage === 'function') {
      setMessage({ type, text });
    } else {
      alert(text);
    }
  };

  const handleClearTrash = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa vĩnh viễn toàn bộ profile trong Thùng rác (trash)? Hành động này không thể hoàn tác.')) {
      return;
    }
    setIsClearingTrash(true);
    try {
      const res = await axios.post('/api/system/clear-trash');
      const freedMB = res.data?.freedMB || 0;
      notify('success', `Đã dọn sạch thùng rác! Giải phóng ${freedMB} MB ổ đĩa.`);
    } catch (err) {
      notify('error', `Lỗi dọn thùng rác: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsClearingTrash(false);
    }
  };

  const handleClearDebug = async () => {
    setIsClearingDebug(true);
    try {
      const res = await axios.post('/api/system/clear-debug');
      const freedMB = res.data?.freedMB || 0;
      const count = res.data?.clearedCount || 0;
      notify('success', `Đã dọn ${count} file debug screenshot! Giải phóng ${freedMB} MB.`);
    } catch (err) {
      notify('error', `Lỗi dọn file debug: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsClearingDebug(false);
    }
  };

  const handleClearAllTemp = async () => {
    if (!window.confirm('Dọn dẹp toàn bộ thùng rác và file tạm hệ thống để tối ưu dung lượng ổ đĩa?')) {
      return;
    }
    setIsClearingAll(true);
    try {
      const res = await axios.post('/api/system/clear-all-temp');
      const totalFreed = res.data?.totalFreedMB || 0;
      notify('success', `Dọn dẹp hoàn tất! Tổng dung lượng đã giải phóng: ${totalFreed} MB.`);
    } catch (err) {
      notify('error', `Lỗi dọn dẹp hệ thống: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Cấu hình Hệ thống</h2>
          <p className="page-subtitle">Thiết lập tham số tự động hóa, tài nguyên và dọn dẹp dung lượng đĩa</p>
        </div>
      </div>

      <div className="glass settings-card">
        <div className="settings-stack">
          {/* Video Folder */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
              Thư mục Video Mặc định
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="input-with-icon" style={{ flex: 1 }}>
                <Video size={18} />
                <input
                  className="input"
                  value={config.videoFolder || ''}
                  onChange={(e) => setConfig({ ...config, videoFolder: e.target.value })}
                  placeholder="/Users/username/Desktop/tiktok-at/uploads"
                />
              </div>
              {onSelectFolder && (
                <button
                  type="button"
                  onClick={onSelectFolder}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', flexShrink: 0 }}
                  title="Chọn thư mục video trên máy tính"
                >
                  <FolderOpen size={16} />
                  <span>Chọn thư mục</span>
                </button>
              )}
            </div>
            <p className="input-hint">
              Đường dẫn thư mục chứa video (.mp4, .mov) khi profile không chọn thư mục riêng.
            </p>
          </div>

          {/* Parallel Uploads */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
              Số Profile Chạy Song Song Tối Đa
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min="1"
                max="10"
                style={{ flex: 1, accentColor: 'var(--primary)' }}
                value={config.maxConcurrency || 2}
                onChange={(e) => setConfig({ ...config, maxConcurrency: parseInt(e.target.value, 10) || 1 })}
              />
              <div className="glass" style={{ padding: '6px 14px', borderRadius: '8px', fontWeight: '700', color: 'var(--primary)', minWidth: '42px', textAlign: 'center' }}>
                {config.maxConcurrency || 2}
              </div>
            </div>
            <p className="input-hint">
              Số lượng trình duyệt Playwright mở đồng thời khi chạy chế độ song song (máy 4-8GB RAM nên để 1-2).
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={updateConfig}
            disabled={isSaving}
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : null}
            <span>{isSaving ? 'Đang lưu thay đổi...' : 'Lưu Cấu Hình'}</span>
          </button>
        </div>
      </div>

      {/* Storage and Trash Clean-up Section */}
      <div className="glass settings-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <HardDrive size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Dọn Dẹp Dung Lượng Đĩa & Thùng Rác (Trash)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
          Khi bạn xóa profile, hệ thống chuyển thư mục vào thùng rác <code>trash/</code> để đề phòng xóa nhầm. Bạn có thể xóa sạch các thư mục này và file ảnh debug để giải phóng dung lượng ổ đĩa.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearTrash}
            disabled={isClearingTrash || isClearingAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            {isClearingTrash ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
            <span>Dọn sạch Thùng rác (Xóa vĩnh viễn)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearDebug}
            disabled={isClearingDebug || isClearingAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isClearingDebug ? <RefreshCw size={15} className="animate-spin" /> : <FileImage size={15} />}
            <span>Dọn dẹp ảnh Debug</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleClearAllTemp}
            disabled={isClearingAll || isClearingTrash || isClearingDebug}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {isClearingAll ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>Dọn tất cả rác (Tối ưu đĩa)</span>
          </button>
        </div>
      </div>

      <div className="info-grid" style={{ marginTop: '20px', maxWidth: '640px' }}>
        <div className="glass tip-card">
          <AlertCircle size={20} color="var(--accent)" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Mẹo Hiệu Năng Cho Máy Yếu</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Hệ thống đã tự động giới hạn RAM V8 (512MB) và bộ đệm ổ đĩa (32MB) cho mỗi profile Chrome. Với máy 4GB-8GB RAM, nên chạy 1-2 profile song song hoặc chọn chế độ Tuần tự.
          </p>
        </div>
        <div className="glass tip-card">
          <ShieldCheck size={20} color="var(--success)" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Dữ liệu An Toàn</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Toàn bộ cơ sở dữ liệu được lưu trữ cục bộ trên máy bằng SQLite WAL Mode tốc độ cao, không lưu dữ liệu lên cloud bên ngoài.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SettingsView;
