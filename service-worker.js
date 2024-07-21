self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('tiblocks-cache-v1').then((cache) => {
        return cache.addAll([
          '/',
          'index.html',
          'phaser.min.js',
          'main.js',
          'assets/favicon.png',
          'offline.html'  // Add offline page to cache
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
            if (key !== 'tiblocks-cache-v1') {
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
  