export default function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px',
    }}>
      <div style={{
        fontFamily: 'Oswald, sans-serif', fontWeight: 700,
        fontSize: '28px', letterSpacing: '3px', textTransform: 'uppercase',
      }}>
        <span style={{ color: 'var(--accent)' }}>IRON</span>{' '}
        <span style={{ color: '#e0e0ee' }}>JOURNAL</span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div className="dot" /><div className="dot" /><div className="dot" />
      </div>
    </div>
  );
}
