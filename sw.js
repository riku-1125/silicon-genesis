const CACHE_NAME = 'silicon-genesis-v33';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css?v=33',
  './src/main.js?v=33',
  './src/engine/circuit.js',
  './src/engine/simulator.js',
  './src/engine/evaluator.js',
  './src/engine/blueprints.js',
  './src/engine/romRunner.js',
  './src/engine/romRunner.js?v=33',
  './src/data/characters.js',
  './src/data/codex.js?v=33',
  './src/data/glossary.js?v=33',
  './src/data/prologue.js?v=33',
  './src/data/stages.js?v=33',
  './src/data/symbolReference.js?v=33',
  './src/state/storage.js',
  './src/state/storage.js?v=33',
  './src/audio/sound.js?v=33',
  './src/ui/glossaryPopover.js?v=33',
  './src/ui/miniSchematic.js?v=33',
  './src/ui/storyDiagram.js?v=33',
  './src/ui/prologue.js?v=33',
  './src/ui/physicsLab.js?v=33',
  './src/ui/assemblyIde.js?v=33',
  './src/ui/sceneCanvas.js?v=33',
  './src/ui/workbenchCanvas.js?v=33',
  './src/ui/dialogue.js?v=33',
  './src/ui/modals.js?v=33',
  './assets/icon.svg',
  './assets/portrait_kagari.jpg',
  './assets/portrait_mina.jpg',
  './assets/portrait_hako.jpg',
  './assets/scene_opening_aether.jpg',
  './assets/scene_shelter_hub.jpg',
  './assets/scene_machinery.jpg',
  './assets/scene_surface_rover.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            fetch(new Request(url, { cache: 'reload' }))
              .then((resp) => (resp.ok ? cache.put(url, resp) : null))
              .catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Static art assets: cache-first for instant mobile loads
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((resp) => {
            if (resp && resp.status === 200) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Code & HTML: always revalidate with server (bypass GitHub Pages 10-min HTTP disk cache!)
  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
