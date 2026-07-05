import { memo, useEffect, useRef, useState } from 'react';
import ExerciseProgressChart from './ExerciseProgressChart.jsx';
import { storage } from '../lib/storage.js';
import { getProgressTake } from '../lib/coach.js';

function fingerprintFor(sessions) {
  return `${sessions.length}:${sessions[0]?.id || ''}`;
}

function ProgressScreen({ sessions, onBack, onDeleteSession }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // session object to delete
  const longPressTimer = useRef(null);
  const [take, setTake] = useState(null); // { text, fingerprint }
  const [takeStatus, setTakeStatus] = useState('idle'); // idle | loading | error

  useEffect(() => {
    setTake(storage.getCoachTake());
  }, []);

  const currentFingerprint = fingerprintFor(sessions);
  const takeStale = take && take.fingerprint !== currentFingerprint;

  async function handleGetTake() {
    setTakeStatus('loading');
    try {
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
      const weeks = [...new Set(sessions.map(s => s.weekKey))].sort().slice(-6);
      let summary = `Sessions logged: ${sessions.length}`;
      if (sessions.length) {
        summary += ` (most recent: ${sessions[0].date}, oldest of last 6 weeks: ${sessions[sessions.length - 1].date})`;
      }
      summary += '\nWeekly volume (lbs, weight x reps) by exercise, last 6 weeks:\n';
      Object.entries(volMap).forEach(([name, weekVols]) => {
        summary += `${name}: ` + weeks.map(w => `${w}=${Math.round(weekVols[w] || 0)}`).join(', ') + '\n';
      });
      const text = await getProgressTake(summary);
      const next = { text, fingerprint: currentFingerprint };
      setTake(next);
      storage.setCoachTake(next);
      setTakeStatus('idle');
    } catch (e) {
      console.warn('getProgressTake failed:', e);
      setTakeStatus('error');
    }
  }

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

      <div className="progress-section">
        <div className="progress-section-title">Coach's Take</div>
        <div style={{ padding: '14px 16px' }}>
          {takeStatus === 'loading' && (
            <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
          )}
          {takeStatus === 'error' && (
            <>
              <div className="hist-empty" style={{ padding: 0, marginBottom: '10px' }}>
                Connection error — please try again.
              </div>
              <button className="chat-apply-btn" onClick={handleGetTake}>Retry</button>
            </>
          )}
          {takeStatus === 'idle' && take && (
            <>
              <div style={{ color: 'var(--text)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-body)' }}>
                {take.text}
              </div>
              {takeStale && (
                <div className="modal-sub" style={{ marginTop: '8px' }}>Based on older data.</div>
              )}
              <button className="chat-apply-btn" style={{ marginTop: '10px' }} onClick={handleGetTake}>
                🔄 Refresh
              </button>
            </>
          )}
          {takeStatus === 'idle' && !take && (
            <button className="chat-apply-btn" onClick={handleGetTake}>Get Coach's Take</button>
          )}
        </div>
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
