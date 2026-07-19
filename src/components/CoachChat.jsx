import { useState, useRef, useEffect } from 'react';
import { sendToCoach, updateCoachMemory } from '../lib/coach.js';
import { synthesizeSpeech } from '../lib/tts.js';

const QUICK_PROMPTS = [
  'How do I progress?',
  'Suggest an exercise swap',
  "I'm feeling fatigued",
  'Change my program',
];

const INITIAL_MSG = {
  role: 'assistant',
  content: "Hey! Log your sets above then ask me anything — weights, form, or program changes. I can update your program directly from this chat.",
};

// Splits on sentence-ending punctuation so each chunk can be requested (and
// start playing) independently instead of waiting on the whole reply.
function splitIntoSpeechChunks(text) {
  const parts = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
  const chunks = parts.map(s => s.trim()).filter(Boolean);
  return chunks.length ? chunks : [text];
}

function MessageBubble({ msg, index, voiceState, onSpeak }) {
  const clean = msg.content
    .replace(/<program_change>[\s\S]*?<\/program_change>/g, '')
    .trim();
  const isThisOne = voiceState.idx === index;
  const icon = isThisOne
    ? (voiceState.status === 'loading' ? '⋯' : voiceState.status === 'error' ? '⚠️' : '⏹')
    : '🔊';
  const isPlaying = isThisOne && voiceState.status === 'playing';
  return (
    <div className={`msg ${msg.role}`}>
      {msg.role === 'assistant' && <div className="msg-label">Coach</div>}
      <div
        className="msg-bubble"
        dangerouslySetInnerHTML={{ __html: clean.replace(/\n/g, '<br>') }}
      />
      {msg.role === 'assistant' && clean && (
        <button
          className={`speak-btn${isPlaying ? ' playing' : ''}`}
          onClick={() => onSpeak(index, clean)}
          aria-label={isPlaying ? 'Stop speaking' : 'Speak this reply'}
        >
          {icon} {isPlaying ? 'Stop' : 'Listen'}
        </button>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg assistant">
      <div className="msg-bubble">
        <div className="typing">
          <div className="dot" /><div className="dot" /><div className="dot" />
        </div>
      </div>
    </div>
  );
}

export default function CoachChat({ currentDay, allDays, setData, onApplyChange, isActive, memory, onMemoryUpdate }) {
  const [msgs, setMsgs] = useState([INITIAL_MSG]);
  const [pendingChange, setPendingChange] = useState(null);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [voiceState, setVoiceState] = useState({ idx: null, status: 'idle' }); // idle | loading | playing | error
  const msgsRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const speakTokenRef = useRef(0);

  useEffect(() => {
    if (msgsRef.current) {
      setTimeout(() => { msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    }
  }, [msgs, typing]);

  // The chat screen is kept mounted (just hidden) when navigating away, so
  // stop any playing audio explicitly rather than relying on unmount.
  useEffect(() => {
    if (!isActive) stopSpeaking();
  }, [isActive]);

  function stopSpeaking() {
    speakTokenRef.current++; // invalidate any in-flight playback loop
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setVoiceState({ idx: null, status: 'idle' });
  }

  async function handleSpeak(idx, text) {
    if (voiceState.idx === idx && voiceState.status !== 'error') {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    const token = ++speakTokenRef.current;

    // Create + attempt play() synchronously inside this click handler, before
    // any awaits. iOS/Safari only allow audio playback that's directly tied
    // to a user gesture — a later play() call after the async TTS fetch gets
    // silently rejected otherwise (that's the "works on the 2nd tap" bug).
    const audio = new Audio();
    audioRef.current = audio;
    audio.play().catch(() => {});

    setVoiceState({ idx, status: 'loading' });

    // Split into sentence-sized chunks and fetch them all in parallel, then
    // play back-to-back. A short first sentence finishes generating much
    // faster than the whole reply would as one request, so playback starts
    // almost immediately instead of waiting out the full paragraph.
    const chunks = splitIntoSpeechChunks(text);
    const chunkPromises = chunks.map(c => synthesizeSpeech(c));

    try {
      for (const chunkPromise of chunkPromises) {
        const blob = await chunkPromise;
        if (speakTokenRef.current !== token) return;

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        audio.src = url;

        await new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = () => reject(new Error('Audio playback error'));
          audio.play().then(() => setVoiceState({ idx, status: 'playing' })).catch(reject);
        });

        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        if (speakTokenRef.current !== token) return;
      }
      if (speakTokenRef.current === token) stopSpeaking();
    } catch (e) {
      if (speakTokenRef.current !== token) return;
      console.warn('Text-to-speech failed:', e);
      setVoiceState({ idx, status: 'error' });
      setTimeout(() => {
        setVoiceState(prev => (prev.idx === idx && prev.status === 'error') ? { idx: null, status: 'idle' } : prev);
      }, 2500);
    }
  }

  function buildLogCtx() {
    let ctx = 'Full program (use these exact day IDs in program_change JSON):\n';
    (allDays || []).forEach(d => {
      ctx += `\n${d.id}: ${d.name}${d.focus ? ` — ${d.focus}` : ''}\n`;
      (d.exercises || []).forEach(ex => {
        const unit = ex.logType === 'duration' ? 'sec' : '';
        ctx += `  - ${ex.name} (${ex.sets}×${ex.reps}${unit}${ex.note ? ', ' + ex.note : ''})\n`;
      });
    });

    if (!currentDay) return ctx;
    const ds = setData[currentDay.id];
    if (!ds) return ctx;

    const loggedRows = currentDay.exercises.flatMap(ex => {
      const isDuration = ex.logType === 'duration';
      const rows = (ds[ex.id] || []).filter(r => isDuration ? (parseFloat(r.weight) || 0) > 0 : r.reps > 0);
      if (!rows.length) return [];
      const formatted = isDuration
        ? rows.map((r, i) => `Set${i + 1} ${r.weight}sec`).join(', ') + ` (target ${ex.sets}×${ex.reps}sec)`
        : rows.map((r, i) => `Set${i + 1} ${r.weight ? r.weight + 'lbs' : 'bw'}×${r.reps}`).join(', ') + ` (target ${ex.sets}×${ex.reps})`;
      return [`- ${ex.name}: ${formatted}`];
    });
    if (loggedRows.length) {
      ctx += `\nLogged sets today (${currentDay.name}):\n` + loggedRows.join('\n') + '\n';
    }
    return ctx;
  }

  async function send(override) {
    const text = override || input.trim();
    if (!text) return;
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    const ctx = buildLogCtx();
    const userContent = `[Context:\n${ctx}]\n${text}`;

    const newMsgs = [...msgs, { role: 'user', content: text }];
    setMsgs(newMsgs);
    setTyping(true);

    const apiMsgs = newMsgs.slice(1).map((m, i, arr) => ({
      role: m.role,
      content: m.role === 'user' && i === arr.length - 1 ? userContent : m.content,
    }));

    let reply = null;
    try {
      reply = await sendToCoach(apiMsgs, memory);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }]);
      setPendingChange(null);
      setTyping(false);
      return;
    }

    // Parse program_change block — normalize to array so handleApply is uniform
    let change = null;
    const match = reply.match(/<program_change>([\s\S]*?)<\/program_change>/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].trim());
        change = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) { console.warn('Could not parse program_change JSON:', e); }
    }

    setPendingChange(change);
    setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);

    // Quietly update the running memory in the background — never blocks
    // or affects the visible chat, and failures are non-fatal.
    if (onMemoryUpdate) {
      const cleanReply = reply.replace(/<program_change>[\s\S]*?<\/program_change>/g, '').trim();
      updateCoachMemory(memory, text, cleanReply)
        .then(notes => { if (notes && notes !== memory) onMemoryUpdate(notes); })
        .catch(e => console.warn('updateCoachMemory failed:', e));
    }
    setTyping(false);
  }

  function handleApply() {
    if (!pendingChange) return;
    onApplyChange(pendingChange);
    setPendingChange(null);
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={msgsRef}>
        {msgs.map((m, i) => (
          <MessageBubble key={i} msg={m} index={i} voiceState={voiceState} onSpeak={handleSpeak} />
        ))}
        {typing && <TypingIndicator />}
      </div>
      {pendingChange && (
        <div className="chat-apply-wrap">
          <button className="chat-apply-btn" onClick={handleApply}>
            ✓ Apply suggested program change
          </button>
        </div>
      )}
      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="qp" onClick={() => send(p)}>{p}</button>
        ))}
      </div>
      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask here…"
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button className="send-btn" onClick={() => send()} disabled={typing}>→</button>
      </div>
    </div>
  );
}
