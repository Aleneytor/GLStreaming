/**
 * Service Worker de GL Streaming.
 *
 * Estrategia:
 * - App shell (HTML, CSS, JS, fuentes, iconos): cache-first con fallback a red.
 *   Tras el primer load, la app abre sin red (PWA instalable).
 * - APIs de datos (Supabase, BCV, Kuanto): network-first. Si no hay red,
 *   se intenta cache; si tampoco hay cache, se devuelve error para que la
 *   UI lo muestre (no se inventan datos financieros offline).
 *
 * El SW se registra desde `src/components/registrador-sw.tsx` (cliente).
 * Next.js sirve este archivo estático desde /public/sw.js.
 */

const CACHE = "gl-streaming-v1";
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

    // App shell y estáticos: cache-first.
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((res) => {
                    if (res.ok && url.origin === self.location.origin) {
                        const copia = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(request, copia));
                    }
                    return res;
                })
                .catch(() => {
                    // Si es navegación y no hay cache, devolver la página raíz cacheada.
                    if (request.mode === "navigate") {
                        return caches.match("/");
                    }
                    return Response.error();
                });
        }),
    );
});
