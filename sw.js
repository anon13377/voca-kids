// VOCA-CHROME(fix): real, same-origin service worker file.
// Chrome refuses to register a service worker from a blob:/data: URL
// ("unsupported script URL protocol"), so the earlier inline-Blob approach
// silently failed there. This is a plain sibling file registered via
// navigator.serviceWorker.register('sw.js') instead.
//
// Caching strategy is unchanged from the original inline version:
// stale-while-revalidate for navigation requests, caching just the page
// shell (index.html) — there's nothing cross-origin to worry about since
// everything else is inlined into index.html. Also caches this file (sw.js)
// itself so it can be revalidated/updated the same way.
const CACHE = "voca-kids-v1";
const SHELL_URLS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for navigations (the page itself is the only thing
// worth caching — no external assets exist to fetch).
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((res) => {
      cache.put(event.request, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response(
      "Hum-a-Tune is offline and hasn't been cached yet — connect once to play offline later.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  })());
});
