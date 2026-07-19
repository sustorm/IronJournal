import { SYSTEM_PROMPT, SWAP_SYSTEM_PROMPT, PROGRESS_TAKE_SYSTEM_PROMPT, MEMORY_UPDATE_SYSTEM_PROMPT } from './constants.js';

function withMemory(basePrompt, memory) {
  return memory
    ? `${basePrompt}\n\nWhat you already know about her from past conversations:\n${memory}`
    : basePrompt;
}

export async function sendToCoach(messages, memory) {
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
      system: withMemory(SYSTEM_PROMPT, memory),
      messages,
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('') || 'No response.';
}

export async function suggestExerciseSwap(exercise, day, allDays, excludeNames = []) {
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
  const excludeLine = excludeNames.length
    ? `\nAlready suggested and rejected this session — do NOT suggest any of these again, pick something meaningfully different (different equipment, angle, or variation, not just a rename): ${excludeNames.join(', ')}`
    : '';
  const userMsg = `Full weekly program (check for redundancy across all days):${programCtx}
Day being edited: ${day?.name || ''}${day?.focus ? ` (${day.focus})` : ''}
Other exercises already in this day: ${siblings || 'none'}
Exercise to replace: ${exercise.name} — ${exercise.sets}x${exercise.reps} ${exerciseUnit}${exercise.note ? `, ${exercise.note}` : ''}${excludeLine}`;

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
      temperature: 1,
      system: SWAP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || '').join('').trim();
  const clean = text.replace(/^```json?\s*|```$/g, '').trim();
  return JSON.parse(clean);
}

export async function getProgressTake(summary, memory) {
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
      system: withMemory(PROGRESS_TAKE_SYSTEM_PROMPT, memory),
      messages: [{ role: 'user', content: summary }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim() || 'No response.';
}

// Extracts durable, notable facts from the latest chat exchange and merges
// them into the existing running memory. Returns the updated notes text.
export async function updateCoachMemory(currentNotes, userMsg, assistantReply) {
  const userContent = `Current memory notes:\n${currentNotes || '(none yet)'}\n\nLatest exchange:\nHer: ${userMsg}\nCoach: ${assistantReply}`;
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
      system: MEMORY_UPDATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim();
}
