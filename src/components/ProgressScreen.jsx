import { memo, useRef, useState } from 'react';
import ExerciseProgressChart from './ExerciseProgressChart.jsx';

function ProgressScreen({ sessions, onBack, onDeleteSession }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // session object to delete
  const longPressTimer = useRef(null);

  function startLongPress(session) {
    longPressTimer.current = setTimeout(() => setConfirmDelete(session), 500);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
  }
  const volMap = {};
  sessions.forEach(sess => {
    (sess.exercises || []).forEach(exRef => {
      const rows = sess.sets?.[exRef.id] || [];
      const vol = rows.reduce((s, r) => s + (parseFloat(r.weight) || 0) * r.reps, 0);
      if (!vol) return;
      if (!volMap[exRef.name]) volMap[exRef.name] = {};
      volMap[exRef.name][sess.weekKey] = (volMap[exRef.name][sess.weekKey] || 0) + vol;
    });
  });

  const allWeeks = [...new Set(sessions.map(s => s.weekKey))].sort().slice(-6);

  return (
    <div className="progress-wrap">
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'var(--fs-lg)',
        fontStyle: 'italic',
        color: '#eeeeff',
        padding: '4px 0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Progress</span>
        <button onClick={onBack} style={{
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', fontFamily: "'DM Mono', monospace",
          fontSize: 'var(--fs-xs)', letterSpacing: '1px', textTransform: 'uppercase',
          padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>← Back</button>
      </div>

      <ExerciseProgressChart sessions={sessions} />

      <div className="progress-section">
        <div className="progress-section-title">Weekly Volume (lbs) — last 6 weeks</div>
        {Object.keys(volMap).length === 0 ? (
          <div className="hist-empty">No data yet — save some sessions first.</div>
        ) : (
          Object.entries(volMap).map(([name, weeks]) => {
            const vals = allWeeks.map(w => weeks[w] || 0);
            const mx = Math.max(...vals, 1);
            return (
              <div key={name} className="vol-row">
                <div className="vol-ex-name">{name}</div>
                <div className="vol-weeks">
                  {allWeeks.map((w, i) => {
                    const v = vals[i];
                    const pct = Math.round((v / mx) * 100);
                    return (
                      <div key={w} className="vol-week-chip">
                        <div className="vol-week-label">{w.slice(5)}</div>
                        <div className="vol-week-val">
                          {v ? Math.round(v).toLocaleString() : '-'}
                        </div>
                        <div className="vol-bar-wrap">
                          <div className="vol-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="progress-section">
        <div className="progress-section-title">Session History</div>
        {sessions.length === 0 ? (
          <div className="hist-empty">No sessions saved yet.</div>
        ) : (
          sessions.map((s, i) => (
            <div
              key={s.id || i}
              className="hist-row"
              onTouchStart={e => { e.preventDefault(); startLongPress(s); }}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={e => { e.preventDefault(); setConfirmDelete(s); }}
            >
              <span style={{ color: s.color }}>{s.day}</span>
              <span style={{ color: 'var(--muted)' }}>{s.date} · {s.time}</span>
            </div>
          ))
        )}
      </div>
      {confirmDelete && (
        <div className="modal-overlay open" style={{ alignItems: 'center' }} onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete session?</div>
            <div className="modal-sub" style={{ color: confirmDelete.color }}>{confirmDelete.day}</div>
            <div className="modal-sub">{confirmDelete.date} · {confirmDelete.time}</div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="modal-btn modal-btn-delete" onClick={() => { onDeleteSession(confirmDelete.id); setConfirmDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProgressScreen);
