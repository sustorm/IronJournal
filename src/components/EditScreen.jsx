import { useRef, useEffect, useCallback } from 'react';

// Drag-to-reorder for a single exercise list.
// Mirrors the vanilla JS logic: 300ms long-press to arm, movement threshold before commit.
function useDragReorder(listRef, exercises, onReorder) {
  const stateRef = useRef({ armed: false, hasMoved: false, draggingId: null, timer: null });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rows = [...list.querySelectorAll('.edit-ex-row')];
    const cleanups = [];

    rows.forEach(row => {
      const exId = row.dataset.ex;
      const s = stateRef.current;

      function arm() {
        s.armed = true;
        s.hasMoved = false;
        s.draggingId = exId;
        row.classList.add('drag-armed');
        if (navigator.vibrate) navigator.vibrate(25);
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      }

      function disarm() {
        s.armed = false;
        s.hasMoved = false;
        s.draggingId = null;
        s.timer = null;
        row.classList.remove('drag-armed', 'dragging');
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }

      function findDropTarget(y) {
        const siblings = [...list.querySelectorAll('.edit-ex-row:not(.dragging)')];
        for (const el of siblings) {
          const r = el.getBoundingClientRect();
          if (y < r.top + r.height / 2) return el;
        }
        return null;
      }

      function clearDragOver() {
        list.querySelectorAll('.edit-ex-row').forEach(r => r.classList.remove('drag-over'));
      }

      // Touch
      function onTouchStart(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        row._touchStartY = e.touches[0].clientY;
        s.timer = setTimeout(() => arm(), 300);
      }

      function onTouchMove(e) {
        if (!s.armed) { clearTimeout(s.timer); s.timer = null; return; }
        e.preventDefault();
        if (Math.abs(e.touches[0].clientY - row._touchStartY) > 12) s.hasMoved = true;
        row.classList.add('dragging');
        const target = findDropTarget(e.touches[0].clientY);
        clearDragOver();
        if (target) target.classList.add('drag-over');
      }

      function onTouchEnd() {
        clearTimeout(s.timer);
        if (s.armed && s.hasMoved) {
          const overEl = list.querySelector('.edit-ex-row.drag-over');
          if (overEl && overEl !== row) {
            onReorder(exId, overEl.dataset.ex);
          }
          clearDragOver();
        }
        disarm();
      }

      // Mouse
      function onMouseDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        const startY = e.clientY;

        s.timer = setTimeout(() => {
          arm();
          row.classList.add('dragging');

          function onMouseMove(ev) {
            if (Math.abs(ev.clientY - startY) > 8) s.hasMoved = true;
            const target = findDropTarget(ev.clientY);
            clearDragOver();
            if (target) target.classList.add('drag-over');
          }

          function onMouseUp() {
            if (s.hasMoved) {
              const overEl = list.querySelector('.edit-ex-row.drag-over');
              if (overEl && overEl !== row) {
                onReorder(exId, overEl.dataset.ex);
              }
              clearDragOver();
            }
            disarm();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }, 300);
      }

      function onMouseUp() { clearTimeout(s.timer); }
      function onMouseLeave() { if (!s.armed) clearTimeout(s.timer); }

      row.addEventListener('touchstart', onTouchStart, { passive: true });
      row.addEventListener('touchmove', onTouchMove, { passive: false });
      row.addEventListener('touchend', onTouchEnd);
      row.addEventListener('touchcancel', onTouchEnd);
      row.addEventListener('mousedown', onMouseDown);
      row.addEventListener('mouseup', onMouseUp);
      row.addEventListener('mouseleave', onMouseLeave);

      cleanups.push(() => {
        row.removeEventListener('touchstart', onTouchStart);
        row.removeEventListener('touchmove', onTouchMove);
        row.removeEventListener('touchend', onTouchEnd);
        row.removeEventListener('touchcancel', onTouchEnd);
        row.removeEventListener('mousedown', onMouseDown);
        row.removeEventListener('mouseup', onMouseUp);
        row.removeEventListener('mouseleave', onMouseLeave);
      });
    });

    return () => cleanups.forEach(fn => fn());
  });
}

