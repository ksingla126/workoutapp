/* Offline support: the app shell works without a connection. API calls always go to the network. */
const VERSION = "v1";
const SHELL = ["/", "/index.html", "/custom.js", "/platform.js", "/look.js", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"];
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

/* Reminders */
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Reminder", { body: d.body || "", tag: d.tag, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) { if ("focus" in c) return c.focus(); } return self.clients.openWindow(url); }));
});
