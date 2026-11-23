// Little hands don't tap one finger at a time. A palm, a fist or all five
// fingers landing together reaches the screen as a burst of separate touches,
// a few milliseconds apart, and each one would otherwise count as a tap.
//
// The tap guard turns each burst into one tap:
//
//   const taps = createTapGuard();
//   document.addEventListener('pointerdown', ev => {
//     if (!taps.accept(ev)) return;   // part of the same smash: ignore it
//     ...play...
//   });
//
// A touch is ignored when:
//   - it lands within `quiet` ms of any other touch (fingers landing
//     together, or rolling across the screen one after another), or
//   - another finger that landed less than `smash` ms ago is still down
//     (a palm, pressed and held, with more fingers joining it).
// However much she smashes, one tap still gets through every `atLeast` ms,
// so the game never seems to stop working. Quick taps with one finger, or
// two hands taking turns, all count as normal.
//
// The guard doesn't stop the page seeing the other touches, so a game can
// still use them (for swiping, say). It only answers "is this a new tap?".

export function createTapGuard(options = {}) {
  const o = { quiet: 140, smash: 350, atLeast: 600, ...options };
  const down = new Map();            // pointerId -> when it landed
  let lastTouch = -Infinity, lastTap = -Infinity;

  const lift = ev => down.delete(ev.pointerId);
  document.addEventListener('pointerup', lift, true);
  document.addEventListener('pointercancel', lift, true);

  function accept(ev) {
    const now = performance.now();
    const sinceTouch = now - lastTouch;
    let othersJustLanded = false;
    for (const [id, at] of down) if (id !== ev.pointerId && now - at < o.smash) othersJustLanded = true;
    down.set(ev.pointerId, now);
    lastTouch = now;

    const isNew = now - lastTap >= o.atLeast || (sinceTouch >= o.quiet && !othersJustLanded);
    if (isNew) lastTap = now;
    return isNew;
  }

  return { accept };
}
