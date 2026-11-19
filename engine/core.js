// The basics every game needs: a full-screen canvas, a locked-down screen
// that little fingers can't zoom, scroll or select, and keeping the screen awake.

// Call once at the start of every game. (Saving for offline play isn't here:
// it lives in each game's page, so it still runs even if these engine files
// didn't download on a poor signal.)
export function startGame() {
  lockDown();
}

// Stop long-presses, zooming, text selection, scrolling and key presses from
// doing anything except play the game.
export function lockDown() {
  ['contextmenu', 'dragstart', 'selectstart', 'gesturestart'].forEach(e =>
    document.addEventListener(e, ev => ev.preventDefault()));
  document.addEventListener('touchmove', ev => ev.preventDefault(), { passive: false });
  document.addEventListener('keydown', ev => ev.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
}

// Keep the screen awake while playing (if the phone allows it). Call on a tap.
let wakeLock = null;
export async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
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
