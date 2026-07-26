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

// The "last weight you lifted" pre-fill has always lived only in local
// device storage (setData/ij_sets4), never synced to Supabase — so it's
// wiped by anything that clears local storage (browser data clear, iOS
// treating a re-added home-screen icon as a fresh storage bucket, a new
// device, etc.), even though the actual session history is completely
// safe in the cloud. This rebuilds any MISSING local entries from that
// durable history so the feature self-heals instead of just staying
// blank. Matches exercises by name (stable across id changes from a
// swap) and never overwrites setData that already has real content.
export function backfillSetDataFromHistory(program, sessions, existingSetData) {
  const next = { ...existingSetData };
  (program?.days || []).forEach(day => {
    const daySets = { ...(next[day.id] || {}) };
    let changed = false;
    (day.exercises || []).forEach(ex => {
      const existing = daySets[ex.id];
      const hasRealData = existing?.some(r => r.weight !== '' || r.reps > 0);
      if (hasRealData) return;
      if (ex.logType === 'duration') return; // never carry duration forward — see saveSession
      const matches = sessions.filter(s => (s.exercises || []).some(e => e.name === ex.name));
      if (!matches.length) return;
      const mostRecent = sortSessionsByWeek(matches).at(-1);
      const exRef = mostRecent.exercises.find(e => e.name === ex.name);
      const lastRows = mostRecent.sets?.[exRef.id];
      if (!lastRows?.length) return;
      daySets[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
        weight: lastRows[i]?.weight ?? lastRows.at(-1).weight ?? '',
        reps: 0,
      }));
      changed = true;
    });
    if (changed) next[day.id] = daySets;
  });
  return next;
}
