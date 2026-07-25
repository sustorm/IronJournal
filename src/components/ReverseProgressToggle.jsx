export default function ReverseProgressToggle({ value, onChange }) {
  return (
    <label
      title="Less weight = stronger (e.g. assisted pull-ups)"
      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0 }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
      <span className="modal-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Assisted</span>
    </label>
  );
}
