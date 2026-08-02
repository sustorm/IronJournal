import { useState, useMemo } from 'react';
import { sortSessionsByWeek, assistAnchor, assistedEffectiveValue } from '../lib/helpers.js';

// Computes total volume per session for the selected exercise, chronological order.
// Weight exercises: sum(weight x reps) across sets. Duration exercises: sum(seconds)
// across sets, since a "reps" multiplier doesn't apply to a time-based hold. Assisted
// exercises use effective load (see assistedEffectiveValue) instead of raw volume, so
// the resulting number is always "higher is stronger" like everything else.
function computeData(sessions, exerciseName, logType, reverseProgress, anchor) {
  return sortSessionsByWeek(sessions)
    .reduce((acc, sess) => {
      const exRef = (sess.exercises || []).find(e => e.name === exerciseName);
      if (!exRef) return acc;
      const rows = sess.sets?.[exRef.id] || [];
      const value = logType === 'duration'
        ? rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0)
        : reverseProgress
          ? assistedEffectiveValue(rows, anchor)
          : rows.reduce((s, r) => s + (parseFloat(r.weight) || 0) * r.reps, 0);
      if (!value) return acc;
      acc.push({ label: sess.date, value });
      return acc;
    }, [])
    .slice(-10);
}

const VB_W = 400;
const VB_H = 160;
const PAD = { top: 28, right: 16, bottom: 36, left: 16 };
const IW = VB_W - PAD.left - PAD.right;
const IH = VB_H - PAD.top - PAD.bottom;

// Keyed by bodyweight at the call site so an external change (e.g. loaded
// from Supabase after mount) remounts this with a fresh initial value,
// instead of syncing local state to a prop via an effect.
function BodyweightEditor({ bodyweight, onSave }) {
  const [value, setValue] = useState(bodyweight ?? '');
  const [editing, setEditing] = useState(false);

  function commit() {
    setEditing(false);
    const n = parseFloat(value);
    if (!isNaN(n) && n > 0 && n !== bodyweight) onSave(n);
    else setValue(bodyweight ?? '');
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--accent)', fontSize: 'var(--fs-xs)', fontFamily: "'DM Mono', monospace",
          textDecoration: 'underline', textUnderlineOffset: '2px',
        }}
      >
        {bodyweight ? `Bodyweight: ${bodyweight} lbs (edit)` : 'Set your bodyweight for more accurate tracking'}
      </button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="number"
        inputMode="decimal"
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        style={{
          width: '60px', background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '6px', color: 'var(--text)', fontFamily: "'DM Mono', monospace",
          fontSize: 'var(--fs-xs)', padding: '4px 6px', outline: 'none',
        }}
      />
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>lbs</span>
    </span>
  );
}

