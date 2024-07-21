self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('tiblocks-cache-v1').then((cache) => {
        return cache.addAll([
          '/',
          'index.html',
          'phaser.min.js',
          'main.js',
          'assets/favicon.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  