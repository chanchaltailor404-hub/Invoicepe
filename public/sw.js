const CACHE_NAME = 'invoicepe-cache-v2';
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json?v=12',
  '/favicon.ico?v=12',
  '/apple-touch-icon.png?v=12',
  '/android-chrome-192x192.png?v=12',
  '/android-chrome-512x512.png?v=12',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core billing assets...');
      return cache.addAll(PRE_CACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache failed (some assets might be fetched dynamically to cache at runtime):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-GET requests (e.g. Supabase inserts, analytics) and non-http/https protocols
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle Supabase API calls (Network-Only)
  const isApiCall = url.href.includes('supabase.co') || url.pathname.startsWith('/api/');

  if (isApiCall) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.log('[Service Worker] Supabase/API request failed offline:', err);
        return new Response(JSON.stringify({ offline: true, error: "Internet connection offline" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Handle local app pages, static assets, and third-party files (Stale-While-Revalidate)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Only cache successful standard responses
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          // If network fetch fails, report it
          return null;
        });

        // Return cached response immediately if exists, otherwise fallback to network fetch promise
        return cachedResponse || fetchPromise;
      });
    }).catch(() => {
      // In case of total failure for navigation requests, fall back to root '/'
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
