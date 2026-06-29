export const DEFAULT_PROGRAM = {
  days: [
    {
      id: 'day-la', name: 'Lower A', focus: 'Squat Focus', color: '#4dffaa',
      exercises: [
        { id: 'ex-la1', name: 'Back Squat', sets: 3, reps: 5, note: 'Add 5 lbs when all reps clean' },
        { id: 'ex-la2', name: 'Paused Squat', sets: 2, reps: 3, note: '70% of squat weight, 2-sec pause' },
        { id: 'ex-la3', name: 'Romanian Deadlift', sets: 3, reps: 8, note: 'Hamstring focus' },
        { id: 'ex-la4', name: 'Leg Press', sets: 2, reps: 10, note: 'Confidence builder' },
        { id: 'ex-la5', name: 'Dead Bug', sets: 3, reps: 6, note: 'Per side' },
      ],
    },
    {
      id: 'day-lb', name: 'Lower B', focus: 'Deadlift Focus', color: '#ff8c42',
      exercises: [
        { id: 'ex-lb1', name: 'Deadlift', sets: 3, reps: 4, note: 'Add 5 lbs when all reps clean' },
        { id: 'ex-lb2', name: 'Box Squat', sets: 3, reps: 5, note: 'Parallel' },
        { id: 'ex-lb3', name: 'Hip Thrust', sets: 3, reps: 10, note: 'Posterior chain' },
        { id: 'ex-lb4', name: 'Walking Lunges', sets: 2, reps: 10, note: 'Per leg' },
        { id: 'ex-lb5', name: 'Plank', sets: 3, reps: 30, note: 'Seconds' },
      ],
    },
    {
      id: 'day-ua', name: 'Upper A', focus: 'Bench Focus', color: '#5ab4ff',
      exercises: [
        { id: 'ex-ua1', name: 'Bench Press', sets: 3, reps: 5, note: 'Add 2.5 lbs when all reps clean' },
        { id: 'ex-ua2', name: 'Barbell Row', sets: 3, reps: 6, note: 'Match bench volume' },
        { id: 'ex-ua3', name: 'DB Shoulder Press', sets: 3, reps: 8, note: '' },
        { id: 'ex-ua4', name: 'Cable Row', sets: 2, reps: 10, note: '' },
        { id: 'ex-ua5', name: 'Tricep Pushdown', sets: 2, reps: 12, note: '' },
      ],
    },
    {
      id: 'day-ub', name: 'Upper B', focus: 'Pull Focus', color: '#c084fc',
      exercises: [
        { id: 'ex-ub1', name: 'Assisted Pull-up', sets: 4, reps: 6, note: 'Reduce assistance every 2 weeks' },
        { id: 'ex-ub2', name: 'Standing OHP', sets: 3, reps: 6, note: 'Add 2.5 lbs when all reps clean' },
        { id: 'ex-ub3', name: 'Incline DB Press', sets: 3, reps: 8, note: 'Bench confidence builder' },
        { id: 'ex-ub4', name: 'Face Pulls', sets: 3, reps: 12, note: 'Shoulder health' },
        { id: 'ex-ub5', name: 'Barbell Curl', sets: 2, reps: 12, note: '' },
      ],
    },
  ],
};

export const DAY_COLORS = ['#4dffaa', '#ff8c42', '#5ab4ff', '#c084fc', '#ffd166', '#ef476f', '#06d6a0'];

export const SYSTEM_PROMPT = `You are a strength coach for this specific lifter:
- 36yo female, ectomorph, 5ft6, 130 lbs. Goal: body recomp, not competitive.
- 10 years on-and-off lifting. Was eating 1300 cal, now targeting 2000 cal, 130-145g protein/day.
- Trains 4x/week Upper/Lower split (may change).
Current lifts: Squat ~135 lbs (bottom tightness is key limiter), Deadlift ~170 lbs (strongest), Bench ~72 lbs (endurance is limiter), OHP 45 lbs, Assisted Pull-ups Level 9, Row 55 lbs.
Rule: only add weight when ALL sets and reps are completed cleanly.
When suggesting program changes, respond naturally AND append a JSON block:
<program_change>
{"action":"add_exercise|remove_exercise|update_exercise|rename_day|add_day|remove_day","dayId":"day-id-here","data":{...}}
</program_change>
Data for add_exercise: {name, sets, reps, note}. For rename_day: {name, focus}. For update_exercise: {name, sets, reps, note}. For remove_exercise: {name}.
Only include this block when actually suggesting a change. Be direct and concise, 3-5 sentences unless more detail is needed.`;
