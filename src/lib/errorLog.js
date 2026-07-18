const MAX_ENTRIES = 60;
const entries = [];

function record(entry) {
  entries.push({ ...entry, time: new Date().toISOString() });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

export function getErrorLog() {
  return entries;
}

export function initErrorLog() {
  window.addEventListener('error', e => {
    record({
      type: 'error',
      message: e.message,
      stack: e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', e => {
    record({
      type: 'unhandledrejection',
      message: String(e.reason?.message || e.reason),
      stack: e.reason?.stack,
    });
  });

  const origWarn = console.warn;
  console.warn = (...args) => {
    record({ type: 'warn', message: args.map(String).join(' ') });
    origWarn.apply(console, args);
  };

  const origError = console.error;
  console.error = (...args) => {
    record({ type: 'console.error', message: args.map(String).join(' ') });
    origError.apply(console, args);
  };
}
