import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SingleSessionBanner = ({ session, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!session || !session.status || session.status === 'idle') {
    return null;
  }

  const isRunningRound1 = session.status === 'running_round1';
  const isRetrying = session.status === 'retrying_round2';
  const isCompleted = session.status === 'completed';

  const round1CompletedCount = session.round1?.completed?.length || 0;
  const round1FailedCount = session.round1?.failed?.length || 0;
  const retryCompletedCount = session.retry?.completed?.length || 0;
  const retryFailedCount = session.retry?.failed?.length || 0;
  const totalProfiles = session.totalProfiles || 0;
  const summary = session.summary;

  const allPassed = isCompleted && round1FailedCount === 0;

  // Calculate percentage
  let progressPct = 0;
  if (isCompleted) {
    progressPct = 100;
  } else if (isRetrying) {
    const retryTotal = session.retry?.total || 1;
    progressPct = Math.round(((retryCompletedCount + retryFailedCount) / retryTotal) * 100);
  } else if (totalProfiles > 0) {
    progressPct = Math.round(((round1CompletedCount + round1FailedCount) / totalProfiles) * 100);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="glass"
      style={{
        marginBottom: '14px',
        padding: '14px 18px',
        borderRadius: '12px',
        border: isRunningRound1 || isRetrying
          ? '1px solid rgba(59, 130, 246, 0.4)'
          : allPassed
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(245, 158, 11, 0.4)',
        background: isRunningRound1 || isRetrying
          ? 'rgba(59, 130, 246, 0.08)'
          : allPassed
          ? 'rgba(16, 185, 129, 0.08)'
          : 'rgba(245, 158, 11, 0.08)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {isRunningRound1 && (
            <RefreshCw className="animate-spin" size={22} style={{ color: '#3B82F6', flexShrink: 0 }} />
          )}
          {isRetrying && (
            <RotateCcw className="animate-spin" size={22} style={{ color: '#F59E0B', flexShrink: 0 }} />
          )}
          {isCompleted && allPassed && (
            <CheckCircle2 size={22} style={{ color: '#10B981', flexShrink: 0 }} />
          )}
          {isCompleted && !allPassed && (
            <AlertTriangle size={22} style={{ color: '#F59E0B', flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)' }}>
                {session.title || 'Tiến trình upload'}
              </h4>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: isRunningRound1 ? 'rgba(59,130,246,0.2)' : isRetrying ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                  color: isRunningRound1 ? '#60A5FA' : isRetrying ? '#FBBF24' : '#34D399'
                }}
              >
                {isRunningRound1 ? `Lượt 1 (${round1CompletedCount + round1FailedCount}/${totalProfiles})` : isRetrying ? `Lượt Retry (${retryCompletedCount + retryFailedCount}/${session.retry?.total || 0})` : 'Hoàn thành'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.message}
            </p>

            {/* Visual Progress Bar */}
            <div style={{ marginTop: '8px', width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: isRunningRound1 ? '#3B82F6' : isRetrying ? '#F59E0B' : '#10B981',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isCompleted && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '5px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Chi tiết {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(session.id)}
              title="Đóng thông báo này"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable summary breakdown for completed batch runs */}
      <AnimatePresence>
        {isCompleted && showDetails && summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.82rem'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lượt 1:</span>
                <strong style={{ color: '#10B981', marginLeft: '6px' }}>{summary.round1Completed?.length || 0} thành công</strong>,
                <strong style={{ color: summary.round1Failed?.length ? '#EF4444' : 'var(--text)', marginLeft: '4px' }}>
                  {summary.round1Failed?.length || 0} lỗi
                </strong>
              </div>

              {summary.retryCompleted !== undefined && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Lượt Retry:</span>
                  <strong style={{ color: '#10B981', marginLeft: '6px' }}>{summary.retryCompleted?.length || 0} thành công</strong>,
                  <strong style={{ color: summary.retryFailed?.length ? '#EF4444' : 'var(--text)', marginLeft: '4px' }}>
                    {summary.retryFailed?.length || 0} vẫn lỗi
                  </strong>
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng kết:</span>
                <strong style={{ color: '#10B981', marginLeft: '6px' }}>{summary.totalSucceeded}/{summary.totalProfiles} thành công</strong>
              </div>
            </div>

            {summary.finalFailed && summary.finalFailed.length > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                <strong style={{ color: '#EF4444', display: 'block', marginBottom: '4px' }}>Danh sách profile lỗi sau lượt retry:</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text)' }}>
                  {summary.finalFailed.map((p) => (
                    <li key={p.id || p.name}>
                      <strong>{p.name}</strong>: <span style={{ color: 'var(--text-secondary)' }}>{p.error || 'Lỗi không xác định'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BatchStatusBanner = ({ batchStatus, onDismiss }) => {
  if (!batchStatus) return null;

  // Support array of sessions or single object
  const sessions = Array.isArray(batchStatus.sessions) && batchStatus.sessions.length > 0
    ? batchStatus.sessions.filter(s => s && s.status && s.status !== 'idle')
    : batchStatus.status && batchStatus.status !== 'idle'
    ? [batchStatus]
    : [];

  if (sessions.length === 0) return null;

  return (
    <div className="batch-status-container" style={{ marginBottom: '16px' }}>
      <AnimatePresence>
        {sessions.map((session) => (
          <SingleSessionBanner
            key={session.id}
            session={session}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BatchStatusBanner;
