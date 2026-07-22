const CACHE = 'photoatelier-v2.5-photographer-reference-1';
const SHELL = [
  './', './index.html', './en/index.html', './ja/index.html', './ko/index.html', './legacy/index.html', './workspace.html', './manifest.webmanifest', './favicon.jpg', './assets/app.css',
  './assets/landing.css', './assets/beta-feedback.css', './assets/marketing/photoatelier-hero-v1.png', './assets/marketing/photoatelier-workflow-v1.png',
  './src/domain.js', './src/storage.js', './src/feishu-sync.js', './src/app-enhancements.js', './src/legacy-v5-bridge.js', './src/photographer-reference-ui.js', './src/enhancements.css', './src/public-beta.js', './src/beta-feedback.js',
  './data/v5-real-data-catalog.json', './assets/demo/references/pose-01.jpg', './assets/demo/references/pose-02.jpg', './assets/demo/references/pose-03.jpg', './assets/demo/references/pose-04.jpg', './assets/demo/references/pose-05.jpg', './assets/demo/references/pose-06.jpg', './assets/demo/references/pose-07.jpg', './assets/demo/references/pose-08.jpg', './assets/demo/references/pose-09.jpg', './assets/demo/references/pose-10.jpg', './assets/demo/references/pose-11.jpg', './assets/demo/references/pose-12.jpg',
  './src/app.js', './src/core/api-client.js', './src/core/lut.js', './src/core/project-context.js',
  './src/core/schema.js', './src/core/storage.js', './src/core/utils.js',
  './src/services/agent-service.js', './src/services/data-service.js', './src/services/role-workspace.js', './src/services/project-templates.js',
  './src/services/feedback-analytics.js',
  './src/pages/dashboard.js', './src/pages/references.js', './src/pages/plan.js', './src/pages/schedule.js',
  './src/pages/crew.js', './src/pages/post.js', './src/pages/review.js', './src/pages/system.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
