import { useRef, useEffect, useState } from 'react';
import LogTypeToggle from './LogTypeToggle.jsx';
import ReverseProgressToggle from './ReverseProgressToggle.jsx';

export default function AddExModal({ open, onClose, onConfirm }) {
  const nameRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const noteRef = useRef(null);
  const [logType, setLogType] = useState('weight');
  const [reverseProgress, setReverseProgress] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 150);
  }, [open]);

  const REPS_DEFAULT = { weight: '8', duration: '30' };

  function handleLogTypeChange(newType) {
    // Swap the target field to the new mode's default, but only if the user
    // hasn't already typed something else in — don't clobber real input.
    if (repsRef.current?.value === REPS_DEFAULT[logType]) {
      repsRef.current.value = REPS_DEFAULT[newType];
    }
    setLogType(newType);
  }

  function handleConfirm() {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    onConfirm({
      name,
      sets: parseInt(setsRef.current?.value) || 3,
      reps: parseInt(repsRef.current?.value) || 8,
      note: noteRef.current?.value.trim() || '',
      logType,
      reverseProgress: logType === 'weight' && reverseProgress,
    });
    nameRef.current.value = '';
    if (setsRef.current) setsRef.current.value = '3';
    if (repsRef.current) repsRef.current.value = REPS_DEFAULT.weight;
    if (noteRef.current) noteRef.current.value = '';
    setLogType('weight');
    setReverseProgress(false);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Add Exercise</div>
        <input ref={nameRef} className="modal-input" placeholder="Exercise name…" />
        <LogTypeToggle value={logType} onChange={handleLogTypeChange} />
        <div className="modal-row">
          <span className="modal-label">Sets</span>
          <input ref={setsRef} className="modal-mini" type="number" defaultValue="3" min="1" max="20" />
          <span className="modal-label">{logType === 'duration' ? 'Sec' : 'Reps'}</span>
          <input ref={repsRef} className="modal-mini" type="number" defaultValue={REPS_DEFAULT.weight} min="1" max={logType === 'duration' ? 600 : 100} />
        </div>
        {logType === 'weight' && (
          <ReverseProgressToggle value={reverseProgress} onChange={setReverseProgress} />
        )}
        <input ref={noteRef} className="modal-input" placeholder="Note (optional)…" />
        <div className="modal-btns">
          <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleConfirm}>Add Exercise</button>
        </div>
      </div>
    </div>
  );
}
