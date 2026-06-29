import { useState, useRef, useCallback } from 'react';

export function useSyncStatus() {
  const [sync, setSync] = useState({ state: null, msg: '' });
  const timerRef = useRef(null);

  const setSyncStatus = useCallback((state, msg) => {
    clearTimeout(timerRef.current);
    setSync({ state, msg });
    if (state === 'ok') {
      timerRef.current = setTimeout(() => setSync({ state: null, msg: '' }), 2000);
    }
  }, []);

  return { sync, setSyncStatus };
}
