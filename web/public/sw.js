// Service worker mínimo: deja pasar todo a la red. Sin caché offline a propósito.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (evento) => evento.respondWith(fetch(evento.request)));
