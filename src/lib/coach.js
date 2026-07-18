import { SYSTEM_PROMPT, SWAP_SYSTEM_PROMPT, PROGRESS_TAKE_SYSTEM_PROMPT } from './constants.js';

export async function sendToCoach(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('') || 'No response.';
}

export async function suggestExerciseSwap(exercise, day, allDays) {
  const siblings = (day?.exercises || [])
    .filter(e => e.id !== exercise.id)
    .map(e => e.name)
    .join(', ');

  let programCtx = '';
  (allDays || []).forEach(d => {
    programCtx += `\n${d.name}${d.focus ? ` (${d.focus})` : ''}${d.id === day?.id ? ' — this is the day being edited' : ''}:\n`;
    (d.exercises || []).forEach(e => {
      const unit = e.logType === 'duration' ? 'sec, timed hold' : 'reps, weight-loaded';
      programCtx += `  - ${e.name} (${e.sets}x${e.reps} ${unit})\n`;
    });
  });

  const exerciseUnit = exercise.logType === 'duration' ? 'sec (timed hold)' : 'reps (weight-loaded)';
  const userMsg = `Full weekly program (check for redundancy across all days):${programCtx}
Day being edited: ${day?.name || ''}${day?.focus ? ` (${day.focus})` : ''}
Other exercises already in this day: ${siblings || 'none'}
Exercise to replace: ${exercise.name} — ${exercise.sets}x${exercise.reps} ${exerciseUnit}${exercise.note ? `, ${exercise.note}` : ''}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SWAP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || '').join('').trim();
  const clean = text.replace(/^```json?\s*|```$/g, '').trim();
  return JSON.parse(clean);
}

export async function getProgressTake(summary) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: PROGRESS_TAKE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: summary }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim() || 'No response.';
}
