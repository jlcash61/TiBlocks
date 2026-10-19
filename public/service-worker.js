const CACHE='tiblocks-reborn-v1';
const ASSETS=['./','./index.html','./style.css','./engine.js','./app.js','./manifest.json','./assets/favicon.png','./assets/tblockIcon192.png','./assets/tblockIcon512.png',...['click','complete','gameover','invalid','place'].map(n=>'./assets/sounds/'+n+'.mp3')];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tiblocks-reborn-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error())))});
