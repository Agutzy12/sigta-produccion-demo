/*
 * Service worker de SIGTA: permite instalar la aplicación y que abra rápido.
 * - Pantallas, estilos, fuentes e imágenes: se guardan y se sirven desde el dispositivo.
 * - Datos (/api): siempre se piden al servidor (nunca se muestran datos viejos de producción).
 * - Sin conexión: abre igual y avisa que no hay conexión con el servidor.
 */
const VERSION = 'sigta-v3';
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icono-192.png', '/img/logo.png', '/img/logo-oscuro.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navegación: primero la red (versión nueva); si no hay conexión, la pantalla guardada
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((respuesta) => { const copia = respuesta.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copia)); return respuesta; })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Archivos estáticos: primero lo guardado; si no está, se descarga y se guarda
  evento.respondWith(
    caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((respuesta) => {
      if (respuesta.ok) { const copia = respuesta.clone(); caches.open(VERSION).then((c) => c.put(pedido, copia)); }
      return respuesta;
    })),
  );
});
