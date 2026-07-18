import { memo } from 'react';

function SetRow({ exId, index, set, isDuration, onWeightChange, onRepsAdj, onDelete }) {
  return (
    <div className={`set-row${set.reps > 0 ? ' done' : ''}`}>
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
      <div className="stepper">
        <button className="sbtn" onClick={() => onRepsAdj(exId, index, -1)}>−</button>
        <div className={`sval${set.reps === 0 ? ' z' : ''}`}>{set.reps}</div>
        <button className="sbtn" onClick={() => onRepsAdj(exId, index, +1)}>＋</button>
      </div>
      <button className="set-del" onClick={() => onDelete(exId, index)}>×</button>
    </div>
  );
}

export default memo(SetRow);
