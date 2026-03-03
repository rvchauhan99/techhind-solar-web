/**
 * Shared notification chime and AudioContext unlock for ERP-style notifications.
 * Unlocks on first user gesture so sound works after browser autoplay policy.
 */

let _ctx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

/** Call once on app load. On first user click/touch, resumes the shared AudioContext. */
export function unlockNotificationSound() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
  };
  document.addEventListener("click", unlock, { once: true, passive: true });
  document.addEventListener("touchstart", unlock, { once: true, passive: true });
}

/**
 * Play the 4-note ERP chime. Uses shared context and resumes if suspended (e.g. after unlock).
 * Respects localStorage "solar-notif-sound" === "false" to mute.
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("solar-notif-sound") === "false") return;
  if (window.__solarSoundEnabled === false) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume().then(() => playNotes(ctx)).catch(() => {});
    else playNotes(ctx);
  } catch (_) {}
}

function playNotes(ctx) {
  const notes = [
    { freq: 659.25, start: 0.0, dur: 1.4 },
    { freq: 523.25, start: 0.9, dur: 1.4 },
    { freq: 392.0, start: 1.8, dur: 1.4 },
    { freq: 261.63, start: 2.7, dur: 0.9 },
  ];
  notes.forEach(({ freq, start, dur }) => {
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.value = freq;
    const t = ctx.currentTime + start;
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.22, t + 0.04);
    g1.gain.setValueAtTime(0.18, t + 0.12);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc1.start(t);
    osc1.stop(t + dur);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
    osc2.start(t);
    osc2.stop(t + dur);
  });
}
