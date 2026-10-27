/* Offline support: the app shell works without a connection. API calls always go to the network. */
const VERSION = "v13";
const SHELL = ["/", "/index.html", "/custom.js", "/rank-config.js", "/ranks.js", "/platform.js", "/look.js", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"];
const CDN = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("shell-" + VERSION).then((c) => c.addAll([...SHELL, ...CDN]).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return; // live data only
  if (url.hostname.endsWith("supabase.co")) return;
  const sameOrigin = url.origin === location.origin;
  if (sameOrigin) {
    // network first so updates show up right away; the saved copy covers offline
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open("shell-" + VERSION).then((c) => c.put(req.mode === "navigate" ? "/" : req, copy)); } return res; })
      .catch(() => caches.match(req.mode === "navigate" ? "/" : req).then((r) => r || caches.match("/"))));
    return;
  }
  // fonts and libraries: saved copy first
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|unpkg\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open("cdn-" + VERSION).then((c) => c.put(req, copy)); } return res; })));
  }
});
