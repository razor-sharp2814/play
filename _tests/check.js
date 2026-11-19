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
let engineBumped = false;   // pretend ENGINE_VERSION has been bumped
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
      if (engineBumped && url.pathname === '/engine/sw.js') {
        data = String(data).replace(/ENGINE_VERSION = (\d+)/, (_, n) => `ENGINE_VERSION = ${+n + 1}`);
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
  let partied = false;
  for (let i = 0; i < 80 && !partied; i++) {
    await page.mouse.click(width / 2, height / 2);
    await page.waitForTimeout(250);
    partied = await page.evaluate(() => document.getElementById('counter').classList.contains('party'));
  }
  if (!partied) problems.push('no party after 80 taps');
  await page.waitForTimeout(3500);   // let the party finish
  const count = await page.evaluate(() => document.getElementById('count').textContent);
  if (partied && count !== '0') problems.push(`counter shows ${count} after the party, not 0`);
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
    check(!problems.length, 'plays, counts and parties with no errors', problems.slice(0, 3).join('; '));
    await ctx.close();

    // Saved properly with a good signal, then plays offline
    [ctx, page] = await fresh();
    await open(page, url);
    check(await waitUntilSaved(page, 5000), 'saves itself for offline play');
    const saved = Object.entries(await savedFiles(page)).filter(([k]) => k.startsWith(`${game}-`));
    check(saved.length === 1, 'keeps exactly one saved copy', saved.map(([k]) => k).join(', '));
    const files = saved.length ? saved[0][1] : [];
    const missing = ['/engine/core.js', '/engine/audio.js', '/engine/party.js', '/engine/engine.css', `/${game}/index.html`]
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
    engineBumped = true;
    for (const game of GAMES) { await open(page, `${BASE}/${game}/`); await page.waitForTimeout(3000); }
    const after = Object.keys(await savedFiles(page));
    engineBumped = false;
    for (const game of GAMES) {
      const old = before.find(k => k.startsWith(`${game}-`));
      check(after.some(k => k.startsWith(`${game}-`) && k !== old), `${game} saves a fresh copy when the engine version is bumped`);
    }
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
