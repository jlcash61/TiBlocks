const CACHE_NAME = 'tiblocks-cache-v3.0.0'; // Incremented version

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        'index.html',
        'phaser.min.js',
        'main.js',
        'GameScene.js',
        'assets/favicon.png',
        'assets/tblockIcon152ios.png',
        'assets/tblockIcon192.png',
        'assets/tblockIcon512.png',
        'assets/button.png',
        'assets/block.png',
        'assets/sounds/click.mp3',
        'assets/sounds/complete.mp3',
        'assets/sounds/gameover.mp3',
        'assets/sounds/invalid.mp3',
        'assets/sounds/place.mp3',
        'offline.html' 
      ]);
    })
  );
  self.skipWaiting(); // Activate the new service worker as soon as it's finished installing
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => caches.match('offline.html'));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Notify about new updates
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'NEW_VERSION' });
        });
      });
    })
  );
});
