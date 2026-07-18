import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_PROGRAM, DAY_COLORS } from './lib/constants.js';
import { dc, uid, duid, weekKey, getExSets } from './lib/helpers.js';
import { storage } from './lib/storage.js';
import { sb } from './lib/supabase.js';
import { isDebugMode, DEBUG_SESSIONS } from './lib/debug.js';
import { useSyncStatus } from './hooks/useSyncStatus.js';
import TopBar from './components/TopBar.jsx';
import DayTabs from './components/DayTabs.jsx';
import LogScreen from './components/LogScreen.jsx';
import CoachChat from './components/CoachChat.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import EditScreen from './components/EditScreen.jsx';
import AddExModal from './components/AddExModal.jsx';
import EditExModal from './components/EditExModal.jsx';
import BugReportModal from './components/BugReportModal.jsx';
import Toast from './components/Toast.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(
    () => storage.getProgram() || dc(DEFAULT_PROGRAM)
  );
  const [setData, setSetData] = useState(() => storage.getSets());
  const [sessions, setSessions] = useState(() => storage.getSessions());
  const [currentDayId, setCurrentDayId] = useState(
    () => (storage.getProgram() || dc(DEFAULT_PROGRAM)).days[0]?.id || null
  );
  const [currentScreen, setCurrentScreen] = useState('log');
  const [addExModal, setAddExModal] = useState({ open: false, targetDayId: null });
  const [editExModal, setEditExModal] = useState({ open: false, exId: null, dayId: null });
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const debounceRef = useRef(null);
  const toastRef = useRef(null);
  const addDayFormRef = useRef(null);
  const { sync, setSyncStatus } = useSyncStatus();

  const showToast = useCallback(msg => toastRef.current?.show(msg), []);

  // ── Load on mount ──
  useEffect(() => {
    if (isDebugMode) {
      // Seed debug sessions if this is the first debug visit
      if (!storage.getSessions().length) {
        storage.setSessions(DEBUG_SESSIONS);
        setSessions(DEBUG_SESSIONS);
      }
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const { data: progRow, error: pe } = await sb
          .from('program').select('data').eq('id', 'singleton').maybeSingle();
        if (!pe && progRow?.data) {
          setProgram(progRow.data);
          storage.setProgram(progRow.data);
          setCurrentDayId(progRow.data.days[0]?.id || null);
        }
        const { data: sessRows, error: se } = await sb
          .from('sessions').select('*').order('created_at', { ascending: false }).limit(60);
        if (!se && sessRows) {
          const mapped = sessRows.map(r => ({
            id: r.id, day: r.day_name, dayId: r.day_id, color: r.color,
            date: r.date, time: r.time, weekKey: r.week_key,
            sets: r.sets, exercises: r.exercises,
          }));
          setSessions(mapped);
          storage.setSessions(mapped);
        }
      } catch (e) {
        console.warn('Supabase load failed, using local cache:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Program persistence ──
  function saveProgram(newProgram) {
    setProgram(newProgram);
    storage.setProgram(newProgram);
    if (isDebugMode) return;
    setSyncStatus('syncing', 'saving…');
    sb.from('program')
      .upsert({ id: 'singleton', updated_at: new Date().toISOString(), data: newProgram }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) { console.warn('program sync failed:', error.message); setSyncStatus('err', 'sync failed'); }
        else setSyncStatus('ok', '✓ saved');
      });
  }

  function saveProgramDebounced(newProgram) {
    setProgram(newProgram);
    storage.setProgram(newProgram);
    if (isDebugMode) return;
    setSyncStatus('syncing', 'saving…');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      sb.from('program')
        .upsert({ id: 'singleton', updated_at: new Date().toISOString(), data: newProgram }, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) { console.warn('program sync failed:', error.message); setSyncStatus('err', 'sync failed'); }
          else setSyncStatus('ok', '✓ saved');
        });
    }, 600);
  }

  // ── setData mutations ──
  function updateWeight(exId, setIdx, value) {
    setSetData(prev => {
      const d = program.days.find(x => x.id === currentDayId);
      if (!d) return prev;
      const daySets = prev[d.id] || {};
      const ex = d.exercises.find(e => e.id === exId);
      const exSets = getExSets(prev, d.id, exId, ex);
      const next = [...exSets];
      next[setIdx] = { ...next[setIdx], weight: value };
      const newData = { ...prev, [d.id]: { ...daySets, [exId]: next } };
      storage.setSets(newData);
      return newData;
    });
  }

  function adjustReps(exId, setIdx, delta) {
    setSetData(prev => {
      const d = program.days.find(x => x.id === currentDayId);
      if (!d) return prev;
      const daySets = prev[d.id] || {};
      const ex = d.exercises.find(e => e.id === exId);
      const exSets = getExSets(prev, d.id, exId, ex);
      const next = [...exSets];
      next[setIdx] = { ...next[setIdx], reps: Math.max(0, (next[setIdx].reps || 0) + delta) };
      const newData = { ...prev, [d.id]: { ...daySets, [exId]: next } };
      storage.setSets(newData);
      return newData;
    });
  }

  function addSet(exId) {
    setSetData(prev => {
      const d = program.days.find(x => x.id === currentDayId);
      if (!d) return prev;
      const ex = d.exercises.find(e => e.id === exId);
      if (!ex) return prev;
      const daySets = prev[d.id] || {};
      const exSets = getExSets(prev, d.id, exId, ex);
      const lastWeight = exSets.length ? exSets[exSets.length - 1].weight : '';
      const next = [...exSets, { weight: lastWeight, reps: 0 }];
      const newData = { ...prev, [d.id]: { ...daySets, [exId]: next } };
      storage.setSets(newData);
      return newData;
    });
  }

  // Clears logged sets for one exercise so a swapped-in movement starts fresh
  // (getExSets lazily regenerates a zeroed array sized to the new exercise.sets).
  function resetExerciseSets(dayId, exId) {
    setSetData(prev => {
      const daySets = prev[dayId] || {};
      if (!(exId in daySets)) return prev;
      const { [exId]: _removed, ...rest } = daySets;
      const newData = { ...prev, [dayId]: rest };
      storage.setSets(newData);
      return newData;
    });
  }

  function deleteSet(exId, setIdx) {
    setSetData(prev => {
      const d = program.days.find(x => x.id === currentDayId);
      if (!d) return prev;
      const ex = d.exercises.find(e => e.id === exId);
      if (!ex) return prev;
      const exSets = getExSets(prev, d.id, exId, ex);
      if (exSets.length <= 1) return prev;
      const daySets = prev[d.id] || {};
      const newData = { ...prev, [d.id]: { ...daySets, [exId]: exSets.filter((_, i) => i !== setIdx) } };
      storage.setSets(newData);
      return newData;
    });
  }

  // ── Session save ──
  async function saveSession() {
    const d = program.days.find(x => x.id === currentDayId);
    if (!d) return;
    const entry = {
      id: 'dbg-' + Math.random().toString(36).slice(2, 8),
      day: d.name, dayId: d.id, color: d.color,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      weekKey: weekKey(new Date()),
      sets: dc(setData[d.id] || {}),
      exercises: d.exercises.map(e => ({ id: e.id, name: e.name })),
    };
    const newSessions = [entry, ...sessions].slice(0, 60);
    setSessions(newSessions);
    storage.setSessions(newSessions);

    // Reset reps to 0 but keep weights so the next session starts fresh
    const resetDay = {};
    Object.entries(entry.sets).forEach(([exId, rows]) => {
      resetDay[exId] = rows.map(r => ({ ...r, reps: 0 }));
    });
    const resetData = { ...setData, [d.id]: resetDay };
    setSetData(resetData);
    storage.setSets(resetData);

    showToast(`${d.name} saved!`);
    if (isDebugMode) return;
    const { data: inserted, error } = await sb.from('sessions').insert({
      day_name: entry.day, day_id: entry.dayId, color: entry.color,
      date: entry.date, time: entry.time, week_key: entry.weekKey,
      sets: entry.sets, exercises: entry.exercises,
    }).select('id').single();
    if (error) { console.warn('Session sync failed:', error.message); setSyncStatus('err', 'sync failed'); }
    else {
      setSyncStatus('ok', '✓ saved');
      if (inserted?.id) {
        setSessions(prev => {
          const updated = prev.map(s => s.id === entry.id ? { ...s, id: inserted.id } : s);
          storage.setSessions(updated);
          return updated;
        });
      }
    }
  }

  async function deleteSession(sessionId) {
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    storage.setSessions(updated);
    if (!isDebugMode) {
      const { error } = await sb.from('sessions').delete().eq('id', sessionId);
      if (error) console.warn('Session delete failed:', error.message);
    }
    showToast('Session deleted');
  }

  // ── Navigation ──
  function showScreen(name) {
    setCurrentScreen(name);
  }

  function switchDay(id) {
    setCurrentDayId(id);
    setCurrentScreen('log');
  }

  // ── Program mutations ──
  function editDayField(dayId, field, value) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === dayId);
    if (!d) return;
    d[field] = value;
    saveProgramDebounced(newProg);
  }

  function removeDay(dayId) {
    if (program.days.length <= 1) { showToast('Need at least one day'); return; }
    if (!confirm('Remove this day? Your session history is kept.')) return;
    const newProg = dc(program);
    newProg.days = newProg.days.filter(d => d.id !== dayId);
    if (currentDayId === dayId) setCurrentDayId(newProg.days[0]?.id || null);
    saveProgram(newProg);
    showToast('Day removed');
  }

  function addDay() {
    const container = addDayFormRef.current;
    if (!container) return;
    if (container.querySelector('#add-day-form')) {
      container.querySelector('#add-day-form').remove();
      return;
    }
    const form = document.createElement('div');
    form.id = 'add-day-form';
    form.style.cssText = 'padding:12px 16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;background:var(--surface2)';
    form.innerHTML = `
      <div style="font-size:var(--fs-xs);color:var(--muted);letter-spacing:1px;text-transform:uppercase">New Training Day</div>
      <input id="newDayName" class="edit-input" placeholder="Day name (e.g. Push Day)" style="width:100%"/>
      <input id="newDayFocus" class="edit-input" placeholder="Focus (e.g. Chest &amp; Shoulders)" style="width:100%"/>
      <div style="display:flex;gap:8px">
        <button id="addDayConfirmBtn" style="flex:1;min-height:44px;background:var(--accent);color:#080810;border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:var(--fs-sm);letter-spacing:1px;font-weight:600;cursor:pointer">Add Day</button>
        <button id="addDayCancelBtn" style="flex:1;min-height:44px;background:var(--faint);color:var(--muted);border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:var(--fs-sm);cursor:pointer">Cancel</button>
      </div>`;
    container.appendChild(form);

    form.querySelector('#addDayCancelBtn').addEventListener('click', () => form.remove());
    form.querySelector('#addDayConfirmBtn').addEventListener('click', () => {
      const name = form.querySelector('#newDayName').value.trim();
      if (!name) { showToast('Enter a day name'); return; }
      const focus = form.querySelector('#newDayFocus').value.trim();
      const newProg = dc(program);
      const color = DAY_COLORS[newProg.days.length % DAY_COLORS.length];
      newProg.days.push({ id: duid(), name, focus, color, exercises: [] });
      saveProgram(newProg);
      form.remove();
      showToast('Day added');
    });
    setTimeout(() => form.querySelector('#newDayName')?.focus(), 80);
  }

  function editExField(dayId, exId, field, value) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === dayId);
    const ex = d?.exercises.find(e => e.id === exId);
    if (!ex) return;
    ex[field] = value;
    saveProgramDebounced(newProg);
  }

  function removeExFromDay(dayId, exId) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === dayId);
    if (!d) return;
    d.exercises = d.exercises.filter(e => e.id !== exId);
    saveProgram(newProg);
    showToast('Exercise removed');
  }

  function reorderExercises(dayId, fromId, toId) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === dayId);
    if (!d) return;
    const fromIdx = d.exercises.findIndex(e => e.id === fromId);
    const toIdx = d.exercises.findIndex(e => e.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = d.exercises.splice(fromIdx, 1);
    d.exercises.splice(toIdx, 0, item);
    saveProgram(newProg);
  }

  function handleAddExConfirm({ name, sets, reps, note, logType }) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === addExModal.targetDayId);
    if (!d) return;
    d.exercises.push({ id: uid(), name, sets, reps, note, logType });
    saveProgram(newProg);
    setAddExModal({ open: false, targetDayId: null });
    showToast('Exercise added');
  }

  function openEditEx(exId) {
    setEditExModal({ open: true, exId, dayId: currentDayId });
  }

  function handleEditExSave({ name, sets, reps, note, logType }) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === editExModal.dayId);
    const ex = d?.exercises.find(e => e.id === editExModal.exId);
    if (!ex) return;
    Object.assign(ex, { name, sets, reps, note, logType });
    saveProgram(newProg);
    setEditExModal({ open: false, exId: null, dayId: null });
    showToast('Exercise updated');
  }

  function handleEditExSwap(suggestion) {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === editExModal.dayId);
    const ex = d?.exercises.find(e => e.id === editExModal.exId);
    if (!ex) return;
    Object.assign(ex, {
      name: suggestion.name,
      sets: suggestion.sets,
      reps: suggestion.reps,
      note: suggestion.note || '',
    });
    saveProgram(newProg);
    resetExerciseSets(editExModal.dayId, editExModal.exId);
    setEditExModal({ open: false, exId: null, dayId: null });
    showToast('Exercise swapped');
  }

  function handleEditExDelete() {
    const newProg = dc(program);
    const d = newProg.days.find(x => x.id === editExModal.dayId);
    if (!d) return;
    d.exercises = d.exercises.filter(e => e.id !== editExModal.exId);
    saveProgram(newProg);
    setEditExModal({ open: false, exId: null, dayId: null });
    showToast('Exercise removed');
  }

  // Applies one or a batch of AI-suggested changes atomically: a single state
  // update and a single Supabase sync for the whole batch, so a multi-action
  // reorder/rewrite can't leave the program half-applied by a mid-batch race
  // between React's deferred state updates and per-action Supabase syncs.
  // Each action is applied inside its own try/catch so one malformed action
  // (e.g. an unexpected shape from the AI) can't abort the rest of the batch
  // or crash the app.
  function applyChange(changeOrChanges) {
    const changes = Array.isArray(changeOrChanges) ? changeOrChanges : [changeOrChanges];
    if (!changes.length) return;

    const removedDayIds = new Set();
    const appliedActions = [];
    let lastTargetDayId = null;

    setProgram(prev => {
      const newProg = dc(prev);

      changes.forEach(({ action, dayId, data }) => {
        try {
          const resolveDay = () =>
            newProg.days.find(d => d.id === dayId) ||
            newProg.days.find(d => d.name.toLowerCase() === (dayId || '').toLowerCase()) ||
            newProg.days.find(d => d.id === currentDayId);

          if (action === 'add_day') {
            // Exercises should normally come via add_exercise/set_day_exercises,
            // but if the AI nests an exercises array here, give each entry a
            // real unique id instead of letting it through id-less (id-less
            // exercises collide on the same setData key and corrupt logging).
            const { exercises, ...rest } = data || {};
            const newDay = {
              id: duid(),
              color: DAY_COLORS[newProg.days.length % DAY_COLORS.length],
              exercises: Array.isArray(exercises) ? exercises.map(ex => ({ id: uid(), ...ex })) : [],
              ...rest,
            };
            newProg.days.push(newDay);
            lastTargetDayId = newDay.id;
            appliedActions.push(action);
            return;
          }

          if (action === 'reorder_days') {
            const order = data?.order || [];
            const byId = new Map(newProg.days.map(d => [d.id, d]));
            const reordered = order.map(id => byId.get(id)).filter(Boolean);
            const remaining = newProg.days.filter(d => !order.includes(d.id));
            newProg.days = [...reordered, ...remaining];
            appliedActions.push(action);
            return;
          }

          const day = resolveDay();
          if (!day) {
            console.warn(`applyChange: could not resolve day for action "${action}" (dayId="${dayId}")`);
            return;
          }

          if (action === 'add_exercise') {
            day.exercises.push({ id: uid(), ...data });
          } else if (action === 'remove_exercise') {
            day.exercises = day.exercises.filter(e => e.name !== data.name);
          } else if (action === 'update_exercise') {
            const ex = day.exercises.find(e => e.name === (data.oldName || data.name));
            if (ex) {
              if (data.oldName) resetExerciseSets(day.id, ex.id);
              Object.assign(ex, data);
              delete ex.oldName;
            }
          } else if (action === 'rename_day') {
            if (data.name) day.name = data.name;
            if (data.focus) day.focus = data.focus;
          } else if (action === 'remove_day') {
            newProg.days = newProg.days.filter(d => d.id !== day.id);
            removedDayIds.add(day.id);
          } else if (action === 'set_day_exercises') {
            day.exercises = (data.exercises || []).map(ex => ({ id: uid(), ...ex }));
          } else {
            console.warn(`applyChange: unknown action "${action}"`);
            return;
          }

          lastTargetDayId = day.id;
          appliedActions.push(action);
        } catch (e) {
          console.warn(`applyChange: action "${action}" failed:`, e);
        }
      });

      storage.setProgram(newProg);
      return newProg;
    });

    // Navigate to whatever the batch last touched so the change is immediately visible.
    const NAV_ACTIONS = ['add_exercise', 'remove_exercise', 'update_exercise', 'rename_day', 'set_day_exercises', 'add_day'];
    if (lastTargetDayId && appliedActions.some(a => NAV_ACTIONS.includes(a)) && !removedDayIds.has(lastTargetDayId)) {
      setCurrentDayId(lastTargetDayId);
      setCurrentScreen('log');
    } else if (removedDayIds.has(currentDayId)) {
      setCurrentDayId(program.days.find(d => !removedDayIds.has(d.id))?.id || null);
    }

    const toastMap = {
      add_exercise: 'Exercise added', remove_exercise: 'Exercise removed',
      update_exercise: 'Exercise updated', rename_day: 'Day renamed',
      add_day: 'Day added', remove_day: 'Day removed', set_day_exercises: 'Program updated',
      reorder_days: 'Days reordered',
    };
    if (appliedActions.length === 1) {
      if (toastMap[appliedActions[0]]) showToast(toastMap[appliedActions[0]]);
    } else if (appliedActions.length > 1) {
      showToast('Program updated');
    }

    if (!isDebugMode && appliedActions.length) {
      setSyncStatus('syncing', 'saving…');
      // Read from localStorage (written synchronously above) to get the mutated program.
      const progToSync = storage.getProgram();
      sb.from('program')
        .upsert({ id: 'singleton', updated_at: new Date().toISOString(), data: progToSync }, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) { console.warn('program sync failed:', error.message); setSyncStatus('err', 'sync failed'); }
          else setSyncStatus('ok', '✓ saved');
        });
    }
  }

  const currentDay = program.days.find(d => d.id === currentDayId);
  const editDay = editExModal.dayId ? program.days.find(d => d.id === editExModal.dayId) : null;
  const editExercise = editExModal.exId
    ? editDay?.exercises.find(e => e.id === editExModal.exId)
    : null;

  if (loading) return <LoadingOverlay />;

  return (
    <>
      <TopBar
        sync={sync}
        currentScreen={currentScreen}
        debugMode={isDebugMode}
        onShowEdit={() => showScreen('edit')}
        onShowProgress={() => showScreen('progress')}
        onShowChat={() => showScreen('chat')}
        onBack={() => showScreen('log')}
        onReportBug={() => setBugReportOpen(true)}
      />

      <DayTabs
        days={program.days}
        currentDayId={currentDayId}
        visible={currentScreen === 'log' || currentScreen === 'chat'}
        onSwitch={switchDay}
      />

      {currentScreen === 'log' && (
        <div className="screen active">
          <LogScreen
            day={currentDay}
            setData={setData}
            onWeightChange={updateWeight}
            onRepsAdj={adjustReps}
            onAddSet={addSet}
            onDeleteSet={deleteSet}
            onOpenAddEx={targetDayId => setAddExModal({ open: true, targetDayId })}
            onOpenEditEx={openEditEx}
            onSaveSession={saveSession}
          />
        </div>
      )}

      <div className={`screen chat-screen${currentScreen === 'chat' ? ' active' : ''}`}>
        <CoachChat
          currentDay={currentDay}
          allDays={program.days}
          setData={setData}
          onApplyChange={applyChange}
          isActive={currentScreen === 'chat'}
        />
      </div>

      {currentScreen === 'progress' && (
        <div className="screen active">
          <ProgressScreen
            sessions={sessions}
            program={program}
            onDeleteSession={deleteSession}
          />
        </div>
      )}

      {currentScreen === 'edit' && (
        <div className="screen active">
          <EditScreen
            program={program}
            onEditDayField={editDayField}
            onRemoveDay={removeDay}
            onAddDay={addDay}
            onEditExField={editExField}
            onRemoveEx={removeExFromDay}
            onAddEx={targetDayId => setAddExModal({ open: true, targetDayId })}
            onReorderEx={reorderExercises}
            addDayFormRef={addDayFormRef}
          />
        </div>
      )}

      <AddExModal
        open={addExModal.open}
        onClose={() => setAddExModal({ open: false, targetDayId: null })}
        onConfirm={handleAddExConfirm}
      />

      <EditExModal
        open={editExModal.open}
        exercise={editExercise}
        day={editDay}
        allDays={program.days}
        onClose={() => setEditExModal({ open: false, exId: null, dayId: null })}
        onSave={handleEditExSave}
        onDelete={handleEditExDelete}
        onSwap={handleEditExSwap}
      />

      <BugReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
        showToast={showToast}
      />

      <Toast ref={toastRef} />
    </>
  );
}
