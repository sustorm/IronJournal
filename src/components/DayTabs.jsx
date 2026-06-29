import { memo } from 'react';

function DayTabs({ days, currentDayId, visible, onSwitch }) {
  if (!visible) return null;
  return (
    <div className="day-tabs-wrap">
      {days.map(d => (
        <button
          key={d.id}
          className={`day-tab${d.id === currentDayId ? ' active' : ''}`}
          style={
            d.id === currentDayId
              ? { background: d.color, borderColor: d.color }
              : { borderColor: d.color + '40', color: d.color }
          }
          onClick={() => onSwitch(d.id)}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}

export default memo(DayTabs);
