import { memo } from 'react';
import ExerciseCard from './ExerciseCard.jsx';
import CoachChat from './CoachChat.jsx';
import { getExSets } from '../lib/helpers.js';

function LogScreen({
  day, allDays, setData,
  onWeightChange, onRepsAdj, onAddSet, onDeleteSet,
  onOpenAddEx, onOpenEditEx,
  onSaveSession,
  onApplyChange,
}) {
  if (!day) {
    return (
      <div style={{ padding: '20px', color: 'var(--muted)' }}>
        No days yet. Add one in the Edit Program screen.
      </div>
    );
  }

  return (
    <>
      <div
        className="day-header"
        style={{
          background: day.color + '10',
          border: `1px solid ${day.color}35`,
        }}
      >
        <div>
          <div className="day-label" style={{ color: day.color }}>{day.name}</div>
          <div className="day-focus">{day.focus || ''}</div>
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
          {day.exercises.length} ex
        </div>
      </div>

      <div className="exercises">
        {day.exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            dayColor={day.color}
            sets={getExSets(setData, day.id, ex.id, ex)}
            onWeightChange={onWeightChange}
            onRepsAdj={onRepsAdj}
            onAddSet={onAddSet}
            onDeleteSet={onDeleteSet}
            onOpenEdit={onOpenEditEx}
          />
        ))}
      </div>

      <div style={{ padding: '0 20px 8px' }}>
        <button className="add-ex-card" onClick={() => onOpenAddEx(day.id)}>
          ＋ &nbsp;Add Exercise to This Day
        </button>
      </div>

      <div className="save-wrap">
        <button
          className="save-btn"
          style={{ background: day.color, color: '#080810' }}
          onClick={onSaveSession}
        >
          Save {day.name} Session
        </button>
      </div>

      <CoachChat
        currentDay={day}
        allDays={allDays}
        setData={setData}
        onApplyChange={onApplyChange}
      />
    </>
  );
}

export default memo(LogScreen);
