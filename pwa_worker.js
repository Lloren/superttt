'use strict';

self.addEventListener('install', event => {
	console.log("active", event);
});

self.addEventListener('activate', event => {
	console.log("active", event);
});

self.addEventListener('fetch', event => {
	console.log("fetch", event);
	if (event.request.method != 'GET') return;
	
	// Prevent the default, and handle the request ourselves.
	event.respondWith(async function() {
		// Try to get the response from a cache.
		const cache = await caches.open('dynamic-v1');
		const cachedResponse = await cache.match(event.request);
		
		if (cachedResponse) {
			// If we found a match in the cache, return it, but also
			// update the entry in the cache in the background.
			event.waitUntil(cache.add(event.request));
			return cachedResponse;
		}
		
		// If we didn't find a match in the cache, use the network.
		return fetch(event.request);
	}());
});