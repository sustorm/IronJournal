import { isDebugMode } from './debug.js';

const prefix = isDebugMode ? 'ij_debug_' : 'ij_';

export const storage = {
  getProgram: () => JSON.parse(localStorage.getItem(prefix + 'prog') || 'null'),
  setProgram: p => localStorage.setItem(prefix + 'prog', JSON.stringify(p)),
  getSets: () => JSON.parse(localStorage.getItem(prefix + 'sets4') || '{}'),
  setSets: s => localStorage.setItem(prefix + 'sets4', JSON.stringify(s)),
  getSessions: () => JSON.parse(localStorage.getItem(prefix + 'sess4') || '[]'),
  setSessions: s => localStorage.setItem(prefix + 'sess4', JSON.stringify(s)),
  getCoachTake: () => JSON.parse(localStorage.getItem(prefix + 'take') || 'null'),
  setCoachTake: t => localStorage.setItem(prefix + 'take', JSON.stringify(t)),
  getTakeCollapsed: () => JSON.parse(localStorage.getItem(prefix + 'take_collapsed') || 'false'),
  setTakeCollapsed: c => localStorage.setItem(prefix + 'take_collapsed', JSON.stringify(c)),
};
