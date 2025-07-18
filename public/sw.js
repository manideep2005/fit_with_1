// Service Worker for Offline Support and Push Notifications
const CACHE_NAME = 'fit-with-ai-v1';
const urlsToCache = [
    '/',
    '/css/style.css',
    '/js/main.js',
    '/js/theme.js',
    '/js/workout-timer.js',
    '/js/notifications.js',
    '/dashboard',
    '/workouts',
    '/nutrition',
    '/offline.html'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).catch(() => {
                    // If both cache and network fail, show offline page
                    if (event.request.destination === 'document') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification from Fit-With-AI',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/favicon.ico'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/favicon.ico'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Fit-With-AI', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync for offline workout logging
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-workout') {
        event.waitUntil(syncWorkouts());
    }
});

async function syncWorkouts() {
    try {
        // Get pending workouts from IndexedDB
        const pendingWorkouts = await getPendingWorkouts();
        
        for (const workout of pendingWorkouts) {
            try {
                await fetch('/api/workouts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workout)
                });
                
                // Remove from pending after successful sync
                await removePendingWorkout(workout.id);
            } catch (error) {
                console.log('Failed to sync workout:', error);
            }
        }
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// IndexedDB helpers for offline storage
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FitWithAI', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('workouts')) {
                db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function getPendingWorkouts() {
    const db = await openDB();
    const transaction = db.transaction(['workouts'], 'readonly');
    const store = transaction.objectStore('workouts');
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function removePendingWorkout(id) {
    const db = await openDB();
    const transaction = db.transaction(['workouts'], 'readwrite');
    const store = transaction.objectStore('workouts');
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}