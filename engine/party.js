// The counter in the top left, and the party when it reaches the goal.
//
// Optional: a game without a counter or a party (like Pictures) just doesn't
// import this file, and needs nothing else. The checks in _tests only expect
// a party from games with a counter on the page.
//
// The page needs <div id="counter">…<span id="count">0</span></div>.
// The engine handles counting, the bump, the fanfare, the "Party!" text and
// ending the party. Each game adds its own fun through onStart, onUpdate and
// onEnd.
//
//   const party = createParty({
//     onStart() { ... },          // the party has just begun
//     onUpdate(dt, t) { ... },    // every frame of the party; t = seconds in
//     onEnd() { ... },            // the party is over, the counter is back to 0
//   });
//   party.add();                  // count one (ignored during a party, or
//                                 // when the party is switched off)
//   party.active                  // true while the party is on
//   party.update(dt);             // call every frame
//   party.draw(ctx, W, H);        // call every frame, after drawing the game
//   party.settings(body);         // add the party settings to the grown-ups'
//                                 // settings (see engine/settings.js)
//
// Grown-ups can switch the party off, or change how many it takes (10, 20,
// 40 or 80). That's saved on the device for each game. While it's off, the
// counter is hidden and nothing is counted.

import { fanfare } from './audio.js';
import { gameName } from './core.js';

const GOALS = [10, 20, 40, 80];   // the choices in the settings

export function createParty(options = {}) {
  const o = {
    goal: 20,              // how many to count before a party
    length: 3,             // seconds
    fanfareVolume: 0.15,
    onStart() {}, onUpdate() {}, onEnd() {},
    ...options,
  };
  // How the "Party!" text looks. y and size are fractions of the screen
  // height. fill can be a colour, or fill(ctx, fontSize, t) returning one.
  const text = {
    y: 0.14, size: 0.14, stroke: '#1b1b3a', fill: '#ffffff', flash: '255,255,255',
    ...options.text,
  };

  const counterEl = document.getElementById('counter');
  const countEl = document.getElementById('count');
  let count = 0, t = 0, active = false;

  // The grown-ups' choices, saved on the device for this game. Browser
  // storage can be blocked or cleared, so anything missing falls back to on,
  // with the game's own goal.
  const KEY = `${gameName()}:party`;
  const choice = { on: true, goal: o.goal };
  try { Object.assign(choice, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) {}
  if (!GOALS.includes(choice.goal)) choice.goal = GOALS.includes(o.goal) ? o.goal : 20;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (_) {} };
  function apply() {
    o.goal = choice.goal;
    if (counterEl) counterEl.hidden = !choice.on;
    count = 0;
    showCount();
  }

  function showCount() {
    if (!counterEl || !countEl) return;   // no counter on the page: the party still works
    countEl.textContent = count;
    counterEl.classList.remove('bump');
    void counterEl.offsetWidth;   // restart the bump animation
    counterEl.classList.add('bump');
    setTimeout(() => counterEl.classList.remove('bump'), 150);
  }

  function start() {
    active = true; t = 0;
    if (counterEl) counterEl.classList.add('party');
    o.onStart();
    fanfare(o.fanfareVolume);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]);
  }

  function end() {
    active = false;
    count = 0;
    if (counterEl) counterEl.classList.remove('party');
    o.onEnd();
    showCount();
  }

  // Count one. Returns false (and counts nothing) during a party, or when the
  // party is switched off.
  function add() {
    if (active || !choice.on) return false;
    count++;
    showCount();
    if (count >= o.goal) start();
    return true;
  }

  function update(dt) {
    if (!active) return;
    t += dt;
    o.onUpdate(dt, t);
    if (t >= o.length) end();
  }

  function draw(ctx, W, H) {
    if (!active) return;
    let a = 1;
    if (t > o.length - 0.5) a = Math.max(0, (o.length - t) / 0.5);
    // pops in with a little overshoot, then gently pulses
    const pop = t < 0.35 ? 1 - Math.pow(1 - t / 0.35, 3) * Math.cos(t / 0.35 * 5) : 1;
    const sc = pop * (1 + Math.sin(t * 8) * 0.04);
    const fs = Math.min(W * 0.22, H * text.size);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * text.y);
    ctx.rotate(Math.sin(t * 5) * 0.05);
    ctx.scale(sc, sc);
    ctx.font = `900 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = fs * 0.12; ctx.strokeStyle = text.stroke;
    ctx.strokeText('Party!', 0, 0);
    ctx.fillStyle = typeof text.fill === 'function' ? text.fill(ctx, fs, t) : text.fill;
    ctx.fillText('Party!', 0, 0);
    ctx.restore();

    // one soft flash as the party starts
    if (t < 0.35) {
      ctx.fillStyle = `rgba(${text.flash},${0.35 * (1 - t / 0.35)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // The party settings, for the grown-ups' settings panel: a switch, and a
  // slider for how many it takes. Changes apply straight away.
  function settings(body) {
    const things = ((counterEl && counterEl.getAttribute('aria-label')) || 'Taps').toLowerCase();
    const section = document.createElement('div');
    section.className = 'gs-section';
    section.innerHTML = `
      <h3 class="gs-heading">Party</h3>
      <label class="gs-row">
        <span class="gs-grow"><strong>Party mode</strong><small>Music and fun after a number of ${things}</small></span>
        <input type="checkbox" role="switch" class="gs-switch">
      </label>
      <div class="gs-row gs-stack">
        <label class="gs-grow" for="gs-party-goal"><strong>${things[0].toUpperCase() + things.slice(1)} for a party</strong></label>
        <input id="gs-party-goal" type="range" class="gs-range" min="0" max="${GOALS.length - 1}" step="1">
        <div class="gs-ticks" aria-hidden="true">${GOALS.map(g => `<span>${g}</span>`).join('')}</div>
      </div>`;
    const toggle = section.querySelector('.gs-switch'), slider = section.querySelector('.gs-range');
    const show = () => {
      toggle.checked = choice.on;
      slider.value = GOALS.indexOf(choice.goal);
      slider.disabled = !choice.on;
      slider.setAttribute('aria-valuetext', `${choice.goal} ${things}`);
      section.querySelectorAll('.gs-ticks span').forEach((s, i) => s.classList.toggle('gs-on', GOALS[i] === choice.goal));
    };
    toggle.addEventListener('change', () => { choice.on = toggle.checked; save(); apply(); show(); });
    slider.addEventListener('input', () => { choice.goal = GOALS[+slider.value]; save(); apply(); show(); });
    show();
    body.append(section);
  }

  apply();

  return {
    add, update, draw, settings,
    get on() { return choice.on; },
    get active() { return active; },
  };
}
