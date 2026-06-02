const CACHE = 'nba2k26-v97';
const STATIC = [
  './nba2k26-build-tracker.html',
  './nba2k26-theme.css',
  './nba2k26-shell.css',
  './nba2k26-visualizations.css',
  './nba2k26-components.css',
  './nba2k26-modals-forms.css',
  './nba2k26-build-detail.css',
  './nba2k26-game-detail.css',
  './nba2k26-ocr-data.css',
  './nba2k26-scout-report.css',
  './nba2k26-readability.css',
  './nba2k26-beauty.css',
  './nba2k26-ultra.css',
  './nba2k26-premium.css',
  './nba2k26-scout-data.js',
  './nba2k26-build-engine.js',
  './nba2k26-badges.js',
  './nba2k26-badge-editor.js',
  './nba2k26-i18n.js',
  './nba2k26-scout-report.js',
  './nba2k26-storage.js',
  './nba2k26-runtime-config.js',
  './nba2k26-cloud-sync.js',
  './nba2k26-game-analysis.js',
  './nba2k26-advanced-analytics.js',
  './nba2k26-visualizations.js',
  './nba2k26-render-modules.js',
  './nba2k26-performance-lab.js',
  './nba2k26-game-panels.js',
  './nba2k26-game-table.js',
  './nba2k26-game-detail.js',
  './nba2k26-player-profile-core.js',
  './nba2k26-player-profiles.js',
  './nba2k26-game-form.js',
  './nba2k26-build-form.js',
  './nba2k26-data-portability.js',
  './nba2k26-data-quality.js',
  './nba2k26-page-shell.js',
  './nba2k26-build-detail.js',
  './nba2k26-build-detail-panels.js',
  './nba2k26-ui-core.js',
  './nba2k26-build-template.js',
  './nba2k26-game-template.js',
  './nba2k26-ocr-templates.js',
  './nba2k26-system-templates.js',
  './nba2k26-html-templates.js',
  './nba2k26-global-games.js',
  './nba2k26-share-card.js',
  './nba2k26-build-compare.js',
  './nba2k26-compare.css',
  './nba2k26-opponent-intel.js',
  './nba2k26-opponent-intel.css',
  './nba2k26-app-bootstrap.js',
  './nba2k26-ovr-estimator.js',
  './nba2k26-app-globals.js',
  './nba2k26-ocr-lazy.js',
  './nba2k26-ocr-parser.js',
  './nba2k26-ocr.js',
  './nba2k26-interactions.js',
  './icon.svg',
  './nba2k26-floral.svg',
  './og-image.png',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function cacheResponse(request, response) {
  if (response && response.ok) {
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, clone));
  }
  return response;
}

// Prefer fresh local files so app fixes are visible immediately, with cache fallback for offline use.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // skip CDN / external requests

  e.respondWith(
    fetch(e.request)
      .then(response => cacheResponse(e.request, response))
      .catch(() => caches.match(e.request))
  );
});
