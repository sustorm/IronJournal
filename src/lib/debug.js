export const isDebugMode = new URLSearchParams(window.location.search).has('debug');

// Fake sessions spread across 3 weeks to populate the progress chart.
// Uses the default program's exercise IDs so volume tracking works.
export const DEBUG_SESSIONS = [
  // ── Week -3 ──
  {
    id: 'dbg-s1', day: 'Lower A', dayId: 'day-la', color: '#4dffaa',
    date: '6/7/2026', time: '10:30 AM', weekKey: '2026-06-07',
    exercises: [
      { id: 'ex-la1', name: 'Back Squat' },
      { id: 'ex-la2', name: 'Paused Squat' },
      { id: 'ex-la3', name: 'Romanian Deadlift' },
      { id: 'ex-la4', name: 'Leg Press' },
    ],
    sets: {
      'ex-la1': [{ weight: '125', reps: 5 }, { weight: '125', reps: 5 }, { weight: '125', reps: 4 }],
      'ex-la2': [{ weight: '90', reps: 3 }, { weight: '90', reps: 3 }],
      'ex-la3': [{ weight: '100', reps: 8 }, { weight: '100', reps: 8 }, { weight: '100', reps: 7 }],
      'ex-la4': [{ weight: '150', reps: 10 }, { weight: '150', reps: 10 }],
    },
  },
  {
    id: 'dbg-s2', day: 'Upper A', dayId: 'day-ua', color: '#5ab4ff',
    date: '6/9/2026', time: '11:00 AM', weekKey: '2026-06-07',
    exercises: [
      { id: 'ex-ua1', name: 'Bench Press' },
      { id: 'ex-ua2', name: 'Barbell Row' },
      { id: 'ex-ua3', name: 'DB Shoulder Press' },
    ],
    sets: {
      'ex-ua1': [{ weight: '65', reps: 5 }, { weight: '65', reps: 5 }, { weight: '65', reps: 4 }],
      'ex-ua2': [{ weight: '55', reps: 6 }, { weight: '55', reps: 6 }, { weight: '55', reps: 6 }],
      'ex-ua3': [{ weight: '20', reps: 8 }, { weight: '20', reps: 8 }, { weight: '20', reps: 7 }],
    },
  },
  // ── Week -2 ──
  {
    id: 'dbg-s3', day: 'Lower A', dayId: 'day-la', color: '#4dffaa',
    date: '6/14/2026', time: '10:15 AM', weekKey: '2026-06-14',
    exercises: [
      { id: 'ex-la1', name: 'Back Squat' },
      { id: 'ex-la2', name: 'Paused Squat' },
      { id: 'ex-la3', name: 'Romanian Deadlift' },
      { id: 'ex-la4', name: 'Leg Press' },
    ],
    sets: {
      'ex-la1': [{ weight: '130', reps: 5 }, { weight: '130', reps: 5 }, { weight: '130', reps: 5 }],
      'ex-la2': [{ weight: '90', reps: 3 }, { weight: '90', reps: 3 }],
      'ex-la3': [{ weight: '105', reps: 8 }, { weight: '105', reps: 8 }, { weight: '105', reps: 8 }],
      'ex-la4': [{ weight: '155', reps: 10 }, { weight: '155', reps: 9 }],
    },
  },
  {
    id: 'dbg-s4', day: 'Lower B', dayId: 'day-lb', color: '#ff8c42',
    date: '6/17/2026', time: '09:45 AM', weekKey: '2026-06-14',
    exercises: [
      { id: 'ex-lb1', name: 'Deadlift' },
      { id: 'ex-lb2', name: 'Box Squat' },
      { id: 'ex-lb3', name: 'Hip Thrust' },
    ],
    sets: {
      'ex-lb1': [{ weight: '165', reps: 4 }, { weight: '165', reps: 4 }, { weight: '165', reps: 3 }],
      'ex-lb2': [{ weight: '115', reps: 5 }, { weight: '115', reps: 5 }, { weight: '115', reps: 5 }],
      'ex-lb3': [{ weight: '135', reps: 10 }, { weight: '135', reps: 10 }, { weight: '135', reps: 10 }],
    },
  },
  // ── Week -1 ──
  {
    id: 'dbg-s5', day: 'Lower A', dayId: 'day-la', color: '#4dffaa',
    date: '6/21/2026', time: '10:00 AM', weekKey: '2026-06-21',
    exercises: [
      { id: 'ex-la1', name: 'Back Squat' },
      { id: 'ex-la2', name: 'Paused Squat' },
      { id: 'ex-la3', name: 'Romanian Deadlift' },
      { id: 'ex-la4', name: 'Leg Press' },
    ],
    sets: {
      'ex-la1': [{ weight: '135', reps: 5 }, { weight: '135', reps: 5 }, { weight: '135', reps: 5 }],
      'ex-la2': [{ weight: '95', reps: 3 }, { weight: '95', reps: 3 }],
      'ex-la3': [{ weight: '110', reps: 8 }, { weight: '110', reps: 8 }, { weight: '110', reps: 8 }],
      'ex-la4': [{ weight: '160', reps: 10 }, { weight: '160', reps: 10 }],
    },
  },
  {
    id: 'dbg-s6', day: 'Upper A', dayId: 'day-ua', color: '#5ab4ff',
    date: '6/23/2026', time: '11:30 AM', weekKey: '2026-06-21',
    exercises: [
      { id: 'ex-ua1', name: 'Bench Press' },
      { id: 'ex-ua2', name: 'Barbell Row' },
      { id: 'ex-ua3', name: 'DB Shoulder Press' },
    ],
    sets: {
      'ex-ua1': [{ weight: '67.5', reps: 5 }, { weight: '67.5', reps: 5 }, { weight: '67.5', reps: 5 }],
      'ex-ua2': [{ weight: '57.5', reps: 6 }, { weight: '57.5', reps: 6 }, { weight: '57.5', reps: 6 }],
      'ex-ua3': [{ weight: '22.5', reps: 8 }, { weight: '22.5', reps: 8 }, { weight: '22.5', reps: 8 }],
    },
  },
];
