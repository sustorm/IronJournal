import { SYSTEM_PROMPT, SWAP_SYSTEM_PROMPT, PROGRESS_TAKE_SYSTEM_PROMPT, QUARTERLY_REFLECTION_SYSTEM_PROMPT, MEMORY_UPDATE_SYSTEM_PROMPT } from './constants.js';

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
    ? `\nAlready shown in a previous batch this session — do NOT include any of these again or a close variant of one: ${excludeNames.join(', ')}`
    : '';
  const userMsg = `Full weekly program (check for redundancy across all days):${programCtx}
Day being edited: ${day?.name || ''}${day?.focus ? ` (${day.focus})` : ''}
Other exercises already in this day: ${siblings || 'none'}
Exercise to replace: ${exercise.name} — ${exercise.sets}x${exercise.reps} ${exerciseUnit}${exercise.note ? `, ${exercise.note}` : ''}${excludeLine}`;

  // 10 items with verbose notes/reasons was pushing generation past 20-30s
  // and occasionally timing out. Terser per-item output (see prompt) plus a
  // tighter cap gets the same 10 results back much faster; a client-side
  // abort turns a hang into a clear error instead of an indefinite wait.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 550,
        temperature: 1,
        system: SWAP_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request took too long — please try again.', { cause: e });
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || '').join('').trim();
  // Extract the array by its brackets rather than anchoring to the string's
  // start/end — at temperature 1 the model occasionally adds a bit of prose
  // or fences it differently despite being told not to, and a strict anchor
  // fails the whole parse over a few stray words.
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON array found in swap response: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  return Array.isArray(parsed) ? parsed : [parsed];
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
      // Backstop above the prompt's own ~70-word limit, with headroom so a
      // slightly-over response still finishes its sentence instead of
      // getting cut off mid-word (400 previously left room to ramble for
      // several paragraphs; too tight a cap truncates instead).
      max_tokens: 300,
      system: withMemory(PROGRESS_TAKE_SYSTEM_PROMPT, memory),
      messages: [{ role: 'user', content: summary }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim() || 'No response.';
}

export async function getQuarterlyReflection(summary, memory) {
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
      max_tokens: 1200,
      system: withMemory(QUARTERLY_REFLECTION_SYSTEM_PROMPT, memory),
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
