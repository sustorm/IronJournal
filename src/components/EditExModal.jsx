import { useEffect, useRef } from 'react';

export default function EditExModal({ open, exercise, onClose, onSave, onDelete }) {
  const nameRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (open && exercise) {
      if (nameRef.current) nameRef.current.value = exercise.name;
      if (setsRef.current) setsRef.current.value = exercise.sets;
      if (repsRef.current) repsRef.current.value = exercise.reps;
      if (noteRef.current) noteRef.current.value = exercise.note || '';
    }
  }, [open, exercise]);

  function handleSave() {
    onSave({
      name: nameRef.current?.value.trim() || exercise.name,
      sets: parseInt(setsRef.current?.value) || exercise.sets,
      reps: parseInt(repsRef.current?.value) || exercise.reps,
      note: noteRef.current?.value.trim() || '',
    });
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Edit Exercise</div>
        <input ref={nameRef} className="modal-input" placeholder="Exercise name…" />
        <div className="modal-row">
          <span className="modal-label">Sets</span>
          <input ref={setsRef} className="modal-mini" type="number" min="1" max="20" />
          <span className="modal-label">Reps</span>
          <input ref={repsRef} className="modal-mini" type="number" min="1" max="100" />
        </div>
        <input ref={noteRef} className="modal-input" placeholder="Note (optional)…" />
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
      </div>
    </div>
  );
}
