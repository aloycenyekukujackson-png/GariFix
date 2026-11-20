/* GariFix service worker – inafanya app ifanye kazi offline */
const VER='garifix-v1', TILES='garifix-tiles-v1', MAXTILES=700;
const LEAF='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon-64.png',
  LEAF+'leaflet.min.css',LEAF+'leaflet.min.js',LEAF+'images/layers.png',LEAF+'images/layers-2x.png',LEAF+'images/marker-icon.png',LEAF+'images/marker-shadow.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>null)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
async function trim(cache){
  const keys=await cache.keys();
  if(keys.length>MAXTILES) await Promise.all(keys.slice(0,keys.length-MAXTILES).map(k=>cache.delete(k)));
}
async function swr(req,cacheName,trimIt){
  const cache=await caches.open(cacheName);
  const hit=await cache.match(req);
  const net=fetch(req).then(res=>{
    if(res&&(res.ok||res.type==='opaque')){cache.put(req,res.clone()); if(trimIt) trim(cache);}
    return res;
  }).catch(()=>null);
  return hit||(await net)||Response.error();
}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==='navigate'){
      e.respondWith(fetch(req).then(res=>{const cp=res.clone();caches.open(VER).then(c=>c.put('./index.html',cp));return res;})
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
      return;
    }
    e.respondWith(swr(req,VER,false)); return;
  }
  if(url.hostname==='cdnjs.cloudflare.com'){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{const cp=res.clone();caches.open(VER).then(c=>c.put(req,cp));return res;})));
    return;
  }
  if(/tile\.openstreetmap\.org|arcgisonline\.com/.test(url.hostname)){
    e.respondWith(swr(req,TILES,true)); return;
  }
  // nominatim / routing: mtandaoni tu (app ina fallback)
});
