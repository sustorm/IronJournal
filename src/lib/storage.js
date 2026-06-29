import { isDebugMode } from './debug.js';

const prefix = isDebugMode ? 'ij_debug_' : 'ij_';

export const storage = {
  getProgram: () => JSON.parse(localStorage.getItem(prefix + 'prog') || 'null'),
  setProgram: p => localStorage.setItem(prefix + 'prog', JSON.stringify(p)),
  getSets: () => JSON.parse(localStorage.getItem(prefix + 'sets4') || '{}'),
  setSets: s => localStorage.setItem(prefix + 'sets4', JSON.stringify(s)),
  getSessions: () => JSON.parse(localStorage.getItem(prefix + 'sess4') || '[]'),
  setSessions: s => localStorage.setItem(prefix + 'sess4', JSON.stringify(s)),
};
