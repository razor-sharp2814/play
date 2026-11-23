// The farm animals, drawn from scratch so there are no picture files.
//
// Each animal is drawn facing us, about 1 unit tall, standing with its feet
// on (0, 0) (so up is negative y). Scale the canvas before drawing to make
// it any size. pose = { mouth: 0 (shut) to 1 (wide open), blink: 0 (eyes
// open) to 1 (shut) }.
//
//   drawAnimal(ctx, 'cow', { mouth: 0.5, blink: 0 }, pixelsTall);
//
// mouthY is where each animal's mouth is, so the sound can come from it.

const INK = '#3a2a22';
const TAU = Math.PI * 2;

const ell = (ctx, x, y, rx, ry, rot = 0) => ctx.ellipse(x, y, rx, ry, rot, 0, TAU);

// Fill a shape and draw its outline
function shape(ctx, fill, path) {
  ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
}

// A bumpy shape made of overlapping circles (wool, a comb), outlined only
// around the outside: a thick outline first, then the fill on top.
function puffs(ctx, fill, circles) {
  const lw = ctx.lineWidth;
  ctx.lineWidth = lw * 2;
  ctx.beginPath(); circles.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }); ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw;
}
function cloudCircles(cx, cy, rx, ry, puff, n) {
  const out = [[cx, cy, Math.min(rx, ry)]];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    out.push([cx + Math.cos(a) * (rx - puff * 0.5), cy + Math.sin(a) * (ry - puff * 0.5), puff * (0.9 + (i % 3) * 0.1)]);
  }
  out.push([cx - rx * 0.4, cy, ry * 0.8], [cx + rx * 0.4, cy, ry * 0.8]);   // fill the middle
  return out;
}

function eyes(ctx, x, y, r, blink) {
  for (const s of [-1, 1]) {
    const ex = x * s;
    if (blink > 0.7) {   // shut: a happy curve
      ctx.beginPath(); ctx.arc(ex, y - r * 0.2, r * 0.8, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      continue;
    }
    const ry = r * (1 - blink);
    shape(ctx, '#fff', () => ell(ctx, ex, y, r, ry));
    ctx.fillStyle = '#1d1512';
    ctx.beginPath(); ell(ctx, ex + s * -r * 0.12, y + ry * 0.1, r * 0.58, Math.max(0.001, ry * 0.62)); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex + s * -r * 0.3 + r * 0.15, y - ry * 0.25, r * 0.2, 0, TAU); ctx.fill();
  }
}

// A mouth: a smile when shut, a dark oval with a tongue when open
function mouth(ctx, x, y, w, m, lip = INK) {
  if (m < 0.06) {
    ctx.strokeStyle = lip;
    ctx.beginPath(); ctx.arc(x, y - w * 0.6, w * 0.7, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    ctx.strokeStyle = INK;
    return;
  }
  const rx = w * (0.55 + 0.45 * m), ry = w * 1.1 * m;
  ctx.save();
  ctx.beginPath(); ell(ctx, x, y, rx, ry); ctx.fillStyle = '#5a1f27'; ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath(); ell(ctx, x, y + ry * 0.75, rx * 0.7, ry * 0.55); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ell(ctx, x, y, rx, ry); ctx.stroke();
}

function leg(ctx, x, top, w, colour, hoof) {
  shape(ctx, colour, () => ctx.roundRect(x - w / 2, top, w, -top, w * 0.3));
  shape(ctx, hoof, () => ctx.roundRect(x - w / 2, -w * 0.55, w, w * 0.55, [0, 0, w * 0.3, w * 0.3]));
}

function blush(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255, 110, 140, 0.35)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x * s, y, r, 0, TAU); ctx.fill(); }
}

// ---------- The animals ----------

