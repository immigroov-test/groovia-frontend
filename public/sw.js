// Kill switch for the service worker the OLD site registered at this path.
//
// That worker is still installed and running in the browser of anyone who visited the old
// www.immigroov.com. It intercepts requests before they reach the network, so it kept serving the old
// app no matter what the server said: our responses carry "no-cache, no-store, must-revalidate" and
// were being ignored, because a service worker sits in front of the HTTP cache entirely. Only a hard
// refresh bypassed it, and real users never hard refresh. They would simply conclude the site had not
// changed.
//
// Deleting the file was not enough. Chrome keeps an existing registration when the update check 404s,
// which is why it survived a week after the new site went live. Serving a real script here is what
// actually removes it: the browser fetches this on its next update check, installs it, and this
// unregisters itself and reloads the page onto the current site. No user action needed.
//
// There is deliberately NO fetch handler. This worker must never intercept a request; its whole job
// is to exist once and then delete itself.
//
// Safe to leave in place. Once a browser has run it there is nothing left to unregister, and for a
// browser that never had the old worker it does nothing at all. Remove it only when you are confident
// no returning visitor is still carrying the old registration.

self.addEventListener('install', () => {
  // Skip waiting so this takes over immediately rather than sitting behind the old worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop everything the old worker had cached, or the stale assets outlive the worker itself.
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));

    await self.registration.unregister();

    // Reload any open tabs so the person sees the current site now, rather than on their next visit.
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});
