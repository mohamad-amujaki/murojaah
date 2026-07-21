const CACHE = "hafizayat-v7";
const AUDIO_CACHE = "hafizayat-audio-v1";
const CORE = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("hafizayat-") && key !== CACHE && key !== AUDIO_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/quran/surah/")) {
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
            return response;
          })
          .catch(async () => (await caches.match(event.request)) || new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { "content-type": "application/json" } }))
      );
    }
    // Cache-first: once an ayah's audio has been played, it works fully offline afterward.
    if (url.pathname.startsWith("/api/quran/audio/")) {
      event.respondWith(
        caches.open(AUDIO_CACHE).then(async cache => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const response = await fetch(event.request);
          // Cross-origin no-cors audio responses are opaque (status always 0, ok always false) — still safe and worth caching.
          if (response.ok || response.type === "opaque") cache.put(event.request, response.clone());
          return response;
        })
      );
    }
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put("/offline", response.clone()));
          return response;
        })
        .catch(() => caches.match("/offline"))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
