import React, { useState } from 'react';
import { Video, AlertCircle, ShieldCheck, Bell, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { showToast } from '../utils/toast';

const SettingsView = ({ config, setConfig, updateConfig }) => {
  const [testingTelegram, setTestingTelegram] = useState(false);

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      // First save current config so backend uses the newest token/chat_id
      await axios.post('/api/config', config);
      const res = await axios.post('/api/system/test-telegram');
      if (res.data.success) {
        showToast({ type: 'success', text: 'Đã gửi thông báo kiểm tra tới Telegram thành công!' });
      } else {
        showToast({ type: 'error', text: res.data.error || 'Gửi test Telegram thất bại' });
      }
    } catch (err) {
      showToast({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Cấu hình Hệ thống</h2>
          <p className="page-subtitle">Thiết lập tham số tự động hóa &amp; thông báo</p>
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

          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

          {/* Telegram Settings */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Bell size={18} color="var(--accent)" />
              <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>Thông báo Telegram (Tùy chọn)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Telegram Bot Token
                </label>
                <input
                  className="input"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px 12px' }}
                  value={config.telegramToken || ''}
                  onChange={(e) => setConfig({ ...config, telegramToken: e.target.value })}
                  placeholder="VD: 7952619216:AAFO_cgfDyV1TRism4j7shaaTIgGdtxF6pU"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Telegram Chat ID
                </label>
                <input
                  className="input"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px 12px' }}
                  value={config.telegramChatId || ''}
                  onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                  placeholder="VD: 1370074402"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                >
                  <Send size={14} />
                  {testingTelegram ? 'Đang gửi...' : 'Kiểm tra Telegram'}
                </button>
              </div>
            </div>
            <p className="input-hint" style={{ marginTop: '8px' }}>
              Nhận thông báo tự động khi upload video hoàn tất (kèm link bài đăng) hoặc khi có lỗi.
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
            Mỗi profile dùng 1 profile Chrome độc lập với cookies và fingerprint riêng. Hãy để số song song phù hợp với dung lượng RAM máy.
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