function Chart({ data, unit, reverseProgress, bodyweight, onBodyweightUpdate }) {
  if (data.length < 2) {
    return (
      <div style={{ padding: '12px 0 4px', color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>
        {data.length === 0
          ? 'No data for this exercise yet.'
          : 'Need at least 2 sessions to show a trend.'}
      </div>
    );
  }

  const n = data.length;
  const maxW = Math.max(...data.map(d => d.value));
  const minW = Math.min(...data.map(d => d.value));
  const range = maxW - minW || 1;

  function px(i) {
    return n === 1 ? PAD.left + IW / 2 : PAD.left + (i / (n - 1)) * IW;
  }
  function py(w) {
    // Map value to y: top = max, bottom = min, with some breathing room
    return PAD.top + IH - ((w - minW) / range) * IH;
  }

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.value)}`).join(' ');
  const areaPath =
    `M${px(0)},${PAD.top + IH} ` +
    data.map((d, i) => `L${px(i)},${py(d.value)}`).join(' ') +
    ` L${px(n - 1)},${PAD.top + IH} Z`;

  const first = data[0].value;
  const last = data[n - 1].value;
  const delta = last - first;
  // "value" is already transformed into effective load for assisted exercises
  // (see assistedEffectiveValue), so up is always "stronger" — no more sign
  // flipping needed here.
  const improving = delta > 0;
  const declining = delta < 0;
  const trendColor = improving ? '#4dffaa' : declining ? '#ff5566' : '#7878a0';
  const trendSymbol = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  return (
    <div>
      {reverseProgress && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginBottom: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span>Assisted — showing effective load, so higher is still stronger</span>
          <BodyweightEditor key={bodyweight ?? 'unset'} bodyweight={bodyweight} onSave={onBodyweightUpdate} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', fontWeight: 500 }}>
          {Math.round(last).toLocaleString()} {unit}
        </span>
        <span style={{ fontSize: 'var(--fs-xs)', color: trendColor, letterSpacing: '0.5px' }}>
          {trendSymbol} {Math.round(Math.abs(delta)).toLocaleString()} {unit} from first session
        </span>
      </div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="pgAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4dffaa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4dffaa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid lines at min, mid, max */}
        {[0, 0.5, 1].map(t => (
          <line
            key={t}
            x1={PAD.left} y1={PAD.top + IH - t * IH}
            x2={PAD.left + IW} y2={PAD.top + IH - t * IH}
            stroke="#222235" strokeWidth="1"
          />
        ))}

        {/* area fill */}
        <path d={areaPath} fill="url(#pgAreaGrad)" />

        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="#4dffaa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* dots + labels */}
        {data.map((d, i) => {
          const x = px(i);
          const y = py(d.value);
          // Alternate above/below by default (keeps adjacent labels from
          // overlapping each other), but a "below" placement is only used if
          // it actually clears the date-axis row beneath it — otherwise fall
          // back to "above", regardless of how low this point sits in the
          // chart. Index-based alternation alone let a low point's label land
          // right on top of its own date tick.
          const belowY = y + 18;
          const clearsAxis = (PAD.top + IH + 20) - belowY >= 12;
          const labelY = (i % 2 !== 0 && clearsAxis) ? belowY : y - 10;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="#4dffaa" />
              <circle cx={x} cy={y} r="2.5" fill="#080810" />
              <text
                x={x} y={labelY}
                textAnchor="middle"
                fontSize="9"
                fontFamily="'DM Mono', monospace"
                fill="#7878a0"
              >
                {Math.round(d.value).toLocaleString()}
              </text>
              <text
                x={x} y={PAD.top + IH + 20}
                textAnchor="middle"
                fontSize="9"
                fontFamily="'DM Mono', monospace"
                fill="#7878a0"
              >
                {d.label.replace(/\/\d{4}$/, '')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ExerciseProgressChart({ sessions, exerciseLogTypes, exerciseReverseProgress, bodyweight, onBodyweightUpdate }) {
  // Only offer exercises with at least 2 logged entries — anything with
  // fewer can't show a trend anyway (see Chart's own "need 2 sessions" state).
  const exercises = useMemo(() => {
    const counts = new Map();
    sessions.forEach(sess => {
      (sess.exercises || []).forEach(exRef => {
        const rows = sess.sets?.[exRef.id] || [];
        const hasEntry = rows.some(r => (parseFloat(r.weight) || 0) > 0);
        if (!hasEntry) return;
        counts.set(exRef.name, (counts.get(exRef.name) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([name]) => name)
      .sort();
  }, [sessions]);

  const [selected, setSelected] = useState(() => exercises[0] || '');

  const isDuration = exerciseLogTypes?.[selected] === 'duration';
  const reverseProgress = !isDuration && !!exerciseReverseProgress?.[selected];
  const unit = isDuration ? 'sec' : reverseProgress ? 'eff. lbs' : 'lbs';

  const anchor = useMemo(
    () => (reverseProgress ? assistAnchor(sessions, selected, bodyweight) : null),
    [sessions, selected, bodyweight, reverseProgress]
  );

  const data = useMemo(
    () => computeData(sessions, selected, exerciseLogTypes?.[selected], reverseProgress, anchor),
    [sessions, selected, exerciseLogTypes, reverseProgress, anchor]
  );

  if (!exercises.length) return null;

  return (
    <div className="progress-section">
      <div className="progress-section-title">Exercise Progress (total {isDuration ? 'time' : 'volume'} per session)</div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 'var(--fs-sm)',
              padding: '9px 36px 9px 12px',
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            {exercises.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--muted)',
            fontSize: '12px',
            lineHeight: 1,
          }}>▾</span>
        </div>
        <Chart data={data} unit={unit} reverseProgress={reverseProgress} bodyweight={bodyweight} onBodyweightUpdate={onBodyweightUpdate} />
      </div>
    </div>
  );
}
