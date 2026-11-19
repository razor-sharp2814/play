// Saves the app on the phone so it works with no signal.
// If you change index.html, bump the version number so phones pick up the new copy.
const CACHE = 'button-v10';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  // the emoji pictures on the buttons, so they work offline too. If you add a
  // button, add its picture here (anything missed is still saved the first
  // time it's shown with signal, but listing it means it's there from the start)
  'emoji/1f411.svg', 'emoji/1f425.svg', 'emoji/1f437.svg', 'emoji/1f438.svg', 'emoji/1f4a7.svg', 'emoji/1f4a9.svg', 'emoji/1f682.svg', 'emoji/1f941.svg', 'emoji/2728.svg',
];

// Download one file, trying again a few times if a poor signal drops it.
// cache: 'reload' skips the browser's own short-term cache, so a new version
// never gets saved alongside a stale copy of the old page.
async function fetchWithRetry(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (res.ok) return res;
      throw new Error(`${url}: ${res.status}`);
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise(r => setTimeout(r, 500 * i));
    }
  }
}

// Only finish installing once every file is saved, so the game never goes
// offline half-saved. If it still fails, the old version keeps working and
// the phone tries again next time the game is opened.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(FILES.map(async f => cache.put(f, await fetchWithRetry(f))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Opening the game: always use the saved page, whatever is on the end of
    // the address (e.g. ?utm_source=...), so it opens instantly with no signal.
    if (req.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // Not saved yet: fetch it, and keep a copy for next time.
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
