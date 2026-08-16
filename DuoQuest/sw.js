/* DuoQuest - Service Worker (PWA)
 * Met en cache le shell statique de l'application pour un chargement rapide
 * et une expérience installable. Les appels Supabase ne sont JAMAIS mis en cache.
 */
const CACHE_NAME = 'duoquest-v1';

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './config.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// Installation : mise en cache du shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch : cache-first pour le shell statique, réseau direct pour Supabase
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Les appels Supabase sont cross-origin → ne jamais les intercepter
    if (url.origin !== self.location.origin) return;
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Ne mettre en cache que les réponses valides
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return response;
            }).catch(() => caches.match('./index.html'));
        })
    );
});
