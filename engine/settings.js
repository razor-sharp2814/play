// Settings for grown-ups, kept out of reach of little fingers.
//
// A small grey button sits in the top right. A tap does nothing (apart from
// showing a short "hold for 3 seconds" hint): it has to be held for a few
// seconds, with one finger and without sliding off, while a ring fills up
// around it. Then the settings open over the game. With a mouse it's the
// same, or Tab to the button and hold down Enter or Space.
//
// A palm, a fist or a second finger landing anywhere on the screen cancels
// the hold, so smashing the corner of the screen won't get in.
//
//   const settings = createSettings({
//     title: 'Settings',
//     onOpen(body) { ... },      // fill `body` with the game's settings
//     onClose() { ... },         // closed again: pick up any changes
//   });
//   settings.open();             // open straight away (e.g. first time setup)
//   settings.close();
//   settings.isOpen
//
// Taps, swipes and key presses inside the settings don't reach the game, and
// the settings can scroll and be typed into (see lockDown in core.js).
//
// For a matching look, build the settings from the shared classes in
// engine.css: .gs-section, .gs-heading, .gs-note, .gs-row, .gs-button
// (with .gs-primary or .gs-danger), .gs-input.
//
// Every game's settings end with the same "About" part, added here: the
// version, a "Refresh app" button, an email address for help, and links to
// the games site, Razor Sharp and the legal pages. A game with nothing of its
// own to set can leave out onOpen, and just gets that.

const EMAIL = 'hello@razorsharp.digital';
const LINKS = {
  games: ['Games by Razor Sharp', 'https://play.razorsharp.digital/'],
  company: ['Razor Sharp', 'https://www.razorsharp.digital/'],
  legal: [
    ['Terms', 'https://www.razorsharp.digital/terms-and-conditions'],
    ['Privacy', 'https://www.razorsharp.digital/privacy-policy'],
    ['Cookies', 'https://www.razorsharp.digital/cookies-policy'],
  ],
};

import { gameName } from './core.js';

const RING = 2 * Math.PI * 25;   // length of the ring's circle (r = 25)

