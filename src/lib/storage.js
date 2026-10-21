export const prefix = 'kratex_';
export function read(key, fallback) {
  try { const value = localStorage.getItem(prefix + key); return value === null ? fallback : JSON.parse(value); }
  catch { console.warn(`Mind OS: could not read ${key}. Original data was preserved.`); return fallback; }
}
export function write(key, value) {
  try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; }
  catch { console.warn(`Mind OS: could not save ${key}.`); return false; }
}
export function id() { return crypto.randomUUID(); }
export function localDate() { return new Date().toLocaleDateString('en-CA'); }