function cow(ctx, p) {
  // tail, swishing out to one side
  ctx.beginPath(); ctx.moveTo(0.36, -0.5); ctx.quadraticCurveTo(0.52, -0.45, 0.5, -0.26); ctx.stroke();
  shape(ctx, '#3b3333', () => ell(ctx, 0.5, -0.24, 0.035, 0.05));
  for (const x of [-0.27, -0.1, 0.1, 0.27]) leg(ctx, x, -0.32, 0.11, '#fffdf7', '#5c4c44');
  shape(ctx, '#fffdf7', () => ell(ctx, 0, -0.42, 0.4, 0.25));
  ctx.save();
  ctx.beginPath(); ell(ctx, 0, -0.42, 0.4, 0.25); ctx.clip();
  ctx.fillStyle = '#2f2a2a';
  ctx.beginPath(); ell(ctx, -0.27, -0.5, 0.13, 0.1, 0.3); ctx.fill();
  ctx.beginPath(); ell(ctx, 0.24, -0.3, 0.13, 0.1, -0.2); ctx.fill();
  ctx.beginPath(); ell(ctx, 0.3, -0.58, 0.07, 0.05); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ell(ctx, 0, -0.42, 0.4, 0.25); ctx.stroke();
  // ears and horns
  for (const s of [-1, 1]) {
    shape(ctx, '#fffdf7', () => ell(ctx, s * 0.3, -0.8, 0.12, 0.055, s * 0.35));
    ctx.fillStyle = '#ffc2c7'; ctx.beginPath(); ell(ctx, s * 0.31, -0.8, 0.07, 0.028, s * 0.35); ctx.fill();
    shape(ctx, '#f3e3b8', () => {
      ctx.moveTo(s * 0.1, -0.9); ctx.quadraticCurveTo(s * 0.2, -0.95, s * 0.2, -1.03);
      ctx.quadraticCurveTo(s * 0.13, -0.98, s * 0.05, -0.95); ctx.closePath();
    });
  }
  // head, with a patch over one eye
  shape(ctx, '#fffdf7', () => ell(ctx, 0, -0.76, 0.24, 0.21));
  ctx.save(); ctx.beginPath(); ell(ctx, 0, -0.76, 0.24, 0.21); ctx.clip();
  ctx.fillStyle = '#2f2a2a'; ctx.beginPath(); ell(ctx, -0.16, -0.86, 0.12, 0.09, 0.4); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ell(ctx, 0, -0.76, 0.24, 0.21); ctx.stroke();
  // muzzle
  shape(ctx, '#ffc2c7', () => ell(ctx, 0, -0.61, 0.19, 0.11));
  ctx.fillStyle = '#7a3c44';
  for (const s of [-1, 1]) { ctx.beginPath(); ell(ctx, s * 0.075, -0.64, 0.026, 0.018); ctx.fill(); }
  mouth(ctx, 0, -0.56, 0.06, p.mouth, '#7a3c44');
  eyes(ctx, 0.1, -0.81, 0.048, p.blink);
  // a little bell
  shape(ctx, '#ffd23f', () => { ctx.arc(0, -0.45, 0.045, Math.PI, 0); ctx.lineTo(0.055, -0.41); ctx.lineTo(-0.055, -0.41); ctx.closePath(); });
}

function sheep(ctx, p) {
  for (const x of [-0.22, -0.08, 0.08, 0.22]) leg(ctx, x, -0.3, 0.075, '#4d4343', '#2a2222');
  puffs(ctx, '#f8f4ea', cloudCircles(0, -0.44, 0.38, 0.23, 0.11, 14));
  for (const s of [-1, 1]) shape(ctx, '#4d4343', () => ell(ctx, s * 0.21, -0.7, 0.1, 0.045, s * 0.3));
  shape(ctx, '#4d4343', () => ell(ctx, 0, -0.66, 0.15, 0.19));
  puffs(ctx, '#f8f4ea', [[-0.07, -0.84, 0.06], [0, -0.87, 0.07], [0.07, -0.84, 0.06]]);
  eyes(ctx, 0.062, -0.69, 0.042, p.blink);
  ctx.fillStyle = '#f2a7b5'; ctx.beginPath(); ell(ctx, 0, -0.575, 0.035, 0.022); ctx.fill();
  ctx.strokeStyle = '#f2a7b5';
  mouth(ctx, 0, -0.525, 0.045, p.mouth, '#f2a7b5');
  ctx.strokeStyle = INK;
}

function pig(ctx, p) {
  ctx.save();
  ctx.lineWidth *= 2.2; ctx.strokeStyle = '#ff9fba'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.38, -0.44); ctx.bezierCurveTo(0.5, -0.5, 0.52, -0.62, 0.45, -0.62);
  ctx.bezierCurveTo(0.38, -0.62, 0.4, -0.52, 0.49, -0.54); ctx.stroke();
  ctx.restore();
  for (const x of [-0.26, -0.1, 0.1, 0.26]) leg(ctx, x, -0.28, 0.11, '#ffb8cb', '#d9768f');
  shape(ctx, '#ffb8cb', () => ell(ctx, 0, -0.38, 0.41, 0.25));
  for (const s of [-1, 1]) {
    shape(ctx, '#ffa3bd', () => { ctx.moveTo(s * 0.08, -0.85); ctx.lineTo(s * 0.27, -0.97); ctx.lineTo(s * 0.25, -0.74); ctx.closePath(); });
  }
  shape(ctx, '#ffb8cb', () => ell(ctx, 0, -0.66, 0.25, 0.23));
  blush(ctx, 0.16, -0.6, 0.05);
  shape(ctx, '#ff94b4', () => ell(ctx, 0, -0.62, 0.11, 0.075));
  ctx.fillStyle = '#8a3550';
  for (const s of [-1, 1]) { ctx.beginPath(); ell(ctx, s * 0.04, -0.62, 0.022, 0.032); ctx.fill(); }
  eyes(ctx, 0.1, -0.74, 0.042, p.blink);
  mouth(ctx, 0, -0.5, 0.05, p.mouth, '#8a3550');
}

