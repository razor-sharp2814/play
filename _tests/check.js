// Checks every game still works, including with a poor signal and offline.
// Run it from this folder with:  npm install  (once), then  npm test
// It uses the Google Chrome already installed on this computer.
//
// Every folder with a sw.js in it (apart from engine and _template) is
// treated as a game and checked.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8765, BASE = `http://localhost:${PORT}`;
const only = process.argv[2];
const GAMES = fs.readdirSync(ROOT).filter(d =>
  !d.startsWith('_') && !d.startsWith('.') && d !== 'engine' && fs.existsSync(path.join(ROOT, d, 'sw.js')) &&
  (!only || d === only));

// ---------- A local copy of the site with a switchable signal ----------
// fast: normal. slow: every file takes 2.5s. flaky: every 3rd request is
// dropped. offline: nothing gets through.
let signal = 'fast', requestCount = 0;
let engineBump = 0;   // pretend ENGINE_VERSION has been bumped this many times
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  if (signal === 'offline') return req.socket.destroy();
  if (signal === 'flaky' && ++requestCount % 3 === 0) return req.socket.destroy();
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  const send = () => fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { location: url.pathname + '/' }); return res.end(); }
      file = path.join(file, 'index.html');
    }
    fs.readFile(file, (err2, data) => {
      if (err2) { res.writeHead(404); return res.end('not found'); }
      if (engineBump && url.pathname === '/engine/sw.js') {
        data = String(data).replace(/ENGINE_VERSION = (\d+)/, (_, n) => `ENGINE_VERSION = ${+n + engineBump}`);
      }
      // the same short browser caching GitHub Pages uses
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'max-age=600' });
      res.end(data);
    });
  });
  signal === 'slow' ? setTimeout(send, 2500) : send();
});
const setSignal = s => { signal = s; requestCount = 0; };

