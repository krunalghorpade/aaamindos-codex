import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { accessRequest } from './lib/access';
import './access.css';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const lockMarker = 'kratex_device_locked';
function pendingLock() { try { return localStorage.getItem(lockMarker) === '1'; } catch { return false; } }
function rememberLock(locked) { try { locked ? localStorage.setItem(lockMarker, '1') : localStorage.removeItem(lockMarker); } catch {} }

export default function AccessGate() {
  const [phase, setPhase] = useState('boot');
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('Initializing interface');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [Workspace, setWorkspace] = useState(null);
  const input = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const pause = ms => delay(reduced ? 0 : ms);
    (async () => {
      setPhase('boot'); setError(''); setProgress(8); setStep('Initializing interface');
      try {
        await pause(400);
        if (cancelled) return;
        setProgress(28); setStep('Checking device access');
        if (pendingLock()) { await accessRequest('DELETE', undefined, controller.signal); rememberLock(false); }
        const authenticated = await accessRequest('GET', undefined, controller.signal);
        if (cancelled) return;
        setProgress(64); setStep(authenticated ? 'Device recognized' : 'Access check complete');
        await pause(650);
        if (cancelled) return;
        const module = authenticated ? await import('./App') : null;
        if (cancelled) return;
        setProgress(88); setStep(authenticated ? 'Preparing your workspace' : 'Preparing access terminal');
        await pause(650);
        if (cancelled) return;
        setProgress(100); setStep(authenticated ? 'Access granted' : 'Authorization required');
        await pause(450);
        if (cancelled) return;
        if (module) { setWorkspace(() => module.default); setPhase('open'); }
        else setPhase('locked');
      } catch (failure) {
        if (!cancelled) { setError(failure.message); setPhase('unavailable'); }
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [attempt]);

  useEffect(() => { if (phase === 'locked' && !busy) input.current?.focus(); }, [phase, busy]);
  useEffect(() => {
    if (!retryAfter) return;
    const timer = setInterval(() => setRetryAfter(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  async function unlock(event) {
    event.preventDefault();
    if (busy || retryAfter || !/^\d{4}$/.test(pin)) return;
    setBusy(true); setError('');
    try {
      const accepted = await accessRequest('POST', pin);
      setPin('');
      if (!accepted) throw new Error('Access denied. Try again.');
      rememberLock(false);
      const module = await import('./App');
      setWorkspace(() => module.default);
      setPhase('open');
    } catch (failure) {
      setPin(''); setError(failure.message); setRetryAfter(failure.retryAfter || 0);
    } finally { setBusy(false); }
  }

  async function lock() {
    rememberLock(true);
    setWorkspace(null); setPhase('locked'); setPin(''); setError(''); setBusy(true);
    try { await accessRequest('DELETE'); rememberLock(false); }
    catch { setError('Remembered access could not be cleared. Reconnect and retry before leaving this device.'); }
    finally { setBusy(false); }
  }

  if (phase === 'open' && Workspace) return <Workspace onLock={lock} />;
  const booting = phase === 'boot';
  return <main className="access-screen">
    <div className="access-grid" aria-hidden="true" />
    <div className="access-orbit" aria-hidden="true"><i /><i /><i /><span>+</span></div>
    <header className="access-header">
      <div className="access-brand"><svg viewBox="0 0 60 40" fill="none" aria-hidden="true"><path d="M2 34 19 5 36 34H25L19 23 13 34ZM24 34 41 5 58 34H47L41 23 35 34" stroke="currentColor" strokeWidth="2" /></svg><span>AAA <b>MIND OS</b><small>PERSONAL OPERATING SYSTEM</small></span></div>
      <span className="access-classification"><i /> PRIVATE ACCESS <span>/ V1.0</span></span>
    </header>
    <section className="access-terminal" aria-labelledby="access-title">
      <div className="access-eyebrow"><span>{booting ? '01 / SYSTEM INITIALIZATION' : '02 / IDENTITY CHECK'}</span><LockKeyhole size={14} /></div>
      <div className="access-title-row"><h1 id="access-title">Your mind.<br /><span>{booting ? 'Coming online.' : 'For your eyes only.'}</span></h1><div className="access-fingerprint" aria-hidden="true"><Fingerprint size={54} strokeWidth={1} /></div></div>
      <p className="access-description">One private space. Every signal. One ultimate direction.</p>
      {booting ? <div className="boot-panel">
        <div className="boot-progress-heading"><span aria-live="polite">{step}</span><strong>{String(progress).padStart(2, '0')}<small>%</small></strong></div>
        <div className="boot-progress" role="progressbar" aria-label="System initialization" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
        <div className="boot-stages" aria-hidden="true"><span className={progress >= 28 ? 'complete' : ''}>01 INTERFACE</span><span className={progress >= 64 ? 'complete' : ''}>02 ACCESS</span><span className={progress === 100 ? 'complete' : ''}>03 READY</span></div>
        <p className="access-wait">PLEASE STAND BY<span className="access-blink">_</span></p>
      </div> : phase === 'unavailable' ? <div className="access-unavailable"><p role="alert">{error}</p><button className="access-submit" onClick={() => setAttempt(value => value + 1)}>RETRY CONNECTION <ArrowRight size={16} /></button></div> : <form className="access-form" onSubmit={unlock}>
        <label htmlFor="access-pin">ENTER YOUR 4-DIGIT ACCESS CODE</label>
        <div className={`pin-control ${error ? 'has-error' : ''}`}>
          <input id="access-pin" ref={input} type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={pin} disabled={busy || !!retryAfter} onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }} aria-describedby="access-hint access-error" aria-invalid={!!error} aria-label="Four-digit access code" required />
          <div className="pin-slots" aria-hidden="true">{[0, 1, 2, 3].map(index => <span key={index} className={`${pin[index] ? 'filled' : ''} ${pin.length === index ? 'current' : ''}`}>{pin[index] ? '•' : <i />}</span>)}</div>
        </div>
        <div id="access-error" className="access-error" role="alert">{retryAfter ? `Access paused. Try again in ${Math.floor(retryAfter / 60)}:${String(retryAfter % 60).padStart(2, '0')}.` : error}</div>
        <button className="access-submit" type="submit" disabled={busy || pin.length !== 4 || !!retryAfter}>{busy ? 'VERIFYING ACCESS' : 'UNLOCK WORKSPACE'}<ArrowRight size={16} /></button>
        <p id="access-hint" className="access-hint"><ShieldCheck size={14} /><span>Access is remembered on this browser.<br />Clear site data or lock the workspace to reset.</span></p>
      </form>}
      <div className="access-terminal-footer"><span><i /> {booting ? 'BOOT SEQUENCE ACTIVE' : 'WORKSPACE LOCKED'}</span><span>KRATEX / PERSONAL</span></div>
    </section>
    <footer className="access-footer"><span>EXTERNAL BRAIN. INTERNAL DIRECTION.</span><span>AUTHORIZED ACCESS ONLY <span className="access-cross">+</span></span></footer>
  </main>;
}
