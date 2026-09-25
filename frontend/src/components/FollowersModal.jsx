import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Award
} from 'lucide-react';

export function formatFollowerCount(count) {
  if (count === null || count === undefined) return 'N/A';
  if (typeof count === 'number') {
    return count.toLocaleString('vi-VN');
  }
  return String(count);
}

const FollowersModal = ({
  open,
  onClose,
  profiles = [],
  followersMap = {},
  isLoading = false,
  onRefresh
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Calculate totals
  const totalProfiles = profiles.length;
  let totalFollowers = 0;
  let hasValidNumbers = false;

  profiles.forEach((p) => {
    const val = followersMap[p.id];
    if (typeof val === 'number') {
      totalFollowers += val;
      hasValidNumbers = true;
    }
  });

  const handleCopySummary = () => {
    const lines = profiles.map((p) => {
      const count = followersMap[p.id];
      return `@${p.name}: ${formatFollowerCount(count)} followers`;
    });
    if (hasValidNumbers) {
      lines.push(`---`);
      lines.push(`Tổng cộng: ${totalFollowers.toLocaleString('vi-VN')} followers (${totalProfiles} kênh)`);
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="glass modal-card modal-card--md"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '580px', width: '100%' }}
        >
          {/* Header */}
          <div className="modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="var(--primary)" />
                <h3 className="modal-title">Số Lượng Followers</h3>
              </div>
              <p className="modal-subtitle">
                Thống kê người theo dõi của {totalProfiles} profile đã chọn
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '20px 24px' }}>
            {/* Top Summary Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div
                className="glass"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6'
                  }}
                >
                  <Award size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    Kênh đã chọn
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                    {totalProfiles} kênh
                  </strong>
                </div>
              </div>

              <div
                className="glass"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981'
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    Tổng số Followers
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>
                    {isLoading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        <RefreshCw size={13} className="animate-spin" /> Đang tính...
                      </span>
                    ) : hasValidNumbers ? (
                      totalFollowers.toLocaleString('vi-VN')
                    ) : (
                      'N/A'
                    )}
                  </strong>
                </div>
              </div>
            </div>

            {/* Profiles List */}
            <div
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}
            >
              {profiles.map((p) => {
                const count = followersMap[p.id];
                const hasValue = count !== undefined && count !== null;

                return (
                  <div
                    key={p.id}
                    className="glass"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border)',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Users size={16} color="var(--primary)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: 'var(--text)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          @{p.name}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isLoading && !hasValue ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          <RefreshCw size={12} className="animate-spin" />
                          Đang tải...
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: hasValue ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            color: hasValue ? '#10B981' : 'var(--text-muted)',
                            border: hasValue ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)'
                          }}
                        >
                          <Users size={12} />
                          {formatFollowerCount(count)}
                        </span>
                      )}

                      <a
                        href={`https://www.tiktok.com/@${p.name}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="icon-btn"
                        style={{ padding: '6px', borderRadius: '6px' }}
                        title={`Xem profile @${p.name} trên TikTok`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              {onRefresh && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onRefresh}
                  disabled={isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    padding: '6px 12px'
                  }}
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                  <span>Quét lại</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopySummary}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  padding: '6px 14px'
                }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copied ? 'Đã chép!' : 'Sao chép kết quả'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ fontSize: '0.82rem', padding: '6px 16px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FollowersModal;
