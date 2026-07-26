import { useEffect, useRef, useState } from 'react';
import { suggestExerciseSwap } from '../lib/coach.js';
import LogTypeToggle from './LogTypeToggle.jsx';
import ReverseProgressToggle from './ReverseProgressToggle.jsx';

function demoUrl(name) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise form tutorial`)}`;
}

export default function EditExModal({ open, exercise, day, allDays, onClose, onSave, onDelete, onSwap }) {
  const nameRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const noteRef = useRef(null);
  const [view, setView] = useState('edit');
  const [suggestions, setSuggestions] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [logType, setLogType] = useState('weight');
  const [reverseProgress, setReverseProgress] = useState(false);
  const [triedNames, setTriedNames] = useState([]);
  const rowRefs = useRef([]);

  // Scroll a just-expanded row's full content (including the confirm button)
  // into view within the modal's own scroll — no nested scroll region to
  // fight with, so this always lands on the right target.
  useEffect(() => {
    if (expandedIdx !== null) {
      rowRefs.current[expandedIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expandedIdx]);

  useEffect(() => {
    if (open && exercise) {
      setView('edit');
      setSuggestions(null);
      setExpandedIdx(null);
      setTriedNames([]);
    }
  }, [open, exercise]);

  // Edit-view inputs are conditionally unmounted (see render below) while the
  // Swap flow shows its loading/list views, so they need repopulating every
  // time the modal returns to the edit view — not just on first open.
  useEffect(() => {
    if (view === 'edit' && exercise) {
      if (nameRef.current) nameRef.current.value = exercise.name;
      if (setsRef.current) setsRef.current.value = exercise.sets;
      if (repsRef.current) repsRef.current.value = exercise.reps;
      if (noteRef.current) noteRef.current.value = exercise.note || '';
      setLogType(exercise.logType === 'duration' ? 'duration' : 'weight');
      setReverseProgress(!!exercise.reverseProgress);
    }
  }, [view, exercise]);

  function handleSave() {
    onSave({
      name: nameRef.current?.value.trim() || exercise.name,
      sets: parseInt(setsRef.current?.value) || exercise.sets,
      reps: parseInt(repsRef.current?.value) || exercise.reps,
      note: noteRef.current?.value.trim() || '',
      logType,
      reverseProgress: logType === 'weight' && reverseProgress,
    });
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function fetchSuggestions() {
    setView('loading');
    try {
      const list = await suggestExerciseSwap(exercise, day, allDays, triedNames);
      setSuggestions(list);
      setExpandedIdx(null);
      setTriedNames(prev => [...prev, ...list.map(s => s.name)]);
      setView('list');
    } catch (e) {
      console.warn('suggestExerciseSwap failed:', e);
      setErrorMessage(e.message || 'Connection error — please try again.');
      setView('error');
    }
  }

  function handleConfirmSwap(suggestion) {
    onSwap(suggestion);
    setView('edit');
    setSuggestions(null);
    setExpandedIdx(null);
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        {view === 'edit' && (
          <>
            <div className="modal-title">Edit Exercise</div>
            <input ref={nameRef} className="modal-input" placeholder="Exercise name…" />
            <LogTypeToggle value={logType} onChange={setLogType} />
            <div className="modal-row">
              <span className="modal-label">Sets</span>
              <input ref={setsRef} className="modal-mini" type="number" min="1" max="20" />
              <span className="modal-label">{logType === 'duration' ? 'Sec' : 'Reps'}</span>
              <input ref={repsRef} className="modal-mini" type="number" min="1" max={logType === 'duration' ? 600 : 100} />
              {logType === 'weight' && (
                <ReverseProgressToggle value={reverseProgress} onChange={setReverseProgress} />
              )}
            </div>
            <input ref={noteRef} className="modal-input" placeholder="Note (optional)…" />
            <button className="modal-btn secondary" style={{ width: '100%' }} onClick={fetchSuggestions}>
              🔀 Find Alternatives
            </button>
            <div className="modal-btns">
              <button
                className="modal-btn secondary"
                style={{ background: 'rgba(255,85,102,.15)', color: 'var(--danger)' }}
                onClick={onDelete}
              >
                Delete
              </button>
              <button className="modal-btn primary" onClick={handleSave}>Save</button>
            </div>
          </>
        )}

        {view === 'loading' && (
          <>
            <div className="modal-title">Finding alternatives…</div>
            <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
          </>
        )}

        {view === 'error' && (
          <>
            <div className="modal-title">Couldn't get suggestions</div>
            <div className="modal-sub">{errorMessage || 'Connection error — please try again.'}</div>
            <div className="modal-btns">
              <button className="modal-btn secondary" onClick={() => setView('edit')}>Cancel</button>
              <button className="modal-btn primary" onClick={fetchSuggestions}>Retry</button>
            </div>
          </>
        )}

        {view === 'list' && suggestions && (
          <>
            <div className="modal-title">Swap Exercise?</div>
            <div className="modal-sub">
              Replacing: {exercise.name} — {exercise.sets}×{exercise.reps}{exercise.logType === 'duration' ? ' sec' : ''}
            </div>
            {/* This is the ONLY scrolling region in this view — the confirm
                button below lives outside it in a pinned footer, so it's
                always on-screen regardless of device height, safe-area
                insets, or how tall an expanded row's content gets. */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestions.map((s, i) => {
                const expanded = expandedIdx === i;
                return (
                  <div
                    key={i}
                    ref={el => (rowRefs.current[i] = el)}
                    style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}
                  >
                    <button
                      onClick={() => setExpandedIdx(expanded ? null : i)}
                      style={{
                        width: '100%', textAlign: 'left', background: expanded ? 'var(--faint)' : 'transparent',
                        border: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 'var(--fs-sm)',
                      }}
                    >
                      <span>{i + 1}. {s.name}</span>
                      <span style={{ color: 'var(--muted)' }}>{expanded ? '▾' : '▸'}</span>
                    </button>
                    {expanded && (
                      <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="modal-sub" style={{ color: 'var(--accent)' }}>
                          {s.sets}×{s.reps}{s.logType === 'duration' ? ' sec' : ''}{s.note ? ` · ${s.note}` : ''}
                        </div>
                        {s.reason && <div className="modal-sub">{s.reason}</div>}
                        <a
                          href={demoUrl(s.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', fontSize: 'var(--fs-xs)', color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          ▶ Watch a demo
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '2px' }}>
              {expandedIdx !== null && (
                <button
                  className="modal-btn primary"
                  style={{ width: '100%' }}
                  onClick={() => handleConfirmSwap(suggestions[expandedIdx])}
                >
                  Swap in {suggestions[expandedIdx].name}
                </button>
              )}
              <button className="modal-btn secondary" style={{ width: '100%' }} onClick={fetchSuggestions}>
                🔄 More options
              </button>
              <button className="modal-btn secondary" style={{ width: '100%' }} onClick={() => { setView('edit'); setSuggestions(null); setExpandedIdx(null); }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
