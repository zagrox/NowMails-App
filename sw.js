// sw.js

const CACHE_NAME = 'megamail-v1.6'; // Incremented cache version
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/src/styles/00_variables.css',
  '/src/styles/01_global.css',
  '/src/styles/02_utilities.css',
  '/src/styles/03_layout.css',
  '/src/styles/components/button.css',
  '/src/styles/components/card.css',
  '/src/styles/components/forms.css',
  '/src/styles/views/auth.css',
  '/locales/en/common.json',
  '/locales/fa/common.json',
  '/locales/en/auth.json',
  '/locales/fa/auth.json'
];

let DYNAMIC_BACKEND_HOST = 'crm.megamail.ir'; // Default fallback host

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_BACKEND_URL') {
        try {
            const backendUrl = new URL(event.data.url);
            DYNAMIC_BACKEND_HOST = backendUrl.hostname;
            console.log('Service Worker: Backend host updated to', DYNAMIC_BACKEND_HOST);
        } catch (e) {
            console.error('Service Worker: Invalid backend URL received', event.data.url);
        }
    }
});

// URLs for runtime caching
const RUNTIME_CACHE_HOSTS = [
  'https://api.elasticemail.com',
  'https://dns.google',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://esm.sh' // For React and other dependencies from esm.sh
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching App Shell');
      return cache.addAll(APP_SHELL_URLS);
    }).catch(err => {
      console.error('Service Worker: Failed to cache app shell:', err);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Combine static and dynamic hosts for caching logic
  const dynamicRuntimeHosts = [DYNAMIC_BACKEND_HOST, ...RUNTIME_CACHE_HOSTS];

  // Network-First strategy for API and external resources to ensure fresh data
  if (dynamicRuntimeHosts.some(host => url.hostname.endsWith(host) || url.hostname.startsWith(host))) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If the request is successful, update the cache with the new data
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If the network fails, serve the content from the cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For all other requests (app assets), use a Cache-First strategy that also populates the cache.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If we have a cached response, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, fetch from the network.
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response (e.g. not a 403 or 404 error)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        // Return the network response, even if it's an error. The browser will handle it.
        return networkResponse;
      });
    })
  );
});
