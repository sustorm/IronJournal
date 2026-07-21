export default function ReverseProgressToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className="modal-btn secondary"
      style={{
        width: '100%',
        fontSize: 'var(--fs-xs)',
        letterSpacing: '0.5px',
        textTransform: 'none',
        fontWeight: 400,
        ...(value ? { background: 'var(--accent)', color: '#080810' } : {}),
      }}
      onClick={() => onChange(!value)}
    >
      {value ? '✓ ' : ''}⬇️ Less weight = stronger (assisted exercises)
    </button>
  );
}
