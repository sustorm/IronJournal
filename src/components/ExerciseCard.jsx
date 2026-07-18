import { memo } from 'react';
import SetRow from './SetRow.jsx';

function ExerciseCard({ exercise, dayColor, sets, onWeightChange, onRepsAdj, onAddSet, onDeleteSet, onOpenEdit }) {
  const anyDone = sets.some(s => s.reps > 0);
  const isDuration = exercise.logType === 'duration';

  return (
    <div className="ex-card">
      <div className="ex-top">
        <div style={{ flex: 1 }}>
          <div className="ex-name">{exercise.name}</div>
          <div className="ex-target">
            Target {exercise.sets}×{exercise.reps}
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
      <div className="set-table">
        <div className="set-header">
          <div className="shc">Set</div>
          <div className="shc">{isDuration ? 'Duration (sec)' : 'Weight (lbs)'}</div>
          <div className="shc c">Reps</div>
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
