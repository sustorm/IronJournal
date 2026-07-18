import { useRef, useState, useEffect } from 'react';
import { submitBugReport, copyPayloadToClipboard } from '../lib/bugReport.js';

export default function BugReportModal({ open, onClose, showToast }) {
  const descRef = useRef(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => descRef.current?.focus(), 150);
  }, [open]);

  async function handleSubmit() {
    setSending(true);
    const description = descRef.current?.value.trim() || '';
    const result = await submitBugReport(description);
    setSending(false);
    if (result.ok) {
      showToast('Bug report sent — thanks!');
    } else {
      const copied = await copyPayloadToClipboard(result.payload);
      showToast(copied ? 'Send failed — details copied to clipboard' : 'Send failed');
    }
    if (descRef.current) descRef.current.value = '';
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Report a Bug</div>
        <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-xs)', marginTop: '-8px' }}>
          This attaches your current program, sets, sessions, and recent app errors automatically.
        </div>
        <textarea
          ref={descRef}
          className="modal-input"
          placeholder="What happened? (optional)"
          rows={4}
          style={{ resize: 'vertical', fontFamily: "'DM Mono', monospace" }}
        />
        <div className="modal-btns">
          <button className="modal-btn secondary" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="modal-btn primary" onClick={handleSubmit} disabled={sending}>
            {sending ? 'Sending…' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
