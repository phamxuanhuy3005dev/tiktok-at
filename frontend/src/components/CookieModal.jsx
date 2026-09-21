import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  FileCode
} from 'lucide-react';

const CookieModal = ({
  open,
  onClose,
  profile,
  onSaveCookies,
  onCaptureFromBrowser,
  onLogout,
  isBrowserOpen = false
}) => {
  const [cookieText, setCookieText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (open && profile) {
      const raw = profile.cookies || '';
      try {
        if (raw.trim().startsWith('[') || raw.trim().startsWith('{')) {
          setCookieText(JSON.stringify(JSON.parse(raw), null, 2));
        } else {
          setCookieText(raw);
        }
      } catch (e) {
        setCookieText(raw);
      }
      setStatusMsg(null);
      setCopied(false);

      // If cookies in profile state are empty, try auto-fetching from live browser or disk!
      if (!raw || !raw.trim()) {
        if (typeof onCaptureFromBrowser === 'function') {
          onCaptureFromBrowser(profile.id).then((res) => {
            if (res?.cookies) {
              setCookieText(JSON.stringify(res.cookies, null, 2));
            }
          }).catch(() => null);
        }
      }
    }
  }, [open, profile, onCaptureFromBrowser]);


  if (!profile) return null;

  // Check session validity heuristics
  const raw = (profile.cookies || '').trim();
  let cookieCount = 0;
  let hasSession = false;

  if (raw) {
    try {
      let parsed;
      if (raw.startsWith('[') || raw.startsWith('{')) {
        parsed = JSON.parse(raw);
      } else {
        parsed = raw.split(';').map((s) => s.trim()).filter(Boolean);
      }
      if (Array.isArray(parsed)) {
        cookieCount = parsed.length;
        hasSession = parsed.some((c) =>
          typeof c === 'object'
            ? c.name === 'sessionid' || c.name === 'sessionid_ss' || c.name === 'sid_tt'
            : String(c).startsWith('sessionid=') || String(c).startsWith('sessionid_ss=')
        );
      }
    } catch (e) {}
  }

  const handleCopy = async () => {
    if (!cookieText) return;
    try {
      await navigator.clipboard.writeText(cookieText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy cookie:', err);
    }
  };

  const handleDownload = () => {
    if (!cookieText) return;
    try {
      const blob = new Blob([cookieText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = profile.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.href = url;
      a.download = `${safeName}_cookies.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download cookie:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          setCookieText(JSON.stringify(parsed, null, 2));
        } catch (err) {
          setCookieText(content);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await onSaveCookies(profile.id, cookieText.trim());
      setStatusMsg({ type: 'success', text: 'Đã lưu cookie thành công!' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Lỗi khi lưu cookie' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    setStatusMsg(null);
    try {
      const res = await onCaptureFromBrowser(profile.id);
      setStatusMsg({ type: 'success', text: res?.message || 'Đã lấy cookie từ trình duyệt thành công!' });
      if (res?.cookies) {
        setCookieText(JSON.stringify(res.cookies, null, 2));
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Không lấy được cookie từ trình duyệt' });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLogoutClick = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn đăng xuất tài khoản [${profile.name}]? Toàn bộ cookie và session của profile này sẽ bị xóa.`)) {
      return;
    }
    setIsLoggingOut(true);
    setStatusMsg(null);
    try {
      await onLogout(profile.id);
      setCookieText('');
      setStatusMsg({ type: 'success', text: 'Đã đăng xuất thành công!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Lỗi khi đăng xuất' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-backdrop"
          onClick={() => onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="glass modal-card modal-card--md"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={20} color="var(--primary)" />
                  <h3 className="modal-title">Quản lý Cookie & Phiên Đăng nhập</h3>
                </div>
                <p className="modal-subtitle">
                  Kênh: <b>{profile.name}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="modal-close"
                aria-label="Close cookie modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: hasSession ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: hasSession ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hasSession ? (
                    <ShieldCheck size={18} color="#10b981" />
                  ) : (
                    <ShieldAlert size={18} color="#f59e0b" />
                  )}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: hasSession ? '#10b981' : '#f59e0b' }}>
                      {hasSession
                        ? `Đã đăng nhập (Có sessionid • ${cookieCount} cookies)`
                        : cookieCount > 0
                        ? `Có ${cookieCount} cookies (Chưa thấy sessionid)`
                        : 'Chưa có Cookie (Chưa đăng nhập)'}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {hasSession
                        ? 'Phiên đăng nhập sẵn sàng để auto-upload và mở trình duyệt.'
                        : 'Dán Cookie JSON hoặc mở Chrome đăng nhập để tự động lưu session.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Lấy cookie mới nhất từ Chrome hoặc thư mục lưu trữ profile"
                >
                  <RefreshCw size={12} className={isCapturing ? 'animate-spin' : ''} />
                  {isBrowserOpen ? 'Lấy từ Chrome' : 'Đồng bộ từ Profile'}
                </button>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  disabled={!cookieText}
                  style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copied ? 'Đã chép vào Clipboard!' : 'Sao chép Cookie'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownload}
                  disabled={!cookieText}
                  style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  Tải file JSON
                </button>

                <label
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={14} />
                  Nhập file JSON...
                  <input
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Cookie Editor Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Dữ liệu Cookie (Định dạng JSON mảng hoặc chuỗi name=value;):
                </label>
                <textarea
                  className="input"
                  rows={8}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: '1.4',
                    padding: '10px',
                    width: '100%',
                    resize: 'vertical',
                    minHeight: '160px',
                    whiteSpace: 'pre',
                    background: 'rgba(0, 0, 0, 0.25)'
                  }}
                  placeholder="Dán mảng Cookie JSON ([{ name, value, domain, path, ... }]) hoặc chuỗi cookie tại đây..."
                  value={cookieText}
                  onChange={(e) => setCookieText(e.target.value)}
                />
              </div>

              {/* Notification Message */}
              {statusMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: statusMsg.type === 'success' ? '#10b981' : '#ef4444',
                    background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}
                >
                  {statusMsg.text}
                </div>
              )}

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)'
                }}
              >
                <div>
                  {hasSession && (
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      disabled={isLoggingOut}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <LogOut size={13} />
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất / Xóa Session'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ padding: '6px 18px' }}
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu Cookie'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieModal;
