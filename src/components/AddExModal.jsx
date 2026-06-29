import { useRef, useEffect } from 'react';

export default function AddExModal({ open, onClose, onConfirm }) {
  const nameRef = useRef(null);
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 150);
  }, [open]);

  function handleConfirm() {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    onConfirm({
      name,
      sets: parseInt(setsRef.current?.value) || 3,
      reps: parseInt(repsRef.current?.value) || 8,
      note: noteRef.current?.value.trim() || '',
    });
    nameRef.current.value = '';
    if (setsRef.current) setsRef.current.value = '3';
    if (repsRef.current) repsRef.current.value = '8';
    if (noteRef.current) noteRef.current.value = '';
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Add Exercise</div>
        <input ref={nameRef} className="modal-input" placeholder="Exercise name…" />
        <div className="modal-row">
          <span className="modal-label">Sets</span>
          <input ref={setsRef} className="modal-mini" type="number" defaultValue="3" min="1" max="20" />
          <span className="modal-label">Reps</span>
          <input ref={repsRef} className="modal-mini" type="number" defaultValue="8" min="1" max="100" />
        </div>
        <input ref={noteRef} className="modal-input" placeholder="Note (optional)…" />
        <div className="modal-btns">
          <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleConfirm}>Add Exercise</button>
        </div>
      </div>
    </div>
  );
}
