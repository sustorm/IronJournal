import { useState, useMemo } from 'react';

// Computes total volume per session for the selected exercise, chronological order.
// Weight exercises: sum(weight x reps) across sets. Duration exercises: sum(seconds)
// across sets, since a "reps" multiplier doesn't apply to a time-based hold.
function computeData(sessions, exerciseName, logType) {
  return [...sessions]
    .reverse()
    .reduce((acc, sess) => {
      const exRef = (sess.exercises || []).find(e => e.name === exerciseName);
      if (!exRef) return acc;
      const rows = sess.sets?.[exRef.id] || [];
      const value = logType === 'duration'
        ? rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0)
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

function Chart({ data, unit }) {
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
  const trendColor = delta > 0 ? '#4dffaa' : delta < 0 ? '#ff5566' : '#7878a0';
  const trendSymbol = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  return (
    <div>
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
          // Alternate label above/below to avoid overlap when points are close
          const labelY = i % 2 === 0 ? y - 10 : y + 18;
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

export default function ExerciseProgressChart({ sessions, exerciseLogTypes }) {
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
  const unit = isDuration ? 'sec' : 'lbs';

  const data = useMemo(
    () => computeData(sessions, selected, exerciseLogTypes?.[selected]),
    [sessions, selected, exerciseLogTypes]
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
        <Chart data={data} unit={unit} />
      </div>
    </div>
  );
}
