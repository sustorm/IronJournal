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
