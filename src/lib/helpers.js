export const dc = x => JSON.parse(JSON.stringify(x));
export const uid = () => 'ex-' + Math.random().toString(36).slice(2, 9);
export const duid = () => 'day-' + Math.random().toString(36).slice(2, 9);

export function weekKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x.toISOString().slice(0, 10);
}

export function getExSets(setData, dayId, exId, exercise) {
  return setData?.[dayId]?.[exId]
    ?? Array.from({ length: exercise.sets }, () => ({ weight: '', reps: 0 }));
}

// Sorts sessions chronologically by weekKey (a reliable YYYY-MM-DD string),
// falling back to the locale date string as a same-week tiebreaker. Never
// trust an incoming sessions array's own order — it's newest-first in
// production but that isn't guaranteed everywhere (e.g. debug fixtures).
export function sortSessionsByWeek(sessions) {
  return [...sessions].sort((a, b) =>
    (a.weekKey || '').localeCompare(b.weekKey || '') || (new Date(a.date) - new Date(b.date))
  );
}
