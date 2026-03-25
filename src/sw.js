// PWA Service Worker for CSM App
const CACHE_NAME = 'csm-app-v1';
const STATIC_CACHE = 'csm-static-v1';
const DYNAMIC_CACHE = 'csm-dynamic-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (except Firebase)
  if (!url.origin.includes(self.location.origin) && !url.origin.includes('firebase')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Return offline fallback for images
              if (request.destination === 'image') {
                return new Response('Offline - Image not available', {
                  status: 200,
                  statusText: 'OK',
                  headers: { 'Content-Type': 'text/plain' }
                });
              }
            });
        })
    );
  } else if (url.origin.includes('firebase')) {
    // Firebase requests - network first
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful Firebase responses (short TTL)
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Try cache if network fails
          return caches.match(request);
        })
    );
  } else {
    // Other requests - network first with cache fallback
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Try cache if network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Return offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/index.html');
              }
              
              // Return offline fallback
              return new Response('Offline - Content not available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Background sync for mood tracking
self.addEventListener('sync', (event) => {
  if (event.tag === 'mood-sync') {
    event.waitUntil(syncMoodData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nuova notifica da CSM',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Apri CSM',
        icon: '/assets/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Chiudi',
        icon: '/assets/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CSM - Centro Salute Mentale', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync mood data when online
async function syncMoodData() {
  try {
    // Get cached mood data
    const cachedData = await caches.match('/cached-mood-data');
    if (cachedData) {
      const moodData = await cachedData.json();
      
      // Sync with Firebase
      // This would integrate with your Firebase service
      console.log('Syncing mood data:', moodData);
      
      // Clear cached data after successful sync
      await caches.delete('/cached-mood-data');
    }
  } catch (error) {
    console.error('Error syncing mood data:', error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mood-reminder') {
    event.waitUntil(
      self.registration.showNotification('Promemoria Umore', {
        body: 'Come ti senti oggi? Registra il tuo stato d\'animo.',
        icon: '/assets/icons/icon-192x192.png',
        tag: 'mood-reminder'
      })
    );
  }
});

// Cleanup old cache entries periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
