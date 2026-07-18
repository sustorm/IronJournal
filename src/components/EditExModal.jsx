import { useEffect, useRef, useState } from 'react';
import { suggestExerciseSwap } from '../lib/coach.js';
import LogTypeToggle from './LogTypeToggle.jsx';

export default function EditExModal({ open, exercise, day, allDays, onClose, onSave, onDelete, onSwap }) {
  const nameRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const noteRef = useRef(null);
  const [view, setView] = useState('edit');
  const [suggestion, setSuggestion] = useState(null);
  const [logType, setLogType] = useState('weight');

  useEffect(() => {
    if (open && exercise) {
      setView('edit');
      setSuggestion(null);
    }
  }, [open, exercise]);

  // Edit-view inputs are conditionally unmounted (see render below) while the
  // Swap flow shows its loading/confirm views, so they need repopulating
  // every time the modal returns to the edit view — not just on first open.
  useEffect(() => {
    if (view === 'edit' && exercise) {
      if (nameRef.current) nameRef.current.value = exercise.name;
      if (setsRef.current) setsRef.current.value = exercise.sets;
      if (repsRef.current) repsRef.current.value = exercise.reps;
      if (noteRef.current) noteRef.current.value = exercise.note || '';
      setLogType(exercise.logType === 'duration' ? 'duration' : 'weight');
    }
  }, [view, exercise]);

  function handleSave() {
    onSave({
      name: nameRef.current?.value.trim() || exercise.name,
      sets: parseInt(setsRef.current?.value) || exercise.sets,
      reps: parseInt(repsRef.current?.value) || exercise.reps,
      note: noteRef.current?.value.trim() || '',
      logType,
    });
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function fetchSuggestion() {
    setView('loading');
    try {
      const s = await suggestExerciseSwap(exercise, day, allDays);
      setSuggestion(s);
      setView('confirm');
    } catch (e) {
      console.warn('suggestExerciseSwap failed:', e);
      setView('error');
    }
  }

  function handleConfirmSwap() {
    onSwap(suggestion);
    setView('edit');
    setSuggestion(null);
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        {view === 'edit' && (
          <>
            <div className="modal-title">Edit Exercise</div>
            <input ref={nameRef} className="modal-input" placeholder="Exercise name…" />
            <div className="modal-row">
              <span className="modal-label">Sets</span>
              <input ref={setsRef} className="modal-mini" type="number" min="1" max="20" />
              <span className="modal-label">Reps</span>
              <input ref={repsRef} className="modal-mini" type="number" min="1" max="100" />
            </div>
            <LogTypeToggle value={logType} onChange={setLogType} />
            <input ref={noteRef} className="modal-input" placeholder="Note (optional)…" />
            <button className="modal-btn secondary" style={{ width: '100%' }} onClick={fetchSuggestion}>
              🔀 Swap
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
            <div className="modal-title">Finding an alternative…</div>
            <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
          </>
        )}

        {view === 'error' && (
          <>
            <div className="modal-title">Couldn't get a suggestion</div>
            <div className="modal-sub">Connection error — please try again.</div>
            <div className="modal-btns">
              <button className="modal-btn secondary" onClick={() => setView('edit')}>Cancel</button>
              <button className="modal-btn primary" onClick={fetchSuggestion}>Retry</button>
            </div>
          </>
        )}

        {view === 'confirm' && suggestion && (
          <>
            <div className="modal-title">Swap Exercise?</div>
            <div className="modal-sub">{exercise.name} — {exercise.sets}×{exercise.reps}</div>
            <div className="modal-sub" style={{ color: 'var(--accent)' }}>
              → {suggestion.name} — {suggestion.sets}×{suggestion.reps}
              {suggestion.note ? ` · ${suggestion.note}` : ''}
            </div>
            {suggestion.reason && <div className="modal-sub">{suggestion.reason}</div>}
            <button className="modal-btn secondary" style={{ width: '100%' }} onClick={fetchSuggestion}>
              🔀 Try another
            </button>
            <div className="modal-btns">
              <button className="modal-btn secondary" onClick={() => setView('edit')}>Cancel</button>
              <button className="modal-btn primary" onClick={handleConfirmSwap}>Confirm swap</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
