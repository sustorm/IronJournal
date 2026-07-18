function OptionBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      className="modal-btn secondary"
      style={{
        minHeight: '38px',
        ...(active ? { background: 'var(--accent)', color: '#080810' } : {}),
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function LogTypeToggle({ value, onChange }) {
  return (
    <div className="modal-row" style={{ gap: '8px' }}>
      <span className="modal-label" style={{ flexShrink: 0 }}>Log</span>
      <OptionBtn active={value !== 'duration'} onClick={() => onChange('weight')}>⚖️ Weight</OptionBtn>
      <OptionBtn active={value === 'duration'} onClick={() => onChange('duration')}>⏱️ Duration</OptionBtn>
    </div>
  );
}
