// Service Worker for Quick Fact Checker
// Handles offline functionality and API error management

const CACHE_NAME = 'fact-checker-v1';
const API_CACHE_NAME = 'fact-checker-api-v1';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  '/static/images/contact-side.jpg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
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
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests with error management
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests to /predict endpoint
  if (url.pathname === '/predict' && request.method === 'POST') {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static asset requests
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Handle API requests with comprehensive error handling
async function handleAPIRequest(request) {
  try {
    console.log('Service Worker: Making API request to /predict');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    // Make the actual request with timeout
    const fetchPromise = fetch(request);
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Check if the API returned an error
    if (result.error) {
      throw new Error(`API Error: ${result.error}`);
    }

    console.log('Service Worker: API request successful');
    return new Response(JSON.stringify(result), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Service Worker: API request failed', error);
    
    // Determine error type and create appropriate response
    let errorMessage = 'Sorry, something went wrong. Please try again later.';
    let errorType = 'network_error';

    if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your connection and try again.';
      errorType = 'timeout_error';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
      errorType = 'network_error';
    } else if (error.message.includes('API Error')) {
      errorMessage = 'Service temporarily unavailable. Please try again later.';
      errorType = 'api_error';
    }

    // Return error response that the main script can handle
    const errorResponse = {
      error: true,
      message: errorMessage,
      errorType: errorType,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so the main script can handle the error
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static asset requests with cache fallback
async function handleStaticRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // If successful, cache the response
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache available, return offline page or error
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - Quick Fact Checker</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { color: #666; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p class="offline-message">Please check your internet connection and try again.</p>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle background sync for failed requests (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    // Could implement retry logic here for failed API requests
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/static/images/icon-192.png',
      badge: '/static/images/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

console.log('Service Worker: Script loaded');