function ExerciseDragList({ day, onEditField, onRemoveEx, onAddEx, onReorder }) {
  const listRef = useRef(null);

  useDragReorder(listRef, day.exercises, (fromId, toId) => onReorder(day.id, fromId, toId));

  return (
    <div className="edit-section">
      <div className="edit-section-title" style={{ color: day.color }}>
        {day.name}{' '}
        <span style={{ color: 'var(--muted)', fontWeight: 'normal', letterSpacing: 0, textTransform: 'none', fontSize: 'var(--fs-xs)' }}>
          {day.exercises.length} exercises
        </span>
      </div>
      <div className="ex-drag-list" ref={listRef}>
        {day.exercises.map(ex => (
          <div key={ex.id} className="edit-ex-row" data-ex={ex.id} data-day={day.id}>
            <div className="edit-ex-name-row">
              <input
                className="edit-input"
                defaultValue={ex.name}
                placeholder="Name"
                onInput={e => onEditField(day.id, ex.id, 'name', e.target.value)}
              />
              <button className="edit-del-btn" onClick={() => onRemoveEx(day.id, ex.id)}>×</button>
            </div>
            <div className="edit-ex-meta">
              <span className="edit-meta-label">Sets</span>
              <input
                className="edit-mini-input"
                type="number"
                defaultValue={ex.sets}
                min="1" max="20"
                onInput={e => onEditField(day.id, ex.id, 'sets', +e.target.value)}
              />
              <span className="edit-meta-label">{ex.logType === 'duration' ? 'Sec' : 'Reps'}</span>
              <input
                className="edit-mini-input"
                type="number"
                defaultValue={ex.reps}
                min="1" max={ex.logType === 'duration' ? 600 : 100}
                onInput={e => onEditField(day.id, ex.id, 'reps', +e.target.value)}
              />
              <input
                className="edit-input"
                defaultValue={ex.note || ''}
                placeholder="Note"
                onInput={e => onEditField(day.id, ex.id, 'note', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="edit-add-btn" onClick={() => onAddEx(day.id)}>
        ＋ &nbsp;Add Exercise
      </button>
    </div>
  );
}

export default function EditScreen({
  program,
  onEditDayField, onRemoveDay, onAddDay,
  onEditExField, onRemoveEx, onAddEx, onReorderEx,
  addDayFormRef,
}) {
  return (
    <div className="edit-wrap">
      {/* Training days */}
      <div className="edit-section" id="days-edit-section">
        <div className="edit-section-title">Training Days</div>
        {program.days.map(d => (
          <div key={d.id} className="edit-day-row">
            <div className="color-dot" style={{ background: d.color }} />
            <input
              className="edit-input"
              defaultValue={d.name}
              placeholder="Day name"
              onInput={e => onEditDayField(d.id, 'name', e.target.value)}
            />
            <input
              className="edit-input"
              style={{ minWidth: '160px' }}
              defaultValue={d.focus || ''}
              placeholder="Focus"
              onInput={e => onEditDayField(d.id, 'focus', e.target.value)}
            />
            <button className="edit-del-btn" onClick={() => onRemoveDay(d.id)}>×</button>
          </div>
        ))}
        <div ref={addDayFormRef} />
        <button className="edit-add-btn" onClick={onAddDay}>＋ &nbsp;Add Day</button>
      </div>

      {/* Per-day exercise lists */}
      {program.days.map(d => (
        <ExerciseDragList
          key={d.id}
          day={d}
          onEditField={onEditExField}
          onRemoveEx={onRemoveEx}
          onAddEx={onAddEx}
          onReorder={onReorderEx}
        />
      ))}
    </div>
  );
}
