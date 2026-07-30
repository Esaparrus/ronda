// Service worker de Ronda, escrito a mano — sin librerías de PWA. Contrato P10.
//
// Estrategia (deliberadamente mínima): precache del "shell" de arranque
// (rutas de entrada + estáticos) para que la app abra sin pantalla en blanco
// incluso con la red inestable; TODO lo demás pasa siempre por red
// (NetworkOnly), porque una partida es en tiempo real y nunca debe servirse
// una vista de caché ni una respuesta de socket.
const CACHE_NAME = 'ronda-shell-v1';

const SHELL_URLS = ['/', '/unirse', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET, y solo del propio origen: todo lo demás (sockets, POST, otros
  // orígenes) ni se intercepta — NetworkOnly implícito, tal cual el contrato.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Shell precacheado: se sirve de caché al instante y se refresca en
  // segundo plano. Si no hay caché (primera visita), va a la red.
  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Todo lo demás: no se intercepta. NetworkOnly.
});
