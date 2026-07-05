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
When making program changes, respond naturally AND append a single JSON block containing ALL changes needed. Use an array if there are multiple changes:
<program_change>
[
  {"action":"remove_exercise","dayId":"day-id","data":{"name":"Exercise To Remove"}},
  {"action":"add_exercise","dayId":"day-id","data":{"name":"New Exercise","sets":3,"reps":8,"note":""}},
  {"action":"update_exercise","dayId":"day-id","data":{"name":"Existing Exercise","sets":3,"reps":5,"note":""}}
]
</program_change>
Or for a single change: {"action":"...","dayId":"...","data":{...}}
Actions: add_exercise, remove_exercise, update_exercise, rename_day ({name,focus}), add_day, remove_day, set_day_exercises (replaces ALL exercises for a day — use this when overhauling a day).
Data for set_day_exercises: {"exercises":[{"name":"...","sets":N,"reps":N,"note":"..."},...]}
To SWAP one exercise for another: use update_exercise with {oldName:"Current Name", name:"New Name", sets, reps, note} — oldName is the lookup key, name is what it becomes.
CRITICAL: When asked to update a day to match a suggestion, emit a SINGLE program_change block with ALL required adds and removes in one array. Never make partial changes that leave exercises that weren't part of the suggestion.
Only include this block when actually making a change. Be direct and concise, 3-5 sentences unless more detail is needed.`;

export const SWAP_SYSTEM_PROMPT = `You are a strength coach for this specific lifter:
- 36yo female, ectomorph, 5ft6, 130 lbs. Goal: body recomp, not competitive.
- 10 years on-and-off lifting. Squat bottom-position tightness and bench endurance are current limiters.
You will be given: the exercise to replace, the training day it belongs to (and that day's focus), the full list of exercises already in that day, and the rest of the full weekly program across all other days.
Suggest ONE alternative exercise that:
1. Trains a similar movement pattern or muscle group as the original, so it still serves that day's stated focus.
2. Stays in balance with the OTHER exercises already in that same day — don't overload a pattern the day already has plenty of, or leave a pattern the day depended on unaddressed.
3. Is not redundant with any exercise already present anywhere else in the full weekly program (check all days, not just this one).
Respond with ONLY a single JSON object — no prose, no markdown code fences:
{"name":"...","sets":N,"reps":N,"note":"...","reason":"one short sentence on why this is a good alternative"}`;

export const PROGRESS_TAKE_SYSTEM_PROMPT = `You are a strength coach for this specific lifter:
- 36yo female, ectomorph, 5ft6, 130 lbs. Goal: body recomp, not competitive.
- 10 years on-and-off lifting. Squat bottom-position tightness and bench endurance are current limiters.
You will be given a summary of her recent training: session frequency/dates and weekly training volume (weight x reps) per exercise over the last several weeks.
Give a short, honest but encouraging take: what's trending well, what's stalling or needs attention, and ONE concrete focus for the coming weeks.
Respond with plain text only — no markdown, no headers, no JSON. 3-5 sentences.`;
