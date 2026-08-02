import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ExerciseProgressChart from './ExerciseProgressChart.jsx';
import SessionDetailModal from './SessionDetailModal.jsx';
import QuarterlyReflectionModal from './QuarterlyReflectionModal.jsx';
import { storage } from '../lib/storage.js';
import { getProgressTake, getQuarterlyReflection } from '../lib/coach.js';
import { sortSessionsByWeek } from '../lib/helpers.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';

const REFLECTION_INTERVAL_DAYS = 90;
const REFLECTION_SNOOZE_DAYS = 7;
const REFLECTION_MIN_HISTORY_DAYS = 30; // don't prompt a brand-new user with barely any data

function fingerprintFor(sessions) {
  return `${sessions.length}:${sessions[0]?.id || ''}`;
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

// Total volume per exercise, first vs. last logged value within the period —
// used as an approximate PR/trend indicator for the reflection, not a single
// session's snapshot like Coach's Take.
function buildReflectionSummary(sessions, exerciseLogTypes, exerciseReverseProgress, periodStart) {
  const inPeriod = sessions.filter(s => new Date(s.date) >= periodStart);
  const weekKeys = new Set(inPeriod.map(s => s.weekKey));
  const perExercise = {};
  inPeriod.forEach(sess => {
    (sess.exercises || []).forEach(exRef => {
      const isDuration = exerciseLogTypes[exRef.name] === 'duration';
      const rows = sess.sets?.[exRef.id] || [];
      const value = isDuration
        ? rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0)
        : rows.reduce((s, r) => s + (parseFloat(r.weight) || 0) * r.reps, 0);
      if (!value) return;
      if (!perExercise[exRef.name]) perExercise[exRef.name] = [];
      perExercise[exRef.name].push({ date: sess.date, weekKey: sess.weekKey, value });
    });
  });
  Object.keys(perExercise).forEach(name => {
    perExercise[name] = sortSessionsByWeek(perExercise[name]);
  });

  const avgPerWeek = weekKeys.size ? (inPeriod.length / weekKeys.size).toFixed(1) : '0';
  let summary = `Period: ${periodStart.toLocaleDateString()} to ${new Date().toLocaleDateString()}\n`;
  summary += `Sessions logged: ${inPeriod.length} across ${weekKeys.size} distinct week${weekKeys.size === 1 ? '' : 's'} (~${avgPerWeek} sessions/week average)\n\n`;
  summary += 'Per-exercise trend (first logged volume this period -> last logged volume this period):\n';
  Object.entries(perExercise).forEach(([name, arr]) => {
    const tag = exerciseReverseProgress[name] ? ' [ASSISTED]' : '';
    const unit = exerciseLogTypes[name] === 'duration' ? 'sec' : 'lbs (vol)';
    summary += `${name}${tag}: ${Math.round(arr[0].value)} -> ${Math.round(arr[arr.length - 1].value)} ${unit} (${arr.length} sessions)\n`;
  });
  return summary;
}

