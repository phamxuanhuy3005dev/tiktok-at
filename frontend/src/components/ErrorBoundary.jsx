import { AlertTriangle, RotateCcw } from 'lucide-react';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg, #0f172a)',
            color: 'var(--text, #f8fafc)',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            className="glass"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.05)',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Đã xảy ra lỗi giao diện
            </h2>

            <p
              style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              {this.state.error?.message ||
                'Một lỗi không mong muốn đã xảy ra khi tải trang.'}
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
