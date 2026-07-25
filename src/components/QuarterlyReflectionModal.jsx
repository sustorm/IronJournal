function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function QuarterlyReflectionModal({ open, status, text, periodStart, periodEnd, onGenerate, onClose }) {
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Quarterly Reflection</div>
        {periodStart && periodEnd && (
          <div className="modal-sub">{formatDate(periodStart)} – {formatDate(periodEnd)}</div>
        )}
        <div>
          {status === 'loading' && (
            <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
          )}
          {status === 'error' && (
            <div className="hist-empty" style={{ padding: 0 }}>Connection error — please try again.</div>
          )}
          {status === 'idle' && text && (
            <div style={{ color: 'var(--text)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-body)', whiteSpace: 'pre-wrap' }}>
              {text}
            </div>
          )}
          {status === 'idle' && !text && (
            <div className="hist-empty" style={{ padding: 0 }}>Tap below to generate your reflection.</div>
          )}
        </div>
        <div className="modal-btns">
          <button className="modal-btn secondary" onClick={onClose}>Close</button>
          <button className="modal-btn primary" onClick={onGenerate} disabled={status === 'loading'}>
            {status === 'loading' ? 'Generating…' : text ? '🔄 Regenerate' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
