const CACHE = 'nba2k-v109';
const STATIC = [
  './nba2k-build-tracker.html',
  './nba2k-theme.css',
  './nba2k-shell.css',
  './nba2k-visualizations.css',
  './nba2k-components.css',
  './nba2k-modals-forms.css',
  './nba2k-build-detail.css',
  './nba2k-game-detail.css',
  './nba2k-ocr-data.css',
  './nba2k-scout-report.css',
  './nba2k-readability.css',
  './nba2k-beauty.css',
  './nba2k-ultra.css',
  './nba2k-premium.css',
  './nba2k-mobile.css',
  './nba2k-gamedata.js',
  './nba2k-gamedata-2k26.js',
  './nba2k-gamedata-2k27.js',
  './nba2k-scout-data.js',
  './nba2k-build-engine.js',
  './nba2k-badges.js',
  './nba2k-badge-editor.js',
  './nba2k-i18n.js',
  './nba2k-scout-report.js',
  './nba2k-storage.js',
  './nba2k-runtime-config.js',
  './nba2k-app-update.js',
  './nba2k-cloud-sync.js',
  './nba2k-game-analysis.js',
  './nba2k-advanced-analytics.js',
  './nba2k-visualizations.js',
  './nba2k-render-modules.js',
  './nba2k-performance-lab.js',
  './nba2k-game-panels.js',
  './nba2k-game-table.js',
  './nba2k-game-detail.js',
  './nba2k-player-profile-core.js',
  './nba2k-player-profiles.js',
  './nba2k-game-form.js',
  './nba2k-build-form.js',
  './nba2k-data-portability.js',
  './nba2k-data-quality.js',
  './nba2k-page-shell.js',
  './nba2k-build-detail.js',
  './nba2k-build-detail-panels.js',
  './nba2k-ui-core.js',
  './nba2k-build-template.js',
  './nba2k-game-template.js',
  './nba2k-ocr-templates.js',
  './nba2k-system-templates.js',
  './nba2k-html-templates.js',
  './nba2k-global-games.js',
  './nba2k-share-card.js',
  './nba2k-build-compare.js',
  './nba2k-compare.css',
  './nba2k-opponent-intel.js',
  './nba2k-opponent-intel.css',
  './nba2k-app-bootstrap.js',
  './nba2k-ovr-estimator.js',
  './nba2k-app-globals.js',
  './nba2k-ocr-lazy.js',
  './nba2k-ocr-parser.js',
  './nba2k-ocr.js',
  './nba2k-interactions.js',
  './icon.svg',
  './nba2k-floral.svg',
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
