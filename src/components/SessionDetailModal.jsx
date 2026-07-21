function ExerciseRows({ ex, session, isDuration }) {
  const rows = (session.sets?.[ex.id] || [])
    .filter(r => isDuration ? (parseFloat(r.weight) || 0) > 0 : r.reps > 0);
  if (!rows.length) return null;

  return (
    <div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 'var(--fs-base)',
        color: 'var(--text)', marginBottom: '4px',
      }}>
        {ex.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            fontSize: 'var(--fs-sm)', color: 'var(--muted)',
            fontFamily: "'DM Mono', monospace",
          }}>
            Set {i + 1}: {isDuration ? `${r.weight} sec` : `${r.weight || 'bw'} lbs × ${r.reps}`}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SessionDetailModal({ session, exerciseLogTypes, onClose }) {
  const open = !!session;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const exercises = session?.exercises || [];
  const hasAnyLoggedSets = exercises.some(ex => {
    const isDuration = exerciseLogTypes?.[ex.name] === 'duration';
    const rows = session.sets?.[ex.id] || [];
    return rows.some(r => isDuration ? (parseFloat(r.weight) || 0) > 0 : r.reps > 0);
  });

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      {session && (
        <div className="modal">
          <div className="modal-title" style={{ color: session.color }}>{session.day}</div>
          <div className="modal-sub">{session.date} · {session.time}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto' }}>
            {hasAnyLoggedSets ? (
              exercises.map(ex => (
                <ExerciseRows
                  key={ex.id}
                  ex={ex}
                  session={session}
                  isDuration={exerciseLogTypes?.[ex.name] === 'duration'}
                />
              ))
            ) : (
              <div className="hist-empty" style={{ padding: 0 }}>No sets logged for this session.</div>
            )}
          </div>
          <button className="modal-btn primary" onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
}
