// The counter in the top left, and the party when it reaches the goal.
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
//   party.add();                  // count one (ignored during a party)
//   party.active                  // true while the party is on
//   party.update(dt);             // call every frame
//   party.draw(ctx, W, H);        // call every frame, after drawing the game

import { fanfare } from './audio.js';

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

  function showCount() {
    countEl.textContent = count;
    counterEl.classList.remove('bump');
    void counterEl.offsetWidth;   // restart the bump animation
    counterEl.classList.add('bump');
    setTimeout(() => counterEl.classList.remove('bump'), 150);
  }

  function start() {
    active = true; t = 0;
    counterEl.classList.add('party');
    o.onStart();
    fanfare(o.fanfareVolume);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]);
  }

  function end() {
    active = false;
    count = 0;
    counterEl.classList.remove('party');
    o.onEnd();
    showCount();
  }

  // Count one. Returns false (and counts nothing) during a party.
  function add() {
    if (active) return false;
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

  return {
    add, update, draw,
    get active() { return active; },
  };
}
