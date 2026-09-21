import React from 'react';
import { Video, AlertCircle, ShieldCheck } from 'lucide-react';

const SettingsView = ({ config, setConfig, updateConfig }) => {
  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Cấu hình Hệ thống</h2>
          <p className="page-subtitle">Thiết lập tham số tự động hóa và tài nguyên hệ thống</p>
        </div>
      </div>

      <div className="glass settings-card">
        <div className="settings-stack">
          {/* Video Folder */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
              Thư mục Video Mặc định
            </label>
            <div className="input-with-icon">
              <Video size={18} />
              <input
                className="input"
                value={config.videoFolder || ''}
                onChange={(e) => setConfig({ ...config, videoFolder: e.target.value })}
                placeholder="/Users/username/Desktop/tiktok-at/uploads"
              />
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
              Số lượng trình duyệt Playwright mở đồng thời khi chạy chế độ song song.
            </p>
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: '16px' }}
            onClick={updateConfig}
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      <div className="info-grid" style={{ marginTop: '24px', maxWidth: '640px' }}>
        <div className="glass tip-card">
          <AlertCircle size={20} color="var(--accent)" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Mẹo Hiệu Năng</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Mỗi profile dùng 1 profile Chrome độc lập với cookies và phiên duyệt web biệt lập. Hãy để số song song phù hợp với dung lượng RAM máy.
          </p>
        </div>
        <div className="glass tip-card">
          <ShieldCheck size={20} color="var(--success)" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Dữ liệu An toàn</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Toàn bộ cơ sở dữ liệu được lưu trữ cục bộ trên máy bằng SQLite WAL Mode tốc độ cao, không lưu dữ liệu lên cloud bên ngoài.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SettingsView;