function duck(ctx, p) {
  for (const s of [-1, 1]) {
    shape(ctx, '#ff9a1f', () => ctx.rect(s * 0.1 - 0.02, -0.14, 0.04, 0.1));
    shape(ctx, '#ff9a1f', () => { ctx.moveTo(s * 0.1 - 0.1, 0); ctx.lineTo(s * 0.1 + 0.1, 0); ctx.lineTo(s * 0.1, -0.07); ctx.closePath(); });
  }
  shape(ctx, '#ffd93b', () => ell(ctx, 0, -0.33, 0.32, 0.24));
  for (const s of [-1, 1]) shape(ctx, '#f5c222', () => ell(ctx, s * 0.29, -0.35, 0.07, 0.15, -s * 0.4));
  shape(ctx, '#ffd93b', () => ell(ctx, 0, -0.7, 0.2, 0.19));
  ctx.beginPath(); ctx.moveTo(0, -0.89); ctx.quadraticCurveTo(0.02, -0.97, 0.07, -0.95); ctx.stroke();
  blush(ctx, 0.13, -0.66, 0.04);
  eyes(ctx, 0.075, -0.75, 0.042, p.blink);
  const open = p.mouth * 0.06;
  shape(ctx, '#ff8c1a', () => ell(ctx, 0, -0.625 + open, 0.11, 0.04));
  if (p.mouth > 0.06) { ctx.fillStyle = '#5a1f27'; ctx.beginPath(); ell(ctx, 0, -0.64 + open * 0.5, 0.08, open * 0.5 + 0.005); ctx.fill(); }
  shape(ctx, '#ffa53a', () => ell(ctx, 0, -0.655, 0.135, 0.045));
  ctx.fillStyle = '#c4620c';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 0.035, -0.67, 0.009, 0, TAU); ctx.fill(); }
}

function hen(ctx, p) {
  // tail feathers peeking out behind
  shape(ctx, '#7d4320', () => ell(ctx, 0.26, -0.62, 0.06, 0.16, 0.45));
  shape(ctx, '#8f4f26', () => ell(ctx, 0.33, -0.55, 0.05, 0.13, 0.95));
  ctx.save(); ctx.strokeStyle = '#e0a020'; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const x = s * 0.1;
    ctx.lineWidth *= 1.6;
    ctx.beginPath(); ctx.moveTo(x, -0.18); ctx.lineTo(x, -0.01);
    ctx.moveTo(x, -0.01); ctx.lineTo(x - 0.06, 0); ctx.moveTo(x, -0.01); ctx.lineTo(x + 0.06, 0); ctx.moveTo(x, -0.01); ctx.lineTo(x, 0.005);
    ctx.stroke();
    ctx.lineWidth /= 1.6;
  }
  ctx.restore();
  shape(ctx, '#d0803f', () => ell(ctx, 0, -0.4, 0.32, 0.26));
  ctx.fillStyle = '#f0b77a'; ctx.beginPath(); ell(ctx, 0, -0.36, 0.17, 0.17); ctx.fill();
  for (const s of [-1, 1]) shape(ctx, '#b5662d', () => ell(ctx, s * 0.27, -0.4, 0.08, 0.16, -s * 0.3));
  puffs(ctx, '#e63946', [[-0.06, -0.88, 0.045], [0, -0.91, 0.055], [0.06, -0.88, 0.045]]);
  shape(ctx, '#d0803f', () => ell(ctx, 0, -0.73, 0.17, 0.17));
  eyes(ctx, 0.07, -0.77, 0.038, p.blink);
  const open = p.mouth * 0.04;
  shape(ctx, '#e63946', () => ell(ctx, 0, -0.62 + open, 0.025, 0.04));
  if (p.mouth > 0.06) { ctx.fillStyle = '#5a1f27'; ctx.beginPath(); ctx.moveTo(-0.04, -0.705); ctx.lineTo(0.04, -0.705); ctx.lineTo(0, -0.66 + open); ctx.fill(); }
  shape(ctx, '#f2b632', () => { ctx.moveTo(-0.035, -0.69 + open); ctx.lineTo(0.035, -0.69 + open); ctx.lineTo(0, -0.655 + open); ctx.closePath(); });
  shape(ctx, '#f7c64a', () => { ctx.moveTo(-0.05, -0.72); ctx.lineTo(0.05, -0.72); ctx.lineTo(0, -0.675); ctx.closePath(); });
}

export const ANIMALS = {
  cow:   { draw: cow,   mouthY: -0.56, width: 0.84, label: 'Cow' },
  sheep: { draw: sheep, mouthY: -0.53, width: 0.9,  label: 'Sheep' },
  pig:   { draw: pig,   mouthY: -0.5,  width: 0.9,  label: 'Pig' },
  duck:  { draw: duck,  mouthY: -0.64, width: 0.76, label: 'Duck' },
  hen:   { draw: hen,   mouthY: -0.68, width: 0.76, label: 'Hen' },
};

// Draw an animal `tall` pixels tall with its feet at the current origin.
export function drawAnimal(ctx, name, pose, tall) {
  ctx.save();
  ctx.scale(tall, tall);
  ctx.lineWidth = Math.max(1.5, Math.min(5, tall * 0.018)) / tall;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ANIMALS[name].draw(ctx, { mouth: 0, blink: 0, ...pose });
  ctx.restore();
}
