# Ronda

Web-app instalable (PWA) para jugar a juegos de cartas en grupo. El primer juego
del MVP es el **Chinchón**. Cada móvil es la mano privada de un jugador; una tele
o tablet opcional hace de tablero público.

## Documentación del proyecto

- `00-MASTER.md` — documento maestro (visión, arquitectura, alcance). **Manda.**
- `01-CONTRATOS.md` — contratos congelados (tipos, red, reglas, BD, diseño).
- `02-PAQUETES.md` — paquetes de tarea P0–P32 y roadmap de paquetes futuros.
- `03-CONTEXTO-PEGABLE.md` — contexto que se pega al inicio de cada sesión.
- `05-LA-CUENTA.md` — investigación, reglas y alcance de la adaptación web de La Cuenta.
- `06-ROADMAP-JUEGOS.md` — producto y paquetes futuros para Banderas, Cifras, Precio justo, Quién lo haría y Completa la frase.
- `DEPLOY.md` — cómo desplegar: base de datos, servidor (Fly.io) y web (Vercel).
- `PLAYTEST.md` — guion de las tres sesiones de playtest con grupos reales.

El roadmap para web, Google Play y App Store está en `MOBILE-MIGRATION.md`.

## Monorepo

```
apps/web        Next.js App Router + Tailwind + Zustand  (solo pinta vistas)
apps/server     Node 22 + node:http + socket.io + pg     (autoridad total)
packages/protocol   zod: mensajes, vistas, config, errores
packages/engine     TypeScript puro y determinista       (reglas del juego)
db/migrations       SQL plano
```

## Requisitos

- Node >= 22 · pnpm >= 10
- Copia `.env.example` a `.env` y rellena los valores.

## Comandos

```
pnpm install
pnpm dev          # levanta la web
pnpm dev:server   # levanta el servidor
pnpm incident -- RND-A1B2C3D4  # recupera un informe de bloqueo desde Postgres
pnpm typecheck && pnpm lint && pnpm test
```

Para probar **La Gran Ronda** en local, deja esos dos procesos abiertos y entra en
`http://localhost:3000/juegos/granronda`. Crea una sala, añade dos IA para llegar al
mínimo de tres jugadores y pulsa **Empezar partida**. La pantalla común está en
`http://localhost:3000/mesa/<CÓDIGO>`.

Gestor: **pnpm** · TypeScript **strict** · ESM en todo.