function ProgressScreen({ sessions, program, onDeleteSession, memory, reflection, onReflectionUpdate }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // session object to delete
  const [detailSession, setDetailSession] = useState(null); // session object to view
  useBodyScrollLock(!!confirmDelete); // SessionDetailModal locks its own separately
  const longPressTimer = useRef(null);
  const longPressFiredRef = useRef(false);
  const touchMovedRef = useRef(false);
  const [take, setTake] = useState(null); // { text, fingerprint }
  const [takeStatus, setTakeStatus] = useState('idle'); // idle | loading | error
  const [takeCollapsed, setTakeCollapsed] = useState(() => storage.getTakeCollapsed());
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [reflectionStatus, setReflectionStatus] = useState('idle'); // idle | loading | error

  // Exercise name -> logType/reverseProgress, from the current program.
  // Exercises no longer in the program (renamed/removed) fall back below.
  const { exerciseLogTypes, exerciseReverseProgress } = useMemo(() => {
    const logTypes = {};
    const reverse = {};
    (program?.days || []).forEach(d => {
      (d.exercises || []).forEach(ex => {
        logTypes[ex.name] = ex.logType === 'duration' ? 'duration' : 'weight';
        reverse[ex.name] = !!ex.reverseProgress;
      });
    });
    return { exerciseLogTypes: logTypes, exerciseReverseProgress: reverse };
  }, [program]);

  const sortedByWeek = useMemo(() => sortSessionsByWeek(sessions), [sessions]);

  const reflectionDue = useMemo(() => {
    if (!sessions.length) return false;
    if (reflection?.lastSnoozedAt && daysSince(reflection.lastSnoozedAt) < REFLECTION_SNOOZE_DAYS) return false;
    if (reflection?.lastGeneratedAt) return daysSince(reflection.lastGeneratedAt) >= REFLECTION_INTERVAL_DAYS;
    const earliest = sortedByWeek[0];
    return !!earliest && daysSince(earliest.date) >= REFLECTION_MIN_HISTORY_DAYS;
  }, [sessions, reflection, sortedByWeek]);

  const isFirstReflection = !reflection?.lastGeneratedAt;

  function getReflectionPeriodStart() {
    if (reflection?.lastGeneratedAt) return new Date(reflection.lastGeneratedAt);
    const earliest = sortedByWeek[0];
    return earliest ? new Date(earliest.date) : new Date(Date.now() - REFLECTION_INTERVAL_DAYS * 86400000);
  }

  async function handleGenerateReflection() {
    setReflectionStatus('loading');
    try {
      const periodStart = getReflectionPeriodStart();
      const summary = buildReflectionSummary(sessions, exerciseLogTypes, exerciseReverseProgress, periodStart);
      const text = await getQuarterlyReflection(summary, memory);
      onReflectionUpdate({
        lastGeneratedAt: new Date().toISOString(),
        lastSnoozedAt: null,
        text,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date().toISOString(),
      });
      setReflectionStatus('idle');
    } catch (e) {
      console.warn('getQuarterlyReflection failed:', e);
      setReflectionStatus('error');
    }
  }

  function handleSnoozeReflection(e) {
    e.stopPropagation();
    onReflectionUpdate({ ...(reflection || {}), lastSnoozedAt: new Date().toISOString() });
  }

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
      // Only the weeks that actually have logged sessions — never assume a
      // fixed 6-week window when the real history is shorter than that.
      const weeks = [...new Set(sessions.map(s => s.weekKey))].sort().slice(-6);
      const weekLabel = weeks.length === 1 ? '1 week' : `${weeks.length} weeks`;
      let summary = `Sessions logged: ${sessions.length}`;
      if (sessions.length) {
        // Sorted by weekKey (a reliable YYYY-MM-DD string) rather than trusting
        // the incoming array's order, which isn't guaranteed oldest/newest-first.
        const oldestSession = sortedByWeek[0];
        const newestSession = sortedByWeek[sortedByWeek.length - 1];
        const daySpan = Math.max(1, Math.round((new Date(newestSession.date) - new Date(oldestSession.date)) / 86400000) + 1);
        summary += ` (most recent: ${newestSession.date}, oldest shown: ${oldestSession.date} — actual span: ${daySpan} calendar day${daySpan === 1 ? '' : 's'} across ${weekLabel}. Do not assume a longer history than this.)`;
      }
      summary += `\nWeekly volume (lbs, weight x reps) by exercise, ${weekLabel} with logged data:\n`;
      Object.entries(volMap).forEach(([name, weekVols]) => {
        const reverseNote = exerciseReverseProgress[name] ? ' [ASSISTED — LESS weight = stronger, so DECREASING volume here is improvement, not decline]' : '';
        summary += `${name}${reverseNote}: ` + weeks.map(w => `${w}=${Math.round(weekVols[w] || 0)}`).join(', ') + '\n';
      });
      const text = await getProgressTake(summary, memory);
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
    longPressFiredRef.current = false;
    touchMovedRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setConfirmDelete(session);
    }, 500);
  }

  function cancelLongPressForMove() {
    touchMovedRef.current = true;
    clearTimeout(longPressTimer.current);
  }

  // A tap that's neither a long-press (delete) nor a scroll opens the detail view.
  function endLongPress(session) {
    clearTimeout(longPressTimer.current);
    if (!longPressFiredRef.current && !touchMovedRef.current) {
      setDetailSession(session);
    }
  }

  return (
    <div className="progress-wrap">
      {reflectionDue && (
        <div
          className="progress-section"
          style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer' }}
          onClick={() => setReflectionModalOpen(true)}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
              🗓️ Ready for {isFirstReflection ? 'your first check-in' : 'a quarterly check-in'}?
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginTop: '2px' }}>Tap for a deeper look at your progress</div>
          </div>
          <button
            onClick={handleSnoozeReflection}
            aria-label="Not now"
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}
      {!reflectionDue && reflection?.text && (
        <div
          className="progress-section"
          style={{ padding: '14px 16px', cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}
          onClick={() => setReflectionModalOpen(true)}
        >
          📄 Quarterly reflection available — tap to view
        </div>
      )}
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

      <ExerciseProgressChart
        sessions={sessions}
        exerciseLogTypes={exerciseLogTypes}
        exerciseReverseProgress={exerciseReverseProgress}
      />

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
              onTouchEnd={() => endLongPress(s)}
              onTouchMove={cancelLongPressForMove}
              onClick={() => setDetailSession(s)}
              onContextMenu={e => { e.preventDefault(); setConfirmDelete(s); }}
              style={{ cursor: 'pointer' }}
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
      <SessionDetailModal
        session={detailSession}
        exerciseLogTypes={exerciseLogTypes}
        onClose={() => setDetailSession(null)}
      />
      <QuarterlyReflectionModal
        open={reflectionModalOpen}
        status={reflectionStatus}
        text={reflection?.text}
        periodStart={reflection?.periodStart}
        periodEnd={reflection?.periodEnd}
        onGenerate={handleGenerateReflection}
        onClose={() => setReflectionModalOpen(false)}
      />
    </div>
  );
}

export default memo(ProgressScreen);
