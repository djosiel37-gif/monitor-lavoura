/* Monitor de Lavoura: guarda o app no aparelho para abrir sem internet */
var APP="ml-app-v1",MAPA="ml-mapa-v1",MAX_TILES=6000;
var SHELL=["./","index.html","manifest.json","apple-touch-icon.png","icone-192.png","icone-512.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(APP).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==APP&&k!==MAPA}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function comTempo(p,ms){return new Promise(function(ok,no){var t=setTimeout(function(){no(new Error("tempo"))},ms);p.then(function(r){clearTimeout(t);ok(r)},function(e){clearTimeout(t);no(e)})})}
var podando=false;function poda(){if(podando)return;podando=true;caches.open(MAPA).then(function(c){return c.keys().then(function(ks){var x=ks.length-MAX_TILES;return x>0?Promise.all(ks.slice(0,x).map(function(k){return c.delete(k)})):null})}).then(function(){podando=false},function(){podando=false})}
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET")return;var u=new URL(r.url);
  // imagens de satélite: usa a guardada; se não tiver, baixa e guarda
  if(u.hostname==="server.arcgisonline.com"){e.respondWith(caches.open(MAPA).then(function(c){return c.match(r.url).then(function(h){return h||fetch(r.url,{mode:"cors"}).then(function(res){if(res.ok){c.put(r.url,res.clone());poda()}return res},function(){return fetch(r)})})}));return}
  if(u.origin!==self.location.origin)return; // Supabase e outros: sempre pela rede
  // app: tenta a versão nova (até 4 s); sem sinal, abre a guardada
  e.respondWith(comTempo(fetch(r),4000).then(function(res){if(res.ok){var cp=res.clone();caches.open(APP).then(function(c){c.put(r,cp)})}return res})
    .catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(h){return h||caches.match("index.html")})}))});
self.addEventListener("message",function(e){if(!e.data||e.data.tipo!=="mapa")return;var urls=e.data.urls||[],n=0,ok=0,port=e.ports[0];
  caches.open(MAPA).then(function(c){var i=0,vivos=4;function prox(){if(i>=urls.length){if(--vivos===0){port&&port.postMessage({fim:true,ok:ok,n:n,total:urls.length});poda()}return}var u=urls[i++];
    c.match(u).then(function(h){if(h){n++;ok++;return}return fetch(u,{mode:"cors"}).then(function(res){n++;if(res.ok){ok++;return c.put(u,res)}})}).catch(function(){n++})
     .then(function(){if(n%25===0)port&&port.postMessage({n:n,ok:ok,total:urls.length});prox()})}
    for(var k=0;k<4;k++)prox()})});
