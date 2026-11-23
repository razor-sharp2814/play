// Shared offline saving for every game. Each game's own sw.js loads this file
// and calls saveForOffline(...) with its name, version and any extra files.
//
// Bump ENGINE_VERSION whenever you change anything in the engine folder.
// Every game then saves a fresh copy the next time it's opened with signal.
const ENGINE_VERSION = 6;
// (The fonts are for the settings panel, which matches the listings page.)
const ENGINE_FILES = ['../engine/engine.css', '../engine/core.js', '../engine/audio.js', '../engine/party.js', '../engine/taps.js', '../engine/settings.js',
  '../fonts/Raleway-SemiBold.woff2', '../fonts/Raleway-Bold.woff2'];
const GAME_FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

// Download one file, trying again a few times if a poor signal drops it.
// cache: 'reload' skips the browser's own short-term cache, so a new version
// never gets saved alongside a stale copy of the old one.
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

function saveForOffline({ name, version, files = [] }) {
  // All the games share one storage area on the device, so every saved copy is
  // named after its game, and a game only ever tidies away its own old copies.
  // Matched exactly, so a game called "button" never touches "button-big".
  // (It also covers copies saved before the engine existed, like "button-v10".)
  const CACHE = `${name}-v${version}-engine${ENGINE_VERSION}`;
  const isMine = key => key.startsWith(`${name}-v`) && /^\d+(-engine\d+)?$/.test(key.slice(name.length + 2));
  const FILES = [...GAME_FILES, ...ENGINE_FILES, ...files];

  // Only finish installing once every file is saved, so the game never goes
  // offline half-saved. If it still fails, the old version keeps working and
  // the device tries again next time the game is opened.
  self.addEventListener('install', e => {
    e.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(FILES.map(async f => cache.put(f, await fetchWithRetry(f))));
      await self.skipWaiting();
    })());
  });

  self.addEventListener('activate', e => {
    const done = (async () => {
      const keys = await caches.keys();
      const old = keys.filter(k => isMine(k) && k !== CACHE);
      await Promise.all(old.map(k => caches.delete(k)));
      await self.clients.claim();
      return old.length > 0;
    })();
    e.waitUntil(done);
    // If this replaced an older version, any game already open is still
    // showing the old one, so move it over to the new one. This mustn't hold
    // up activating: the reload comes back through here, and wouldn't be
    // answered until activating had finished.
    done.then(replaced => { if (replaced) moveOpenGamesToNewVersion(); });
  });

  // Games put away in the background reload straight away. A game that's on
  // screen is asked to reload itself when it won't interrupt play (see
  // keepUpToDate in engine/core.js). A game that doesn't answer is a copy
  // from before the engine existed, which can't do that, so it reloads now.
  async function moveOpenGamesToNewVersion() {
    const open = await self.clients.matchAll({ type: 'window' });
    await Promise.all(open.map(async client => {
      if (client.visibilityState !== 'hidden' && await willReloadItself(client)) return;
      try { await client.navigate(client.url); } catch (_) {}
    }));
  }
  function willReloadItself(client) {
    return new Promise(resolve => {
      const reply = new MessageChannel();
      reply.port1.onmessage = () => resolve(true);
      client.postMessage({ type: 'new-version' }, [reply.port2]);
      setTimeout(() => resolve(false), 3000);
    });
  }

  self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    // Asked for straight from the server (Refresh app in engine/settings.js):
    // let it through, rather than answering with the saved copy.
    if (req.cache === 'reload') return;
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
}
