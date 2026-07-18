import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ExerciseProgressChart from './ExerciseProgressChart.jsx';
import { storage } from '../lib/storage.js';
import { getProgressTake } from '../lib/coach.js';

function fingerprintFor(sessions) {
  return `${sessions.length}:${sessions[0]?.id || ''}`;
}

function ProgressScreen({ sessions, program, onDeleteSession }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // session object to delete
  const longPressTimer = useRef(null);
  const [take, setTake] = useState(null); // { text, fingerprint }
  const [takeStatus, setTakeStatus] = useState('idle'); // idle | loading | error
  const [takeCollapsed, setTakeCollapsed] = useState(() => storage.getTakeCollapsed());

  // Exercise name -> logType, from the current program. Exercises no longer
  // in the program (renamed/removed) fall back to 'weight' below.
  const exerciseLogTypes = useMemo(() => {
    const map = {};
    (program?.days || []).forEach(d => {
      (d.exercises || []).forEach(ex => {
        map[ex.name] = ex.logType === 'duration' ? 'duration' : 'weight';
      });
    });
    return map;
  }, [program]);

  useEffect(() => {
    setTake(storage.getCoachTake());
  }, []);

  function toggleTakeCollapsed() {
    setTakeCollapsed(prev => {
      const next = !prev;
      storage.setTakeCollapsed(next);
      return next;
    });
  }

  const currentFingerprint = fingerprintFor(sessions);
  const takeStale = take && take.fingerprint !== currentFingerprint;

  async function handleGetTake() {
    setTakeStatus('loading');
    try {
      const volMap = {};
      sessions.forEach(sess => {
        (sess.exercises || []).forEach(exRef => {
          if (exerciseLogTypes[exRef.name] === 'duration') return;
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

  return (
    <div className="progress-wrap">
      <div className="progress-section">
        <div
          className="progress-section-title"
          style={take ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' } : undefined}
          onClick={take ? toggleTakeCollapsed : undefined}
        >
          <span>Coach's Take</span>
          {take && <span style={{ color: 'var(--muted)' }}>{takeCollapsed ? '▸' : '▾'}</span>}
        </div>
        {!(take && takeCollapsed && takeStatus === 'idle') && (
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
        )}
      </div>

      <ExerciseProgressChart sessions={sessions} exerciseLogTypes={exerciseLogTypes} />

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
