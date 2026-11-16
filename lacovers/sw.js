const CACHE='lacovers-v6.0.0';
const ASSETS=['./','./index.html','./styles.css?v=6.0.0','./app.js?v=6.0.0','./manifest.webmanifest','./assets/raash-front.jpg','./assets/raash-spine.jpg','./icon.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lacovers-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const req=e.request;
  if(new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(fetch(req).then(response=>{
    if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(req,clone));}
    return response;
  }).catch(()=>caches.match(req).then(cached=>cached|| (req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});