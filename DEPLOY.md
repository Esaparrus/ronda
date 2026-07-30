# Despliegue

Contrato P19 (`02-PAQUETES.md`). Tres piezas, tres plataformas: base de datos
(Supabase o Neon, solo como Postgres), servidor de partida (Fly.io, `fly.toml`
y `Dockerfile` en la raíz de este repo) y web (Vercel, raíz `apps/web`). El
navegador nunca habla con la base de datos (00-MASTER.md §1.11): las tres
piezas se comunican así:

```
móvil / tele ──HTTPS/WSS──▶ apps/web (Vercel) ──HTTPS/WSS──▶ apps/server (Fly.io) ──▶ Postgres (Supabase/Neon)
```

## 1. Base de datos (Supabase o Neon)

Cualquiera de los dos sirve: aquí se usan **solo como Postgres gestionado**,
sin RLS, sin cliente en el navegador, sin Realtime (00-MASTER.md §1.11).

1. Crea un proyecto nuevo (Supabase o Neon, región más cercana a `mad` si el
   proveedor lo permite -- reduce la latencia del servidor a la BD).
2. Copia **dos** cadenas de conexión, no una:
   - **Pooler** (Supabase: puerto `6543`, PgBouncer en modo _transaction_;
     Neon: el host con sufijo `-pooler`). Es la que usa el **servidor en
     producción** como `DATABASE_URL` -- muchas conexiones cortas de
     Socket.IO se benefician de un pool compartido en el proveedor.
   - **Directa** (Supabase: puerto `5432`; Neon: el host sin `-pooler`). Úsala
     **solo para ejecutar `pnpm db:migrate`**, una vez, desde tu máquina o
     desde CI -- nunca desde la máquina de Fly en marcha.

   **Por qué la distinción, aunque el contrato solo menciona "el pooler":**
   `apps/server/src/db/migrate.ts` envuelve cada migración en
   `begin / <sql> / insert en _migrations / commit`, como llamadas
   separadas a `pool.query(...)` (`apps/server/src/db/client.ts`). Si esas
   llamadas cayeran en conexiones distintas del pool del lado del _pooler_
   (PgBouncer en modo transacción reasigna la conexión de Postgres real en
   cada transacción, no por cliente), el `begin` y el resto de la
   transacción podrían no compartir sesión y la migración fallaría o
   correría fuera de transacción sin avisar. Con la conexión **directa**
   este riesgo desaparece porque no hay multiplexado de por medio. El
   servidor en marcha no tiene este problema: sus consultas normales
   (`query()` sueltas) no dependen de que dos llamadas compartan sesión.

3. Ejecuta las migraciones una vez, con la URL **directa**:
   ```
   DATABASE_URL="<url-directa>" pnpm db:migrate
   ```
   Aplica `db/migrations/0001_init.sql` (tablas `rooms`, `players`,
   `matches`, `match_events`, `playtest_events`) e imprime cuántas se
   aplicaron. Es idempotente (`apps/server/src/db/migrate.test.ts`): volver
   a ejecutarlo no rompe nada, solo dice "sin migraciones pendientes".

## 2. Servidor (Fly.io)

Un único proceso Node con las salas en memoria (00-MASTER.md §2) -- por eso
`fly.toml` fija `min_machines_running = 1` **y** `auto_stop_machines = false`:
tiene que haber siempre exactamente una máquina viva. Cero máquinas pierde
todas las salas; dos o más las fragmenta entre procesos que no se hablan.

1. Instala `flyctl` y autentícate (`fly auth login`).
2. Desde la raíz del repo (donde están `Dockerfile` y `fly.toml`):
   ```
   fly launch --no-deploy --copy-config --name ronda-server
   ```
   (o `fly apps create ronda-server` si prefieres crear la app a mano; el
   nombre `ronda-server` de `fly.toml` es un valor de partida, cámbialo si
   ya está cogido).
3. Configura los secretos (nunca van en `fly.toml`, que si se versiona
   queda en claro):
   ```
   fly secrets set DATABASE_URL="<url-del-pooler>"
   fly secrets set CORS_ORIGIN="https://<tu-dominio-de-vercel>"
   ```
   `CORS_ORIGIN` no es un secreto de verdad, pero depende del dominio de
   Vercel del paso 3, que no existe hasta que despliegues la web -- por eso
   no lleva un valor por defecto útil en `fly.toml` (ver comentario ahí).
