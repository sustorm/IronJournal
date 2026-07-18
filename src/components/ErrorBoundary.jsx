import { Component } from 'react';
import { submitBugReport, copyPayloadToClipboard } from '../lib/bugReport.js';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, status: 'idle' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render crash caught by ErrorBoundary:', error, info?.componentStack);
  }

  handleReport = async () => {
    this.setState({ status: 'sending' });
    const result = await submitBugReport('Auto-captured: app crashed', this.state.error);
    if (result.ok) {
      this.setState({ status: 'sent' });
    } else {
      await copyPayloadToClipboard(result.payload);
      this.setState({ status: 'copied' });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--fs-lg)', fontStyle: 'italic' }}>
          Something broke.
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)', maxWidth: '320px' }}>
          Your data is safe — this only affects the current screen. Reload to try again, or send a bug report first so this can be fixed.
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button className="modal-btn secondary" onClick={this.handleReport} disabled={this.state.status === 'sending'}>
            {this.state.status === 'sent' ? '✓ Sent' : this.state.status === 'copied' ? '✓ Copied' : this.state.status === 'sending' ? 'Sending…' : 'Report Bug'}
          </button>
          <button className="modal-btn primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
