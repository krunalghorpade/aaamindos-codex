export const prefix = 'kratex_';
export function read(key, fallback) {
  try { const value = localStorage.getItem(prefix + key); return value === null ? fallback : JSON.parse(value); }
  catch { console.warn(`Mind OS: could not read ${key}. Original data was preserved.`); return fallback; }
}
export function write(key, value) {
  try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; }
  catch { console.warn(`Mind OS: could not save ${key}.`); return false; }
}
export function id() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}
export function localDate() { return new Date().toLocaleDateString('en-CA'); }
