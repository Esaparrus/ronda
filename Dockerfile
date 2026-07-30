# Imagen de producción de @ronda/server. Contrato P19.
#
# Solo el servidor de partida se despliega con esta imagen (Fly.io). La web
# (apps/web) NO entra aquí: se despliega aparte en Vercel, que construye
# directamente desde el repo con su propio pipeline (00-MASTER.md §2, "El
# servidor de partida NO va en Vercel" / regla inversa: la web no va en Fly).
#
# Una sola etapa: no hay paso de "build" que compile a JS -- @ronda/server se
# ejecuta directamente desde sus fuentes .ts (mismo "start": "node
# src/index.ts" que en local). Node 22 trae "type stripping" nativo activado
# por defecto (comprobado: node -v => v22.22.3 ejecuta un .ts sin ningún
# flag), así que no hace falta tsc/tsx/ts-node en la imagen final. El
# `"build": "tsc --noEmit"` del package.json es solo type-check, no emite
# nada que esta imagen necesite.
FROM node:22-alpine

WORKDIR /app

# Corepack trae pnpm empaquetado con Node; se fija la versión exacta del
# repo (packageManager en package.json) para que el lockfile se respete
# igual que en local y CI.
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# --- Manifests primero, para que la capa de `pnpm install` se cachee salvo
# que cambien las dependencias (no el código). Solo se copian los manifests
# de los paquetes que @ronda/server necesita en su árbol de workspace:
# packages/protocol y packages/engine. apps/web se deja fuera a propósito.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/engine/package.json packages/engine/package.json

# Se listan los tres paquetes de workspace explícitamente (server + sus dos
# dependencias internas, engine y protocol) en vez de usar el selector
# ascendente `--filter "...@ronda/server"`. Se probó ese selector primero y
# es una trampa real: instala @ronda/engine y @ronda/protocol como
# dependencias de @ronda/server (sus symlinks en apps/server/node_modules
# quedan bien), pero NO instala las dependencias PROPIAS de esos dos
# paquetes (el `@ronda/protocol` y `zod` de los que depende
# packages/engine, por ejemplo) -- sus node_modules quedan vacíos del
# todo. El resultado es un `ERR_MODULE_NOT_FOUND: @ronda/protocol` al
# arrancar, solo visible al ejecutar el servidor de verdad, no en
# typecheck/tests. Listando cada paquete de workspace como su propio
# `--filter` (en vez de dejar que dependa de la resolución transitiva del
# selector `...`), pnpm sí instala el árbol de dependencias completo de
# los tres. Confirmado replicando estas mismas capas COPY/RUN a mano fuera
# de Docker (no hay Docker en este entorno de verificación, ver DEPLOY.md
# / commit de este paquete): con `...@ronda/server` el arranque fallaba,
# con esta lista explícita el servidor arranca y `/health` responde.
#
# --prod omite devDependencies (typescript, vitest, etc.), innecesarias
# para ejecutar. --frozen-lockfile: falla si el lockfile no coincide
# exactamente con los manifests (mismo comportamiento que CI).
#
# Nota sobre dependencias opcionales nativas: `ws` (vía socket.io) declara
# bufferutil/utf-8-validate como opcionales. Si su compilación nativa
# fallara en alpine por falta de toolchain de compilación, pnpm las omite
# sin abortar el install (son opcionales) y `ws` cae a su implementación
# en JS puro -- más lento, pero funcionalmente correcto. Deliberadamente no
# se añaden `python3 make g++` a la imagen para mantenerla mínima: si algún
# día hiciera falta, sería un `apk add --no-cache python3 make g++` antes de
# este RUN y un `apk del` después.
RUN pnpm install --frozen-lockfile --prod \
      --filter @ronda/server \
      --filter @ronda/engine \
      --filter @ronda/protocol

# --- Código fuente. db/migrations tiene que quedar en esta ruta exacta:
# migrate.ts (apps/server/src/db/migrate.ts) resuelve su directorio de
# migraciones subiendo 4 niveles desde su propia carpeta -- eso aterriza
# exactamente en <raíz>/db/migrations, así que la estructura de carpetas del
# monorepo se preserva tal cual dentro de la imagen, no se aplana.
COPY apps/server apps/server
COPY packages/protocol packages/protocol
COPY packages/engine packages/engine
COPY db/migrations db/migrations

# Usuario sin privilegios (contrato P19 explícito: "usuario no root").
# node:22-alpine ya trae un usuario `node` (uid 1000) de fábrica.
USER node

ENV NODE_ENV=production
EXPOSE 8787

# GET /health lo sirve el mismo servidor HTTP (apps/server/src/http.ts) que
# también atiende Socket.IO -- un único puerto, sin proceso aparte.
CMD ["node", "apps/server/src/index.ts"]
