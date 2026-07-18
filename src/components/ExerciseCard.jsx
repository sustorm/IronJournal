import { memo } from 'react';
import SetRow from './SetRow.jsx';

function ExerciseCard({ exercise, dayColor, sets, onWeightChange, onRepsAdj, onAddSet, onDeleteSet, onOpenEdit }) {
  const isDuration = exercise.logType === 'duration';
  const anyDone = sets.some(s => isDuration ? (parseFloat(s.weight) || 0) > 0 : s.reps > 0);

  return (
    <div className="ex-card">
      <div className="ex-top">
        <div style={{ flex: 1 }}>
          <div className="ex-name">{exercise.name}</div>
          <div className="ex-target">
            Target {exercise.sets}×{exercise.reps}{isDuration ? ' sec' : ''}
            {exercise.note ? ` · ${exercise.note}` : ''}
          </div>
        </div>
        <button className="ex-edit-btn" onClick={() => onOpenEdit(exercise.id)}>⚙️</button>
        <div
          className="ex-dot"
          style={
            anyDone
              ? { background: dayColor, borderColor: dayColor }
              : {}
          }
        />
      </div>
      <div className={`set-table${isDuration ? ' duration' : ''}`}>
        <div className="set-header">
          <div className="shc" />
          <div className="shc">{isDuration ? 'Duration' : 'Weight'}</div>
          <div className="shc c">{isDuration ? '' : 'Reps'}</div>
          <div className="shc" />
        </div>
        {sets.map((s, i) => (
          <SetRow
            key={i}
            exId={exercise.id}
            index={i}
            set={s}
            isDuration={isDuration}
            onWeightChange={onWeightChange}
            onRepsAdj={onRepsAdj}
            onDelete={onDeleteSet}
          />
        ))}
      </div>
      <button className="add-set-btn" onClick={() => onAddSet(exercise.id)}>
        ＋ &nbsp;Add Set
      </button>
    </div>
  );
}

export default memo(ExerciseCard);