4. Despliega:
   ```
   fly deploy
   ```
   Esto construye la imagen con el `Dockerfile` de la raíz (Node 22 alpine,
   usuario `node` sin privilegios, instala solo `@ronda/server` y sus
   dependencias de workspace -- `packages/protocol`, `packages/engine` --
   con `pnpm install --frozen-lockfile --prod`, sin tocar `apps/web`).
5. Confirma que sigue habiendo **una sola** máquina:
   ```
   fly scale count 1
   fly status
   ```
6. Comprueba el health check:
   ```
   curl https://ronda-server.fly.dev/health
   ```
   Debe responder `{"ok":true,"uptime":...,"rooms":0}` (contrato P5,
   `apps/server/src/http.ts`). Fly también lo comprueba solo, cada 15s
   (`fly.toml`, `http_service.checks`), y reinicia la máquina si falla.

## 3. Web (Vercel)

1. Importa el repo en Vercel. En "Root Directory" pon **`apps/web`** (el
   repo es un monorepo pnpm; Vercel detecta Next.js solo si apunta ahí).
2. Variable de entorno, en Vercel → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SERVER_URL=https://ronda-server.fly.dev
   ```
   Es pública a propósito (prefijo `NEXT_PUBLIC_`): el navegador la necesita
   para abrir el socket contra el servidor -- no lleva ningún secreto.
3. Despliega (Vercel lo hace solo en cada push, o `vercel --prod` a mano).
4. Vuelve al paso 2 del servidor y fija `CORS_ORIGIN` con el dominio real
   que Vercel te haya dado, luego `fly deploy` otra vez (o
   `fly secrets set` ya reinicia la máquina sola con el nuevo valor, sin
   necesitar rebuild de imagen).

## 4. Comprobación posterior al despliegue

Tal cual pide el contrato, en este orden:

1. `curl https://ronda-server.fly.dev/health` → `ok: true`.
2. Desde el móvil A (datos móviles, no wifi de casa): entra a la web de
   Vercel, crea una sala.
3. Desde el móvil B (datos móviles de **otra** compañía o al menos otra
   red -- el objetivo es que no compartan NAT/wifi con el móvil A, para
   probar la conexión real por Internet, no solo en la misma LAN): escanea
   el QR o entra con el código, únete.
4. Juega una partida completa de Chinchón hasta que alguien quede
   eliminado o gane. Confirma que las cartas cierran, puntúan y el
   marcador coincide en ambos móviles.

Si el paso 2 o 3 fallan por CORS (la consola del navegador lo dice claro:
"blocked by CORS policy"), revisa que `CORS_ORIGIN` en Fly sea EXACTAMENTE
el dominio de Vercel (con `https://`, sin `/` final).

## Límite conocido (documentado, no un bug)

**No se soporta escalado horizontal.** El contrato lo prohíbe explícitamente
para este paquete ("NO HAGAS: no configures escalado horizontal ni varias
instancias") porque la arquitectura actual no lo permite: `RoomManager`
guarda todas las salas activas en la memoria de un único proceso Node
(00-MASTER.md §2). Una segunda máquina de Fly tendría su propia memoria
vacía; según a qué máquina caiga cada jugador (con un balanceador delante),
la misma sala podría partirse entre dos procesos que no se sincronizan entre
sí. Postgres solo guarda snapshots/eventos para persistencia y telemetría,
no es la fuente de verdad en caliente -- por eso `min_machines_running = 1`
y `auto_stop_machines = false` no son un capricho de coste, son el límite de
arquitectura hecho configuración. Si el playtest (`PLAYTEST.md`, P20)
demuestra que hace falta más capacidad, la solución no es "más máquinas de
Fly con esta misma imagen": es rediseñar cómo vive el estado de sala (p. ej.
particionado por sala con _sticky sessions_ garantizadas, o mover el estado
de sala a un almacén compartido) -- un cambio de arquitectura, no un
`fly scale count 2`.
