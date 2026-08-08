/**
 * Service Worker de GL Streaming.
 *
 * Estrategia:
 * - App shell (HTML, CSS, JS, fuentes, iconos): NETWORK-FIRST con fallback a
 *   cache. El cache-first anterior cacheaba los JS viejos y tras cada deploy
 *   el navegador servia Server Actions obsoletas que ya no existian.
 * - APIs de datos (Supabase, BCV, Kuanto): network-first.
 *
 * ATENCION: La version del cache (CACHE) debe cambiarse en cada deploy que
 * modifique el app shell para forzar la invalidacion del cache viejo.
 */

const CACHE = "gl-streaming-v2";
const RUTAS_SHELL = [
    "/",
    "/login",
    "/dashboard",
    "/manifest.webmanifest",
    "/icon-192.png",
    "/icon-512.png",
    "/logo-gl.png",
];

// Patrón de URLs de datos: Supabase, BCV, Kuanto.
const ES_API_DATOS = /\/rest\/v1\/|\/auth\/v1\/|bcvscrapper|kuanto/i;

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(RUTAS_SHELL)).then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Solo GET; ignorar POST, PUT, etc. (las Server Actions no se cachean).
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // APIs de datos: network-first.
    if (ES_API_DATOS.test(url.pathname) || ES_API_DATOS.test(url.hostname)) {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    // Cachear respuestas válidas para fallback offline.
                    if (res.ok) {
                        const copia = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(request, copia));
                    }
                    return res;
                })
                .catch(() => caches.match(request).then((cached) => cached || Response.error())),
        );
        return;
    }

    // App shell y estaticos: NETWORK-FIRST (cache-first rompia los deploys).
    event.respondWith(
        fetch(request)
            .then((res) => {
                if (res.ok && url.origin === self.location.origin) {
                    const copia = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copia));
                }
                return res;
            })
            .catch(() => {
                // Sin red: servir de cache.
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    if (request.mode === "navigate") return caches.match("/");
                    return Response.error();
                });
            }),
    );
});
