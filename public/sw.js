const CACHE_NAME = "kora-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];
const CACHEABLE_DESTINATIONS = new Set(["style", "script", "worker", "image", "font", "manifest"]);

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isCacheableAsset(request) {
  const { pathname } = new URL(request.url);

  if (STATIC_ASSETS.includes(pathname)) return true;
  if (pathname.startsWith("/_next/static/")) return true;

  return CACHEABLE_DESTINATIONS.has(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
  if (!isSameOrigin(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match("/");
        return (
          fallback ??
          new Response("Sin conexion.", {
            status: 503,
            statusText: "Offline",
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          })
        );
      })
    );
    return;
  }

  if (!isCacheableAsset(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseClone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
              return cache.put(request, responseClone);
            })
          );
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
