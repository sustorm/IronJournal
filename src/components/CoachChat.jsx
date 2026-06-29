import { useState, useRef, useEffect } from 'react';
import { sendToCoach } from '../lib/coach.js';

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

function MessageBubble({ msg }) {
  const clean = msg.content
    .replace(/<program_change>[\s\S]*?<\/program_change>/g, '')
    .trim();
  return (
    <div className={`msg ${msg.role}`}>
      {msg.role === 'assistant' && <div className="msg-label">Coach</div>}
      <div
        className="msg-bubble"
        dangerouslySetInnerHTML={{ __html: clean.replace(/\n/g, '<br>') }}
      />
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

export default function CoachChat({ currentDay, allDays, setData, onApplyChange }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([INITIAL_MSG]);
  const [pendingChange, setPendingChange] = useState(null);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const msgsRef = useRef(null);

  useEffect(() => {
    if (open && msgsRef.current) {
      setTimeout(() => { msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    }
  }, [msgs, open, typing]);

  function buildLogCtx() {
    // Always include the day ID map so the AI can use correct IDs in program_change blocks
    let ctx = 'Program days (use these exact IDs in program_change JSON):\n';
    (allDays || []).forEach(d => {
      ctx += `  ${d.id}: ${d.name}${d.focus ? ` — ${d.focus}` : ''}\n`;
    });

    if (!currentDay) return ctx;
    const ds = setData[currentDay.id];
    if (!ds) return ctx;

    ctx += `\nCurrent session: ${currentDay.name} (${currentDay.focus || ''})\n`;
    currentDay.exercises.forEach(ex => {
      const rows = (ds[ex.id] || []).filter(r => r.reps > 0);
      if (!rows.length) return;
      ctx += `- ${ex.name}: ` +
        rows.map((r, i) => `Set${i + 1} ${r.weight ? r.weight + 'lbs' : 'bw'}×${r.reps}`).join(', ') +
        ` (target ${ex.sets}×${ex.reps})\n`;
    });
    return ctx;
  }

  async function send(override) {
    const text = override || input.trim();
    if (!text) return;
    setInput('');

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
      reply = await sendToCoach(apiMsgs);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }]);
      setPendingChange(null);
      setTyping(false);
      return;
    }

    // Parse program_change block separately so a malformed JSON doesn't swallow the reply
    let change = null;
    const match = reply.match(/<program_change>([\s\S]*?)<\/program_change>/);
    if (match) {
      try { change = JSON.parse(match[1].trim()); }
      catch (e) { console.warn('Could not parse program_change JSON:', e); }
    }

    setPendingChange(change);
    setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
    setTyping(false);
  }

  function handleApply() {
    if (!pendingChange) return;
    onApplyChange(pendingChange);
    setPendingChange(null);
  }

  return (
    <>
      <div className="coach-bar">
        <button
          className={`coach-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          💬 &nbsp;{open ? 'Close Coach' : 'Ask Your Coach'}
        </button>
      </div>
      <div className={`chat-panel${open ? ' open' : ''}`}>
        <div className="chat-messages" ref={msgsRef}>
          {msgs.map((m, i) => <MessageBubble key={i} msg={m} />)}
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
          <input
            className="chat-input"
            placeholder="Ask about weights, form, or program changes…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="send-btn" onClick={() => send()} disabled={typing}>→</button>
        </div>
      </div>
    </>
  );
}
