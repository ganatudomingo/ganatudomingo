// Gana Tu Domingo - Service Worker (solo para acceso directo / instalación)
var CACHE = 'gtd-v3';
var ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  // Cache only static icons/manifest. NOT the HTML (always fetch fresh).
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Allow page to trigger immediate update
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // NEVER touch Firebase / Google / fonts / non-GET — let them go to network directly
  if (e.request.method !== 'GET' ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1 ||
      url.indexOf('firebaseio.com') !== -1 ||
      url.indexOf('firebase') !== -1) {
    return;
  }

  // For the HTML document: NETWORK FIRST (always fresh), fall back to cache offline
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, copy); });
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  // For static assets (icons): cache first
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(resp) {
        var copy = resp.clone();
        if (resp.status === 200) caches.open(CACHE).then(function(cache){ cache.put(e.request, copy); });
        return resp;
      });
    }).catch(function(){ return fetch(e.request); })
  );
});