// ---------- Helpers ----------
let failures = 0;
function check(ok, label, detail = '') {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
}
async function open(page, url) {
  try { await page.goto(url, { timeout: 15000 }); return true; } catch (_) { return false; }
}
// Wait until the game is saved for offline play, or give up after `ms`.
async function waitUntilSaved(page, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const saved = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active && reg.active.state === 'activated' && navigator.serviceWorker.controller);
    }).catch(() => false);
    if (saved) return true;
    await page.waitForTimeout(250);
  }
  return false;
}
const savedFiles = page => page.evaluate(async () => {
  const out = {};
  for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname);
  return out;
});
// Play: tap until the party starts, then swipe and scroll through everything.
// Returns what went wrong along the way.
async function play(page) {
  const problems = [];
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('requestfailed', r => problems.push(`couldn't load ${new URL(r.url()).pathname}`));
  const { width, height } = page.viewportSize();
  // Games with a counter should party; games without one (like Pictures)
  // just get tapped plenty.
  const hasCounter = await page.evaluate(() => !!document.getElementById('counter'));
  let partied = false;
  for (let i = 0; i < (hasCounter ? 80 : 30) && !partied; i++) {
    await page.mouse.click(width / 2, height / 2);
    await page.waitForTimeout(250);
    if (hasCounter) partied = await page.evaluate(() => document.getElementById('counter').classList.contains('party'));
  }
  if (hasCounter) {
    if (!partied) problems.push('no party after 80 taps');
    await page.waitForTimeout(3500);   // let the party finish
    const count = await page.evaluate(() => document.getElementById('count').textContent);
    if (partied && count !== '0') problems.push(`counter shows ${count} after the party, not 0`);
  }
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(450); }
  // every picture on the page should actually have loaded
  const broken = await page.evaluate(() => [...document.images].filter(i => i.src && !i.hidden && !(i.complete && i.naturalWidth)).map(i => i.src));
  broken.forEach(src => problems.push(`picture not showing: ${src}`));
  return problems;
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({ channel: 'chrome' });
  const fresh = async () => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } });
    ctx.setDefaultTimeout(15000);   // a stuck step fails rather than hanging
    return [ctx, await ctx.newPage()];
  };

  for (const game of GAMES) {
    const url = `${BASE}/${game}/`;
    console.log(`\n${game}`);
    for (const f of ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png']) {
      if (!fs.existsSync(path.join(ROOT, game, f))) check(false, `has ${f}`);
    }

    // Plays properly with a good signal
    let [ctx, page] = await fresh();
    setSignal('fast');
    await open(page, url);
    const problems = await play(page);
    check(!problems.length, 'plays (counting and partying, if it has a counter) with no errors', problems.slice(0, 3).join('; '));
    await ctx.close();

    // A palm or a handful of fingers landing together counts as one tap
    // (engine/taps.js): five touches a few milliseconds apart, then lifted
    [ctx, page] = await fresh();
    await open(page, url);
    await page.waitForTimeout(500);
    const smashed = await page.evaluate(async () => {
      if (!document.getElementById('count')) return 'no counter';
      const count = () => +document.getElementById('count').textContent;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const x = innerWidth / 2, y = innerHeight / 2, el = document.elementFromPoint(x, y);
      const touch = (type, id) => el.dispatchEvent(new PointerEvent(type, { pointerId: 10 + id, pointerType: 'touch',
        isPrimary: id === 0, clientX: x + id * 14, clientY: y, bubbles: true, cancelable: true }));
      const before = count();
      for (let i = 0; i < 5; i++) { touch('pointerdown', i); await wait(15); }
      await wait(60);
      for (let i = 0; i < 5; i++) touch('pointerup', i);
      await wait(500);
      return count() - before;
    });
    if (smashed !== 'no counter') check(smashed === 1, 'a handful of fingers at once counts as one tap', `counted ${smashed}`);
    await ctx.close();

    // Sound: plays when an iPhone is on silent, and comes back after a phone
    // call or another app. Chrome doesn't do either of those iPhone things, so
    // they're imitated here: a pretend iPhone sound setting, and sound that
    // gets stuck as 'interrupted' until it's woken up.
    [ctx, page] = await fresh();
    await ctx.addInitScript(() => {
      navigator.audioSession = { type: 'auto' };
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        constructor(...a) { super(...a); (window.__sounds = window.__sounds || []).push(this); }
      };
    });
    await open(page, url);
    const { width: sw, height: sh } = page.viewportSize();
    await page.mouse.click(sw / 2, sh / 3);
    await page.waitForTimeout(300);
    const first = await page.evaluate(() => ({ session: navigator.audioSession.type, n: (window.__sounds || []).length, state: window.__sounds && window.__sounds[0].state }));
    check(first.session === 'playback', 'asks to play sound even when an iPhone is on silent', `sound setting: ${first.session}`);
    check(first.n === 1 && first.state === 'running', 'sound starts on the first tap', `${first.n} sound player(s), ${first.state}`);
    await page.evaluate(() => {
      const a = window.__sounds[0], realResume = a.resume.bind(a);
      let stuck = true;
      Object.defineProperty(a, 'state', { get: () => (stuck ? 'interrupted' : 'running'), configurable: true });
      a.resume = () => { stuck = false; return realResume(); };
    });
    await page.mouse.click(sw / 2, sh / 3);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__sounds[0].state);
    check(after === 'running', "sound comes back after it's interrupted", `state after a tap: ${after}`);
    await ctx.close();

    // Saved properly with a good signal, then plays offline
    [ctx, page] = await fresh();
    await open(page, url);
    check(await waitUntilSaved(page, 5000), 'saves itself for offline play');
    const saved = Object.entries(await savedFiles(page)).filter(([k]) => k.startsWith(`${game}-`));
    check(saved.length === 1, 'keeps exactly one saved copy', saved.map(([k]) => k).join(', '));
    const files = saved.length ? saved[0][1] : [];
    const missing = ['/engine/core.js', '/engine/audio.js', '/engine/party.js', '/engine/taps.js', '/engine/settings.js', '/engine/engine.css', `/${game}/index.html`]
      .filter(f => !files.includes(f));
    check(!missing.length, 'saved copy includes the engine', missing.join(', '));
    setSignal('offline');
    check(await open(page, url), 'opens offline');
    const offlineProblems = await play(page);
    check(!offlineProblems.length, 'plays offline with everything showing', offlineProblems.slice(0, 3).join('; '));
    check(await open(page, url + '?utm_source=homescreen'), 'opens offline with ?… on the address');
    await ctx.close();

    // First visit on a patchy signal still saves, then works offline
    [ctx, page] = await fresh();
    setSignal('flaky');
    await open(page, url);
    check(await waitUntilSaved(page, 15000), 'saves itself on a patchy signal');
    setSignal('offline');
    check(await open(page, url), 'then opens offline');
    await ctx.close();

    // First visit on a slow signal: pictures shouldn't wait to download
    // (only for games that have pictures on the page)
    [ctx, page] = await fresh();
    setSignal('slow');
    await open(page, url);
    await page.waitForTimeout(3000);
    if (await page.evaluate(() => document.images.length)) {
      const slowProblems = await play(page);
      check(!slowProblems.length, 'pictures appear straight away on a slow signal', slowProblems.slice(0, 3).join('; '));
    }
    await ctx.close();
    setSignal('fast');
  }

  // All games in one browser: saving one mustn't wipe the others' saved copies
  if (GAMES.length > 1) {
    console.log('\nall games together');
    const [ctx, page] = await fresh();
    setSignal('fast');
    for (const game of GAMES) { await open(page, `${BASE}/${game}/`); await waitUntilSaved(page, 5000); }
    const keys = Object.keys(await savedFiles(page));
    for (const game of GAMES) check(keys.some(k => k.startsWith(`${game}-`)), `${game} still saved after opening the others`);
    setSignal('offline');
    for (const game of GAMES) check(await open(page, `${BASE}/${game}/`), `${game} opens offline`);

    // Bumping ENGINE_VERSION alone makes every game save a fresh copy
    setSignal('fast');
    const before = Object.keys(await savedFiles(page));
    engineBump = 1;
    for (const game of GAMES) { await open(page, `${BASE}/${game}/`); await page.waitForTimeout(3000); }
    const after = Object.keys(await savedFiles(page));
    engineBump = 0;
    for (const game of GAMES) {
      const old = before.find(k => k.startsWith(`${game}-`));
      check(after.some(k => k.startsWith(`${game}-`) && k !== old), `${game} saves a fresh copy when the engine version is bumped`);
    }
    await ctx.close();
  }

  // ---------- Pictures: grown-up settings, adding and looking at pictures ----------
  if (GAMES.includes('pictures')) {
    console.log('\npictures: settings and photos');
    setSignal('fast');
    const [ctx, page] = await fresh();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await open(page, `${BASE}/pictures/`);
    await page.waitForTimeout(500);
    const visible = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && !e.closest('[hidden]'); }, sel);
    check(await visible('#empty'), 'shows "no pictures yet" to start with');

    const btn = await page.locator('.gs-hold').boundingBox();
    const bx = btn.x + btn.width / 2, by = btn.y + btn.height / 2;

    // A quick press doesn't open the settings
    await page.mouse.move(bx, by); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
    await page.waitForTimeout(300);
    check(!(await visible('.gs-panel')), "a short press on the settings button doesn't open them");
    const hint = await page.evaluate(() => { const b = document.querySelector('.gs-hold'); return b.classList.contains('gs-nudge') && b.querySelector('.gs-hold-hint').textContent; });
    check(/Click and hold for 3 seconds/.test(hint || ''), 'a click shows how to open the settings', String(hint));

    // A palm (the button held, plus another finger anywhere) doesn't either
    await page.evaluate(async ([x, y]) => {
      const b = document.querySelector('.gs-hold');
      const fire = (el, type, id, px, py) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: px, clientY: py, bubbles: true, cancelable: true }));
      fire(b, 'pointerdown', 31, x, y);
      await new Promise(r => setTimeout(r, 40));
      fire(document.body, 'pointerdown', 32, x - 60, y + 40);
      await new Promise(r => setTimeout(r, 3600));
      fire(b, 'pointerup', 31, x, y); fire(document.body, 'pointerup', 32, x - 60, y + 40);
    }, [bx, by]);
    check(!(await visible('.gs-panel')), "a palm on the settings button doesn't open them");

    // Holding it for 3 seconds does
    await page.mouse.down(); await page.waitForTimeout(3400); await page.mouse.up();
    await page.waitForTimeout(200);
    check(await visible('.gs-panel'), 'holding the settings button for 3 seconds opens them');

    // Make an album, type a name (typing must work inside the settings)
    await page.getByRole('button', { name: 'New album' }).click();
    await page.locator('#pic-name').fill('');
    await page.locator('#pic-name').focus();
    await page.keyboard.type('Seaside');
    await page.keyboard.press('Enter');
    check(await page.locator('#pic-name').inputValue() === 'Seaside', 'typing works in the settings');

    // Add pictures: two real ones (one huge) and one that isn't a picture
    const makeImage = (w, h, colour) => page.evaluate(([w, h, colour]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = colour; g.fillRect(0, 0, w, h);
      return c.toDataURL('image/png').split(',')[1];
    }, [w, h, colour]);
    const images = [
      { name: 'big.png', mimeType: 'image/png', buffer: Buffer.from(await makeImage(3000, 1500, '#e63946'), 'base64') },
      { name: 'small.png', mimeType: 'image/png', buffer: Buffer.from(await makeImage(400, 600, '#457b9d'), 'base64') },
      { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a picture') },
    ];
    await page.locator('.gs-panel input[type=file]').setInputFiles(images);
    await page.waitForFunction(() => document.querySelectorAll('.pic-grid button').length === 2, null, { timeout: 10000 }).catch(() => {});
    check(await page.locator('.pic-grid button').count() === 2, 'adds the pictures that can be read');
    const note = await page.locator('.pic-progress').textContent();
    check(/couldn.t be read/.test(note), 'says when a picture couldn’t be read', note);
    const sizes = await page.evaluate(() => new Promise(resolve => {
      indexedDB.open('pictures').onsuccess = ev => {
        ev.target.result.transaction('photos').objectStore('photos').getAll().onsuccess = async e2 => {
          resolve(await Promise.all(e2.target.result.map(async p => { const b = await createImageBitmap(p.full); return [b.width, b.height, p.full.type]; })));
        };
      };
    }));
    check(sizes.length && sizes[0][0] === 2048 && sizes[0][1] === 1024 && sizes[0][2] === 'image/jpeg', 'big pictures are shrunk to screen size', JSON.stringify(sizes));

    // Done: straight into the pictures (only one album, so no album choice)
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(500);
    const onScreen = () => page.evaluate(() => {
      const s = [...document.querySelectorAll('.slide')].find(e => e.style.left === '0%');
      const img = s && s.querySelector('.photo');
      return { id: s && s.dataset.photo, shown: !!(img && img.complete && img.naturalWidth) };
    });
    const first = await onScreen();
    check(await visible('#viewer') && first.shown, 'shows the first picture after closing the settings');
    check(!(await visible('#home')), 'no albums button with only one album');

    const { width, height } = page.viewportSize();
    await page.mouse.move(width * 0.7, height * 0.3); await page.mouse.down();
    await page.mouse.move(width * 0.4, height * 0.3, { steps: 5 }); await page.mouse.move(width * 0.1, height * 0.3, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    const second = await onScreen();
    check(second.id !== first.id && second.shown, 'swiping shows the next picture');
    await page.mouse.click(width / 2, height / 2);
    await page.waitForTimeout(700);
    check((await onScreen()).id === first.id, 'tapping shows the next picture (and goes round again at the end)');
    await page.locator('#prev').click();
    await page.waitForTimeout(700);
    check((await onScreen()).id === second.id, 'on a computer, the arrow goes back a picture');

    // Pictures are still there offline, after the game is closed and reopened
    await waitUntilSaved(page, 5000);
    setSignal('offline');
    await page.reload();
    await page.waitForTimeout(800);
    check(await visible('#viewer') && (await onScreen()).shown, 'pictures are still there offline after reopening');
    setSignal('fast');

    // A second album: now there's a choice of albums. (Opening the settings
    // from the keyboard this time: Tab to the button, hold down Enter.)
    await page.locator('.gs-hold').focus();
    await page.keyboard.down('Enter'); await page.waitForTimeout(3400); await page.keyboard.up('Enter');
    check(await visible('.gs-panel'), 'holding Enter on the settings button opens them');
    await page.getByRole('button', { name: 'New album' }).click();
    await page.locator('.gs-panel input[type=file]').setInputFiles([images[1]]);
    await page.waitForFunction(() => document.querySelectorAll('.pic-grid button').length === 1, null, { timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(500);
    check(await visible('#viewer') && await visible('#home'), 'stays on the same pictures, now with an albums button');
    await page.locator('#home').click();
    await page.waitForTimeout(500);
    check(await visible('#albums') && await page.locator('.album').count() === 2, 'the albums button shows a choice of both albums');
    await page.locator('.album').last().click();
    await page.waitForTimeout(500);
    check(await visible('#viewer') && (await onScreen()).shown, 'choosing an album shows its pictures');

    check(!errors.length, 'no script errors', errors.slice(0, 3).join('; '));
    await ctx.close();
  }

  // ---------- Updates reach saved copies ----------
  // Each scenario puts out a "new version" (by bumping ENGINE_VERSION) while
  // a saved game is open, and checks when the game swaps over to it.
  const markOld = page => page.evaluate(() => { window.__oldVersion = true; });
  const isOld = page => page.evaluate(() => !!window.__oldVersion).catch(() => true);   // mid-reload counts as old
  const newVersionSaved = (page, n) => page.evaluate(n => caches.keys().then(k => k.some(x => x.endsWith(`-engine${n}`))), n).catch(() => false);
  async function waitFor(fn, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 250)); }
    return false;
  }
  async function openSaved(game) {
    const [ctx, page] = await fresh();
    await open(page, `${BASE}/${game}/`);
    await waitUntilSaved(page, 5000);
    await page.reload();               // now running from the saved copy
    await page.waitForTimeout(500);
    return [ctx, page];
  }
  const ENGINE_NOW = +fs.readFileSync(path.join(ROOT, 'engine/sw.js'), 'utf8').match(/ENGINE_VERSION = (\d+)/)[1];
  const newVersionSaved2 = (page) => newVersionSaved(page, ENGINE_NOW + engineBump);

  for (const game of GAMES) {
    console.log(`\n${game}: updates`);
    setSignal('fast');

    // Just opened, not played yet: swaps straight away
    let [ctx, page] = await openSaved(game);
    await markOld(page);
    engineBump++;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    check(await waitFor(() => newVersionSaved2(page), 10000), 'downloads a new version when the signal comes back');
    check(await waitFor(async () => !(await isOld(page)), 8000), 'swaps to it straight away if no one has played yet');
    await ctx.close();

    // Being played: doesn't interrupt, then swaps when put away
    [ctx, page] = await openSaved(game);
    const { width, height } = page.viewportSize();
    await page.mouse.click(width / 2, height / 2);
    await markOld(page);
    engineBump++;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => newVersionSaved2(page), 10000);
    let interrupted = false;
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(width / 2, height / 2);
      await page.waitForTimeout(1000);
      if (!(await isOld(page))) interrupted = true;
    }
    check(!interrupted, "doesn't reload while someone is playing");
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    check(await waitFor(async () => !(await isOld(page)), 5000), 'swaps to the new version when put away');
    await ctx.close();

    // Played, then left alone: swaps after 30 seconds with no taps
    if (game === GAMES[0]) {
      [ctx, page] = await openSaved(game);
      await page.mouse.click(width / 2, height / 2);
      await markOld(page);
      engineBump++;
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await waitFor(() => newVersionSaved2(page), 10000);
      await page.waitForTimeout(20000);
      const tooSoon = !(await isOld(page));
      check(!tooSoon && await waitFor(async () => !(await isOld(page)), 15000), 'swaps after 30 seconds left alone');
      await ctx.close();
    }
    engineBump = 0;
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
