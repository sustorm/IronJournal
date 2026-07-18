import { memo } from 'react';

function SetRow({ exId, index, set, isDuration, onWeightChange, onRepsAdj, onDelete }) {
  // A duration set is "done" once a time is entered — there's no separate
  // rep count to track, so the stepper is hidden entirely for these rows.
  const done = isDuration ? (parseFloat(set.weight) || 0) > 0 : set.reps > 0;
  return (
    <div className={`set-row${done ? ' done' : ''}`}>
      <div className="set-num">{index + 1}</div>
      <input
        className="set-weight"
        type="number"
        inputMode="decimal"
        placeholder={isDuration ? 'sec' : 'lbs'}
        value={set.weight}
        onChange={e => onWeightChange(exId, index, e.target.value)}
        onFocus={e => e.target.select()}
      />
      {!isDuration && (
        <div className="stepper">
          <button className="sbtn" onClick={() => onRepsAdj(exId, index, -1)}>−</button>
          <div className={`sval${set.reps === 0 ? ' z' : ''}`}>{set.reps}</div>
          <button className="sbtn" onClick={() => onRepsAdj(exId, index, +1)}>＋</button>
        </div>
      )}
      <button className="set-del" onClick={() => onDelete(exId, index)}>×</button>
    </div>
  );
}

export default memo(SetRow);
