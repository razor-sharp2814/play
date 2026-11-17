// Saves the app on the phone so it works with no signal.
// If you change index.html, bump the version number so phones pick up the new copy.
const CACHE = 'button-v9';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  // the emoji pictures on the buttons, so they work offline too
  'emoji/1f411.svg', 'emoji/1f425.svg', 'emoji/1f437.svg', 'emoji/1f438.svg', 'emoji/1f4a7.svg', 'emoji/1f4a9.svg', 'emoji/1f682.svg', 'emoji/1f941.svg', 'emoji/2728.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
