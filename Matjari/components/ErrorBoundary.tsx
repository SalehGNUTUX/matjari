import React from 'react';

interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('Matjari Error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: '#0a0f1a', color: '#fff',
        padding: '2rem', textAlign: 'center',
        fontFamily: 'Cairo, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '0.5rem' }}>
          حدث خطأ في التطبيق
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '2rem', maxWidth: '300px' }}>
          {this.state.error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: '14px', padding: '12px 28px',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif'
          }}>
          🔄 إنعاش التطبيق
        </button>
      </div>
    );
  }
}
