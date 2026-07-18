import { sb } from './supabase.js';
import { storage } from './storage.js';
import { getErrorLog } from './errorLog.js';

function buildPayload(description, crashError) {
  return {
    description: description || '',
    crash_message: crashError?.message || null,
    crash_stack: crashError?.stack || null,
    program_snapshot: storage.getProgram(),
    set_data_snapshot: storage.getSets(),
    sessions_snapshot: storage.getSessions(),
    error_log: getErrorLog(),
    user_agent: navigator.userAgent,
    url: window.location.href,
    created_at: new Date().toISOString(),
  };
}

// Returns { ok: true } on success, or { ok: false, payload } so the caller
// can offer a clipboard fallback if the upload itself failed (e.g. offline,
// or the app is broken enough that Supabase is unreachable).
export async function submitBugReport(description, crashError) {
  const payload = buildPayload(description, crashError);
  try {
    const { error } = await sb.from('bug_reports').insert({
      description: payload.description,
      crash_message: payload.crash_message,
      crash_stack: payload.crash_stack,
      program_snapshot: payload.program_snapshot,
      set_data_snapshot: payload.set_data_snapshot,
      sessions_snapshot: payload.sessions_snapshot,
      error_log: payload.error_log,
      user_agent: payload.user_agent,
      url: payload.url,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn('Bug report upload failed:', e);
    return { ok: false, payload };
  }
}

export async function copyPayloadToClipboard(payload) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    return true;
  } catch {
    return false;
  }
}