export function createSettings(options = {}) {
  const o = {
    title: 'Settings',
    holdFor: 3,          // seconds
    onOpen() {}, onClose() {},
    ...options,
  };

  // ---------- The button ----------
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gs-hold';
  button.setAttribute('aria-label', `${o.title} (press and hold for ${o.holdFor} seconds)`);
  button.title = `${o.title}: click and hold for ${o.holdFor} seconds`;   // shown on hover, with a mouse
  button.innerHTML = `
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <circle class="gs-hold-ring" cx="28" cy="28" r="25" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" />
      <path class="gs-hold-cog" d="M28 19.5l2 .3.7 2.6 1.6.7 2.4-1.3 2.9 2.9-1.3 2.4.7 1.6 2.6.7v4.1l-2.6.7-.7 1.6 1.3 2.4-2.9 2.9-2.4-1.3-1.6.7-.7 2.6h-4.1l-.7-2.6-1.6-.7-2.4 1.3-2.9-2.9 1.3-2.4-.7-1.6-2.6-.7v-4.1l2.6-.7.7-1.6-1.3-2.4 2.9-2.9 2.4 1.3 1.6-.7.7-2.6zM28 25a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z" transform="translate(0 -.8)" />
    </svg>
    <span class="gs-hold-hint">Keep holding</span>`;
  document.body.appendChild(button);
  const ring = button.querySelector('.gs-hold-ring');
  const hint = button.querySelector('.gs-hold-hint');

  // Every finger on the screen, wherever it is, so a palm can be spotted.
  const fingers = new Set();
  document.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse') return;
    fingers.add(ev.pointerId);
    if (hold && ev.pointerId !== hold.id) cancelHold();   // another finger joined: not a grown-up
  }, true);
  const lift = ev => fingers.delete(ev.pointerId);
  document.addEventListener('pointerup', lift, true);
  document.addEventListener('pointercancel', lift, true);
  // a finger lifted while the game was put away never says so
  document.addEventListener('visibilitychange', () => { fingers.clear(); cancelHold(); });

  // Start filling the ring. id is the finger (or mouse) holding the button,
  // or 'key' for Enter or Space held down on a keyboard.
  let hold = null;   // { id, x, y, start, raf }
  function startHold(id, x, y) {
    if (hold || isOpen) return;
    clearTimeout(nudgeTimer);
    button.classList.remove('gs-nudge');
    hint.textContent = 'Keep holding';
    hold = { id, x, y, start: performance.now() };
    button.classList.add('gs-holding');
    const tick = now => {
      if (!hold) return;
      const done = Math.min(1, (now - hold.start) / (o.holdFor * 1000));
      ring.style.strokeDashoffset = RING * (1 - done);
      if (done >= 1) { cancelHold(); open(); return; }
      hold.raf = requestAnimationFrame(tick);
    };
    hold.raf = requestAnimationFrame(tick);
  }
  function cancelHold() {
    if (!hold) return;
    cancelAnimationFrame(hold.raf);
    hold = null;
    button.classList.remove('gs-holding');
    ring.style.strokeDashoffset = RING;
  }
  // Let go too soon (a click, say): show how to open it. With a mouse,
  // nothing else asks to be held down, so without this it seems broken.
  let nudgeTimer;
  function nudge(how) {
    hint.textContent = `${how} and hold for ${o.holdFor} seconds`;
    button.classList.add('gs-nudge');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => button.classList.remove('gs-nudge'), 2500);
  }

  button.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    ev.stopPropagation();                 // the game doesn't see it as a tap
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (fingers.size > 1) return;         // landed as part of a palm or fist
    try { button.setPointerCapture(ev.pointerId); } catch (_) {}
    startHold(ev.pointerId, ev.clientX, ev.clientY);
  });
  button.addEventListener('pointermove', ev => {
    if (hold && ev.pointerId === hold.id && Math.hypot(ev.clientX - hold.x, ev.clientY - hold.y) > 24) cancelHold();
  });
  button.addEventListener('pointerup', ev => {
    if (!hold || ev.pointerId !== hold.id) return;
    cancelHold();
    nudge(ev.pointerType === 'mouse' ? 'Click' : 'Press');
  });
  ['pointercancel', 'lostpointercapture'].forEach(e =>
    button.addEventListener(e, ev => { if (hold && ev.pointerId === hold.id) cancelHold(); }));
  ['pointerup', 'click', 'wheel'].forEach(e => button.addEventListener(e, ev => ev.stopPropagation()));

  // On a keyboard: Tab to the button, then hold down Enter or Space.
  button.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.stopPropagation();                 // the game doesn't see the key
    if (!ev.repeat) startHold('key');
  });
  button.addEventListener('keyup', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.stopPropagation();
    if (hold && hold.id === 'key') { cancelHold(); nudge('Press Enter'); }
  });
  button.addEventListener('blur', () => { if (hold && hold.id === 'key') cancelHold(); });

  // ---------- The panel ----------
  const panel = document.createElement('div');
  panel.className = 'gs-panel';
  panel.hidden = true;
  panel.dataset.unlocked = '';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', o.title);
  panel.innerHTML = `
    <div class="gs-bar">
      <h2 class="gs-title"></h2>
      <button type="button" class="gs-button gs-primary gs-done">Done</button>
    </div>
    <div class="gs-body"></div>
    <div class="gs-body gs-about">
      <div class="gs-section">
        <h3 class="gs-heading">About this game</h3>
        <p class="gs-note gs-version"></p>
        <div class="gs-actions"><button type="button" class="gs-button gs-refresh">Refresh app</button></div>
        <p class="gs-note gs-refresh-note">Downloads the latest version of the game. Anything saved in the game stays as it is.</p>
      </div>
      <div class="gs-section">
        <h3 class="gs-heading">Need a hand?</h3>
        <p class="gs-note">Email <a href="mailto:${EMAIL}">${EMAIL}</a></p>
      </div>
      <footer class="gs-credit">
        <p>Made by <a href="${LINKS.company[1]}" target="_blank" rel="noopener noreferrer">${LINKS.company[0]}</a>.
          More games at <a href="${LINKS.games[1]}" target="_blank" rel="noopener noreferrer">${LINKS.games[0]}</a>.</p>
        <nav aria-label="Legal">${LINKS.legal.map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`).join('')}</nav>
      </footer>
    </div>`;
  panel.querySelector('.gs-title').textContent = o.title;
  const refreshButton = panel.querySelector('.gs-refresh'), refreshNote = panel.querySelector('.gs-refresh-note');
  refreshButton.addEventListener('click', () => refreshApp(refreshButton, refreshNote));
  const body = panel.querySelector('.gs-body');
  panel.querySelector('.gs-done').addEventListener('click', () => close());
  // Keep everything that happens in here away from the game.
  ['pointerdown', 'pointerup', 'pointermove', 'click', 'wheel', 'keydown', 'keyup', 'touchstart', 'touchend'].forEach(e =>
    panel.addEventListener(e, ev => ev.stopPropagation()));
  panel.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
  document.body.appendChild(panel);

  let isOpen = false;
  function open() {
    if (isOpen) return;
    isOpen = true;
    if (navigator.vibrate) navigator.vibrate(30);
    body.replaceChildren();
    panel.hidden = false;
    button.hidden = true;
    panel.scrollTop = 0;
    o.onOpen(body);
    showVersion(panel.querySelector('.gs-version'));
    panel.querySelector('.gs-done').focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    button.hidden = false;
    body.replaceChildren();
    o.onClose();
  }

  return {
    open, close, body,
    get isOpen() { return isOpen; },
  };
}

// ---------- About: version and refreshing ----------

const isMine = (name, key) => key.startsWith(`${name}-v`) && /^\d+(-engine\d+)?$/.test(key.slice(name.length + 2));

// The game's version and the engine's (the shared engine folder), each on a
// line of their own. Read from the copy
// saved on the device (so it's the version actually running), or from the
// server if it hasn't been saved yet.
async function showVersion(el) {
  el.textContent = '';
  let game = null, engine = null;
  try {
    const name = gameName();
    const key = (await caches.keys()).find(k => isMine(name, k));
    const m = key && key.match(/-v(\d+)-engine(\d+)$/);
    if (m) [game, engine] = [m[1], m[2]];
  } catch (_) {}
  if (!game) {
    try {
      const [g, e] = await Promise.all(['sw.js', '../engine/sw.js'].map(f => fetch(f).then(r => r.text())));
      game = (g.match(/version:\s*(\d+)/) || [])[1];
      engine = (e.match(/ENGINE_VERSION = (\d+)/) || [])[1];
    } catch (_) {}
  }
  el.replaceChildren(...(game ? [`App version ${game}`, document.createElement('br'), `Engine version ${engine || '?'}`] : []));
}

// Refresh app: download every file of the game again, straight from the
// server (skipping any copies the browser is holding on to), replace the
// copy saved on the device with them, then restart the game.
//
// Nothing is thrown away until everything new has arrived, so on a poor
// signal or none at all the game keeps working as before. Anything the game
// keeps for itself (like the pictures in Pictures) isn't touched.
async function refreshApp(button, note) {
  const say = text => { note.textContent = text; };
  button.disabled = true;
  say('Getting the latest version…');
  try {
    const name = gameName();
    const saved = [];
    if ('caches' in window) {
      for (const key of (await caches.keys()).filter(k => isMine(name, k))) {
        const cache = await caches.open(key);
        saved.push([cache, await cache.keys()]);
      }
    }
    // Everything saved, plus the page itself in case nothing was saved yet
    const urls = new Set([new URL('./', location.href).href]);
    saved.forEach(([, reqs]) => reqs.forEach(r => urls.add(r.url)));
    const fresh = await Promise.all([...urls].map(async url => {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return [url, res];
    }));
    // All arrived: swap them in
    for (const [cache] of saved) {
      await Promise.all(fresh.map(([url, res]) => cache.put(url, res.clone())));
    }
    // And check for a new version of the saving itself (sw.js)
    const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update().catch(() => {});
      const next = reg.installing || reg.waiting;
      if (next) {
        await new Promise(resolve => {
          const check = () => { if (next.state === 'activated' || next.state === 'redundant') resolve(); };
          next.addEventListener('statechange', check);
          setTimeout(resolve, 20000);
          check();
        });
      }
    }
    say('Done. Restarting…');
    location.reload();
  } catch (_) {
    button.disabled = false;
    say("Couldn't reach the internet, so nothing has changed. Try again when there's signal or Wi-Fi.");
  }
}
