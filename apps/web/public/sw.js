// Service worker de Ronda, escrito a mano — sin librerías de PWA. Contrato P10.
//
// Estrategia (deliberadamente mínima): precache del "shell" de arranque
// (rutas de entrada + estáticos) para que la app abra sin pantalla en blanco
// incluso con la red inestable; TODO lo demás pasa siempre por red
// (NetworkOnly), porque una partida es en tiempo real y nunca debe servirse
// una vista de caché ni una respuesta de socket.
const CACHE_NAME = 'ronda-shell-v4';

// Caché aparte para la baraja (`/cards/*.webp`). No entra en el precache del
// shell: son 40 ficheros que no hacen falta hasta que empieza una partida.
// Se guardan según se piden y ya no se vuelven a pedir — el nombre de cada
// naipe identifica su contenido para siempre, así que no hay nada que
// revalidar; para cambiar de baraja se sube el número de versión.
const CARDS_CACHE_NAME = 'ronda-cards-v1';
const KEEP_CACHES = [CACHE_NAME, CARDS_CACHE_NAME];

const SHELL_URLS = [
  '/',
  '/unirse',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

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
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !KEEP_CACHES.includes(key)).map((key) => caches.delete(key)),
        ),
      )
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

  // Las navegaciones van primero a red. Así una PWA instalada no arranca con
  // el HTML y los chunks de una versión anterior después de un despliegue.
  // Sin conexión se usa la ruta pedida si está precacheada y, como último
  // recurso, la portada offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && SHELL_URLS.includes(url.pathname)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const home = await caches.match('/');
          return (
            home ??
            new Response('Sin conexión', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }),
    );
    return;
  }

  // El resto del shell precacheado (manifest e iconos) se sirve de caché al
  // instante y se refresca en segundo plano.
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

  // Baraja: caché primero. Es lo único de la app que se sirve de caché
  // durante una partida y no contradice el "nunca una vista de caché" de
  // arriba, porque una imagen de un naipe no es estado de la partida: el
  // servidor sigue siendo quien dice qué carta hay en cada sitio.
  if (url.pathname.startsWith('/cards/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CARDS_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Todo lo demás: no se intercepta. NetworkOnly.
});
