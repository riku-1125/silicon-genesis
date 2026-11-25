const CACHE_NAME = 'silicon-genesis-v43';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css?v=43',
  './src/main.js?v=43',
  './src/engine/circuit.js',
  './src/engine/simulator.js',
  './src/engine/evaluator.js',
  './src/engine/blueprints.js',
  './src/engine/romRunner.js',
  './src/engine/romRunner.js?v=43',
  './src/engine/romRunner8.js',
  './src/engine/romRunner8.js?v=43',
  './src/engine/osHwRunner.js',
  './src/engine/osHwRunner.js?v=43',
  './src/engine/siliconExport.js',
  './src/engine/siliconExport.js?v=43',
  './src/data/characters.js',
  './src/data/chapter3Stages.js',
  './src/data/chapter4Stages.js',
  './src/data/chapter5Stages.js',
  './src/data/chapter5Stages.js?v=43',
  './src/data/codex.js?v=43',
  './src/data/glossary.js?v=43',
  './src/data/prologue.js?v=43',
  './src/data/endings.js?v=43',
  './src/data/stages.js?v=43',
  './src/data/symbolReference.js?v=43',
  './src/state/storage.js',
  './src/state/storage.js?v=43',
  './src/audio/sound.js?v=43',
  './src/ui/glossaryPopover.js?v=43',
  './src/ui/miniSchematic.js?v=43',
  './src/ui/storyDiagram.js?v=43',
  './src/ui/endingCanvas.js?v=43',
  './src/ui/prologue.js?v=43',
  './src/ui/physicsLab.js?v=43',
  './src/ui/assemblyIde.js?v=43',
  './src/ui/ark8Ide.js?v=43',
  './src/ui/ark8OsIde.js?v=43',
  './src/ui/sceneCanvas.js?v=43',
  './src/ui/workbenchCanvas.js?v=43',
  './src/ui/dialogue.js?v=43',
  './src/ui/modals.js?v=43',
  './assets/icon.svg',
  './assets/portrait_kagari.jpg',
  './assets/portrait_mina.jpg',
  './assets/portrait_hako.jpg',
  './assets/portrait_kai.jpg',
  './assets/portrait_ren.jpg',
  './assets/scene_opening_aether.jpg',
  './assets/scene_shelter_hub.jpg',
  './assets/scene_machinery.jpg',
  './assets/scene_surface_rover.jpg',
  './assets/scene_horizon_camp.jpg',
  './assets/scene_ark5_station.jpg',
  './assets/scene_storm_core.jpg',
  './assets/scene_ending_ch1.jpg',
  './assets/scene_ending_bluesky.jpg',
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
