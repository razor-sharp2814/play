// The basics every game needs: a full-screen canvas, a locked-down screen
// that little fingers can't zoom, scroll or select, keeping the screen awake,
// and keeping the saved copy up to date.

// Call once at the start of every game. (The first save for offline play
// isn't here: it lives in each game's page, so it still runs even if these
// engine files didn't download on a poor signal.)
export function startGame() {
  lockDown();
  keepUpToDate();
}

// Stop long-presses, zooming, text selection, scrolling and key presses from
// doing anything except play the game.
//
// Anything inside an element marked data-unlocked (such as the grown-ups'
// settings in engine/settings.js) is left alone, so it can scroll and be
// typed into as normal.
const unlocked = ev => ev.target instanceof Element && !!ev.target.closest('[data-unlocked]');
export function lockDown() {
  const block = ev => { if (!unlocked(ev)) ev.preventDefault(); };
  ['contextmenu', 'dragstart', 'selectstart', 'gesturestart'].forEach(e => document.addEventListener(e, block));
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('keydown', block);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
}

// Keep the screen awake while playing (if the device allows it). Call on a tap.
let wakeLock = null;
export async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
}

// Look for a new version of the game whenever there's a chance of signal, and
// swap to it at a moment that won't interrupt play.
//
// Devices only check for a new version when a game is opened from scratch. But
// a device often just wakes a game back up from the background, or the game is
// left open for ages, so this also checks:
//   - whenever the game comes back on screen
//   - when the signal comes back
//   - every 30 minutes while it's open
// A new version downloads in the background. When it's ready, engine/sw.js
// tells the game, and the game reloads into it straight away if no one has
// played yet, otherwise when it's put away or after 30 seconds with no taps,
// so no one is cut off mid-play.
const UPDATE_EVERY = 30 * 60 * 1000;   // ms
const RELOAD_WHEN_IDLE = 30 * 1000;    // ms with no taps before swapping
export function keepUpToDate() {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const check = () => sw.getRegistration().then(reg => reg && reg.update()).catch(() => {});
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  setInterval(check, UPDATE_EVERY);

  let lastPlayed = 0, waiting = false;   // 0 = not touched since it opened
  const played = () => { lastPlayed = Date.now(); };
  ['pointerdown', 'wheel'].forEach(e => document.addEventListener(e, played, { capture: true, passive: true }));

  sw.addEventListener('message', ev => {
    if (!ev.data || ev.data.type !== 'new-version' || waiting) return;
    waiting = true;
    if (ev.ports[0]) ev.ports[0].postMessage('will-reload');   // so engine/sw.js leaves it to us
    const reload = () => location.reload();
    // put away, or only just opened and not played yet: swap straight away
    if (document.visibilityState === 'hidden' || !lastPlayed) return reload();
    // put away (or brought back before the reload could happen)
    document.addEventListener('visibilitychange', reload);
    setInterval(() => { if (Date.now() - lastPlayed >= RELOAD_WHEN_IDLE) reload(); }, 1000);
  });
  sw.startMessages();
}

// Make a canvas fill the screen sharply, and keep it that way when the screen
// turns or resizes. onResize(width, height) runs straight away and after every
// change, so the game can work out its own sizes. Returns the drawing context.
export function fitCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (onResize) onResize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();
  return ctx;
}

// This game's folder name, e.g. "dolphins" for /dolphins/. Saved copies and
// saved settings are named after it, so games never mix theirs up.
export function gameName() {
  const dirs = location.pathname.split('/').filter(Boolean);
  if (dirs.length && /\.[a-z0-9]+$/i.test(dirs[dirs.length - 1])) dirs.pop();   // .../index.html
  return dirs[dirs.length - 1] || 'game';
}
