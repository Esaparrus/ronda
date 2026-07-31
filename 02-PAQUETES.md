# RONDA — Paquetes de tarea (prompts para la IA generadora)

**Cómo se usa cada paquete.** Sesión nueva. Pegas, en este orden:
1. `03-CONTEXTO-PEGABLE.md` entero.
2. Las secciones de `01-CONTRATOS.md` que el paquete indica en **Contexto**.
3. El bloque **PROMPT** del paquete.

Antes de que escriba código, exige: *«Lista los ficheros que vas a crear y espera mi confirmación.»*

---

## P0 · Bootstrap del monorepo

**Contexto:** `00-MASTER.md` §2, §3, §5.

**PROMPT**
> Crea el esqueleto del monorepo `ronda` con pnpm workspaces. Entregables exactos:
> - `package.json` raíz con scripts: `dev`, `dev:web`, `dev:server`, `build`, `typecheck`, `lint`, `test`, `sim`, `db:migrate`.
> - `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
> - `tsconfig.base.json` con `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, `target: "ES2022"`, `module: "ESNext"`, y `paths` para `@ronda/protocol` y `@ronda/engine`.
> - Un `tsconfig.json` por paquete que extienda el base.
> - `packages/protocol/package.json` y `packages/engine/package.json` (tipo `module`, `main` apuntando a `src/index.ts`, sin build propio: los consume TypeScript directamente).
> - `apps/server/package.json` y `apps/web/package.json` vacíos de lógica pero con sus dependencias.
> - ESLint plano (`eslint.config.js`) + Prettier (100 columnas, comillas simples, sin punto y coma final: no, **con** punto y coma).
> - `vitest.config.ts` en la raíz que recoja `packages/**/*.test.ts` y `apps/server/**/*.test.ts`.
> - `.env.example` con: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `NEXT_PUBLIC_SERVER_URL`, `NODE_ENV`.
> - `.gitignore`, `README.md` de 20 líneas.
>
> **Criterios de aceptación:** `pnpm install && pnpm typecheck && pnpm lint && pnpm test` termina sin errores (los tests pueden ser 0).
>
> **NO HAGAS:** no añadas Turborepo, Nx, Docker, CI, Husky, ni ninguna dependencia que no sea la mínima. No escribas lógica de juego.

---

## P1 · `packages/protocol` — contratos compartidos ⚠️ CRÍTICO

**Contexto:** `01-CONTRATOS.md` §1, §2 completo, §5.9 (solo para conocer `GameConfig`).

**PROMPT**
> Implementa `packages/protocol` **exactamente** como está especificado en el contrato que te he pegado. Ficheros:
> - `src/brand.ts` — `APP_NAME = 'Ronda'` y textos de marca.
> - `src/ids.ts` — tipos de identificador y constantes (`ROOM_CODE_ALPHABET`, etc.).
> - `src/result.ts` — `Result`, `ok`, `err`.
> - `src/errors.ts` — `ERROR_CODES`, `ErrorCode`, `AppError`.
> - `src/messages.ts` — mapa `ErrorCode → texto en castellano`, con soporte de interpolación `{n}`.
> - `src/config.ts` — esquema zod `GameConfigSchema` con **todos** los valores por defecto del contrato, más `DEFAULT_CONFIG`.
> - `src/cards.ts` — tipos `Suit`, `Card`, `CardId`, y helpers `parseCardId`, `makeCardId`, `cardPoints(card, config)`.
> - `src/views.ts` — `PublicPlayer`, `CommonView`, `PlayerView`, `TableView`, `RoundResult`.
> - `src/actions.ts` — `GameAction` y su esquema zod.
> - `src/events.ts` — `GameEvent`.
> - `src/socket.ts` — interfaces `ClientToServerEvents` y `ServerToClientEvents` tipadas para Socket.IO, con acks tipados, más un esquema zod por cada payload de entrada.
> - `src/index.ts` — reexporta todo.
>
> Cada tipo debe tener su esquema zod y el tipo debe derivarse del esquema con `z.infer` cuando sea posible, para que no puedan divergir.
>
> **Criterios de aceptación:**
> - Existe un test que valida que `GameConfigSchema.parse({})` devuelve exactamente `DEFAULT_CONFIG`.
> - Existe un test que valida que cada `ErrorCode` tiene texto en `messages.ts` (recorrer `ERROR_CODES`).
> - `parseCardId('oros-12')` y `parseCardId('joker-1')` funcionan; `parseCardId('oros-13')` devuelve error.
> - Cero dependencias salvo `zod`.
>
> **NO HAGAS:** no implementes reglas de juego, ni sockets reales, ni acceso a base de datos. No inventes campos que no estén en el contrato. Si crees que falta algo, escríbelo en un comentario `// TODO(unai):` y sigue.

---

## P2 · `packages/engine` — núcleo puro

**Contexto:** `01-CONTRATOS.md` §3, §3.1, §5.1.

**PROMPT**
> Implementa el núcleo del motor en `packages/engine/src/core/`:
> - `rng.ts` — `mulberry32`, `hashSeed(seed: string): number`, y `shuffle<T>(items: T[], seed: string, calls: number): { items: T[]; calls: number }`. El RNG **nunca** guarda estado fuera del que se le pasa.
> - `deck.ts` — `buildDeck(config): Card[]` (48 cartas + comodines según config), `CARDS_BY_ID: Record<CardId, Card>`, `cardPoints`.
> - `types.ts` — `GameModule<S, A>` tal cual el contrato.
> - `registry.ts` — `GAMES` (de momento vacío, se rellena en P4).
> - `freeze.ts` — `deepFreeze` para usar en tests.
> - `index.ts`.
>
> **Criterios de aceptación (tests obligatorios):**
> - `buildDeck` con `jokers: 2` devuelve 50 cartas, todas con `id` único.
> - Los puntos son correctos: `oros-9` → 9, `copas-10` → 10, `bastos-12` → 10, `joker-1` → 25.
> - `shuffle` con la misma semilla y el mismo `calls` devuelve **siempre** el mismo orden; con `calls` distinto, distinto orden.
> - `shuffle` es una permutación: mismos elementos, distinto orden.
>
> **NO HAGAS:** no escribas nada de Chinchón todavía. No uses `Math.random` ni `Date` en ningún sitio.

---

## P3 · Reglas de Chinchón: combinaciones y puntuación ⚠️ CRÍTICO

**Contexto:** `01-CONTRATOS.md` §5 completo (muy especialmente §5.4, §5.5, §5.9, §5.10).

**PROMPT**
> Implementa el resolver de combinaciones en `packages/engine/src/games/chinchon/melds.ts`, siguiendo **al pie de la letra** el algoritmo del contrato §5.9. No inventes otro algoritmo aunque se te ocurra uno mejor.
>
> API exacta:
> ```ts
> export interface MeldSolution { melds: CardId[][]; leftovers: CardId[]; deadwood: number }
> export function enumerateMelds(hand: CardId[], config: GameConfig): number[]   // máscaras
> export function solveHand(hand: CardId[], config: GameConfig): MeldSolution
> export function isChinchon(hand: CardId[]): boolean
> export function canCloseWith(hand: CardId[], discardId: CardId, config: GameConfig): boolean
> export function closableDiscards(hand: CardId[], config: GameConfig): CardId[]
> ```
>
> **Criterios de aceptación:**
> - Un fichero `melds.test.ts` con los 7 casos dorados de la tabla del contrato §5.10, escritos uno a uno con sus manos literales y su `deadwood` esperado.
> - Test de propiedad: 5.000 manos generadas con semilla fija; para cada solución, comprobar que (a) toda combinación es válida, (b) las combinaciones son disjuntas, (c) `melds ∪ leftovers` = la mano exacta, (d) el `deadwood` coincide con la suma de `leftovers`.
> - Test de rendimiento: 10.000 llamadas a `solveHand` con manos de 8 cartas en menos de 2 segundos.
> - `isChinchon` devuelve `false` si hay comodín en la escalera.
> - `canCloseWith` respeta `config.closeThreshold` y devuelve `false` si la carta no está en la mano.
>
> **NO HAGAS:** no toques `core/`. No implementes turnos, estado ni reducer todavía. No uses recursión sin memoización.

---

## P4 · Chinchón: estado, reducer y vistas ⚠️ CRÍTICO

**Contexto:** `01-CONTRATOS.md` §2.5, §2.6, §3, §5.2, §5.3, §5.6, §5.7, §5.8.

**PROMPT**
> Implementa el módulo de juego completo en `packages/engine/src/games/chinchon/`:
> - `state.ts` — la interfaz `ChinchonState`, JSON-serializable, con: `version`, `status`, `config`, `seed`, `rngCalls`, `round`, `dealerSeat`, `turnSeat`, `turnPhase`, `players[]` (con `playerId`, `nick`, `seat`, `score`, `eliminated`, `left`, `hand: CardId[]`, `lockedCardId`), `deck: CardId[]`, `discard: CardId[]`, `roundResult`, `winnerId`, `rematchVotes`, `processedActionIds: string[]`.
> - `reducer.ts` — `applyAction(state, playerId, action, now)` que implementa §5.3 y §5.6–§5.8 **exactamente**, devolviendo `Result<{ state, events }>` con estado nuevo (inmutable) y la lista de `GameEvent`.
> - `views.ts` — `getPlayerView` y `getTableView` produciendo exactamente las formas del contrato §2.5. `getPlayerView` calcula `bestMelds`, `deadwood`, `canClose`, `closableDiscards` y `availableActions` usando el resolver de P3.
> - `index.ts` — exporta el `GameModule<ChinchonState, GameAction>` y regístralo en `GAMES`.
>
> **Criterios de aceptación (tests obligatorios en `chinchon.test.ts`):**
> 1. Reparto: con 4 jugadores y semilla fija, cada uno tiene 7 cartas, el descarte tiene 1 y el mazo 50−29=21 (con 2 comodines).
> 2. Turno: `discard` antes de robar → `MUST_DRAW_FIRST`. Robar dos veces → `ALREADY_DREW`. Jugar fuera de turno → `NOT_YOUR_TURN`. Descartar una carta que no tienes → `CARD_NOT_IN_HAND`.
> 3. `forbidDiscardDrawnCard`: robar del descarte y descartar esa misma carta → `CANNOT_DISCARD_DRAWN_CARD`. En el turno siguiente, sí se puede.
> 4. Cierre inválido (deadwood > umbral) → `CANNOT_CLOSE`. Cierre válido → `status: 'roundEnd'` y `roundResult` con una fila por jugador.
> 5. Cierre en seco (deadwood 0) → el que cierra recibe `delta: -10`.
> 6. Chinchón con `chinchonEndsGame: true` → `status: 'gameEnd'` y `winnerId` es quien lo hizo, aunque vaya perdiendo por 80 puntos.
> 7. Eliminación: un jugador que supera 100 queda `eliminated`. Cuando queda uno, `status: 'gameEnd'`.
> 8. Mazo agotado: fuerza el caso y comprueba que se rebaraja el descarte dejando la carta superior y se emite `deckReshuffled`.
> 9. Rondas: tras `nextRound` de todos, el repartidor rota al siguiente asiento no eliminado y se reparte de nuevo.
> 10. **Test de estanqueidad:** serializa `getTableView(state)` y `getPlayerView(state, jugadorA)` y comprueba que no aparece ningún `CardId` de la mano del jugador B mientras `status === 'playing'`.
> 11. **Test de inmutabilidad:** `deepFreeze(state)` y luego `applyAction` no lanza.
> 12. **Partida completa determinista:** una función `playRandomGame(seed)` con jugadores automáticos que siempre roban del mazo y descartan la carta de más puntos suelta, cerrando cuando pueden. Ejecuta 200 partidas con semillas 1..200; **ninguna** debe quedarse colgada, lanzar excepción, ni terminar sin `winnerId`. Máximo 500 turnos por partida (si se supera, el test falla).
>
> **NO HAGAS:** no toques `melds.ts`, `core/` ni `protocol`. No metas nada de red ni de base de datos. No añadas acciones que no estén en el contrato §2.6.

---

## P5 · `apps/server` — esqueleto

**Contexto:** `00-MASTER.md` §3; `01-CONTRATOS.md` §6.

**PROMPT**
> Crea el esqueleto del servidor en `apps/server/src/`:
> - `config.ts` — lee y valida el entorno con zod (`DATABASE_URL`, `PORT` por defecto 8787, `CORS_ORIGIN`, `NODE_ENV`). Falla al arrancar si falta algo.
> - `logger.ts` — logger mínimo propio con niveles y salida JSON en producción, legible en desarrollo. Sin dependencias.
> - `http.ts` — servidor `node:http` con `GET /health` (devuelve `{ ok: true, uptime, rooms }`) y nada más.
> - `io.ts` — inicializa Socket.IO sobre ese servidor, con CORS desde `CORS_ORIGIN`, `pingInterval: 10000`, `pingTimeout: 20000`, tipado con `ClientToServerEvents`/`ServerToClientEvents` de `@ronda/protocol`.
> - `index.ts` — arranque, apagado limpio con `SIGTERM` (cierra sockets, hace snapshot y sale).
> - `errors.ts` — `AppError` y un envoltorio `handle(fn)` que convierte excepciones en `Result` de error y las registra.
>
> **Criterios de aceptación:** `pnpm dev:server` levanta, `curl localhost:8787/health` responde 200. Un test comprueba que `config.ts` falla si falta `DATABASE_URL`.
>
> **NO HAGAS:** no implementes salas ni lógica de juego. No uses Express ni Fastify.

---

## P6 · Servidor — gestión de salas en memoria

**Contexto:** `01-CONTRATOS.md` §2.3, §2.4, §6.

**PROMPT**
> Implementa `apps/server/src/rooms/`:
> - `codes.ts` — `generateRoomCode(isTaken)` con el alfabeto del contrato y hasta 10 reintentos.
> - `tokens.ts` — `createToken()` (32 bytes base64url con `node:crypto`) y `hashToken(t)` (sha256 hex).
> - `nick.ts` — normalización y validación de apodos según §6.
> - `room.ts` — clase `Room` con: `code`, `gameId`, `config`, `status`, `players: Map<PlayerId, PlayerRuntime>`, `state` (estado del motor o `null`), `screens: Set<socketId>`, `hostPlayerId`, `lastActivityAt`, `processedActions: Map<string, number>`.
> - `room-manager.ts` — `RoomManager` con `createRoom`, `joinRoom`, `resumeByToken`, `leave`, `kick`, `attachScreen`, `setConfig`, `start`, `applyAction`, `voteRematch`, `getRoomByCode`, `sweep()` (caducidades y traspaso de anfitrión).
>
> Reglas duras: toda la validación de permisos vive aquí (anfitrión, jugador en sala, sala empezada…). Toda mutación actualiza `lastActivityAt`. `applyAction` delega en `GAMES[gameId].applyAction` y **jamás** implementa reglas de juego por su cuenta.
>
> **Criterios de aceptación (tests con `RoomManager` en memoria, sin sockets ni base de datos):**
> - Crear sala devuelve código de 4 caracteres del alfabeto permitido.
> - Unirse con apodo repetido → `NICK_TAKEN`; quinto jugador → `ROOM_FULL`; sala ya empezada → `ROOM_ALREADY_STARTED`.
> - `room:start` con 1 jugador → `NOT_ENOUGH_PLAYERS`; ejecutado por quien no es anfitrión → `NOT_HOST`.
> - `resumeByToken` con token válido devuelve el mismo `playerId` y asiento; con token inválido → `INVALID_TOKEN`.
> - Idempotencia: aplicar dos veces el mismo `clientActionId` deja una sola mutación y devuelve la misma versión.
> - `expectedVersion` desfasada → `STALE_VERSION`.
> - Traspaso de anfitrión: simula 45 s desconectado y comprueba que el anfitrión pasa al asiento conectado más bajo.
> - `sweep()` cierra una sala en lobby con 2 h de inactividad.
>
> **NO HAGAS:** no toques persistencia (P7) ni los manejadores de socket (P8). Deja los enganches (`onSnapshot`, `onEvent`) como callbacks inyectados que en los tests son espías.

---

## P7 · Servidor — persistencia y migraciones

**Contexto:** `01-CONTRATOS.md` §4.

**PROMPT**
> Implementa la persistencia:
> - `db/migrations/0001_init.sql` con el esquema **exacto** del contrato §4.
> - `apps/server/src/db/client.ts` — pool de `pg` a partir de `DATABASE_URL`, con `query<T>()` tipado y reintento único ante error de conexión.
> - `apps/server/src/db/migrate.ts` — script que crea la tabla `_migrations`, aplica en orden los `.sql` no aplicados dentro de una transacción y registra el resultado. Se ejecuta con `pnpm db:migrate`.
> - `apps/server/src/db/rooms-repo.ts` — `upsertRoom`, `upsertPlayer`, `findPlayerByTokenHash`, `closeRoom`, `loadActiveRooms`.
> - `apps/server/src/db/matches-repo.ts` — `createMatch`, `saveSnapshot(matchId, version, state)`, `appendEvents`, `finishMatch`.
> - `apps/server/src/db/playtest-repo.ts` — `track(kind, payload)` que nunca lanza (los fallos se registran y se ignoran).
> - `apps/server/src/rooms/persistence.ts` — conecta `RoomManager` con los repositorios: snapshot con *debounce* de 400 ms, inmediato en fin de ronda/partida y en entrada/salida de jugador, más `rehydrate()` al arrancar según la política del contrato.
>
> **Criterios de aceptación:** los repositorios tienen tests con una base de datos real definida por `TEST_DATABASE_URL` y se saltan (`describe.skip`) si esa variable no existe. `pnpm db:migrate` es idempotente: ejecutarlo dos veces no falla.
>
> **NO HAGAS:** no uses ORM ni `supabase-js`. No metas SQL en ningún fichero fuera de `db/`. No guardes ningún dato personal más allá del apodo.

---

## P8 · Servidor — manejadores de socket y difusión

**Contexto:** `01-CONTRATOS.md` §2.3, §2.4, §2.5, §6.

**PROMPT**
> Implementa `apps/server/src/socket/`:
> - `handlers.ts` — un manejador por cada evento cliente→servidor del contrato §2.3. Cada uno: valida el payload con el esquema zod de `@ronda/protocol`, aplica el límite de ritmo, llama al `RoomManager`, responde por el ack con `Result`, y dispara la difusión.
> - `broadcast.ts` — `broadcastRoom(room)`: para cada socket de jugador emite `state:view` con `getPlayerView`, y para cada pantalla emite `state:view` con `getTableView`. Emite `events` con los `GameEvent` de la última acción. **Una sola vez por acción.**
> - `presence.ts` — marca `connected` en conexión y desconexión, emite `connection`, arranca el temporizador de traspaso de anfitrión, y llama a `sweep()` cada 30 s.
> - `rate-limit.ts` — 20 mensajes / 10 s por socket, ventana deslizante.
>
> Regla crítica de seguridad, además de un test que lo compruebe: **un socket solo recibe `PlayerView` de su propio `playerId`**. La difusión nunca hace un `io.to(room).emit` con datos privados.
>
> **Criterios de aceptación (tests de integración con cliente de Socket.IO real contra el servidor en un puerto efímero):**
> - Dos clientes crean y se unen a una sala; ambos reciben `state:view` con la lista de jugadores correcta.
> - El cliente A no recibe nunca la mano del cliente B (inspeccionar todos los mensajes recibidos durante una partida entera).
> - Una pantalla conectada con `screen:attach` recibe `kind: 'table'` y nunca `kind: 'player'`.
> - Reconectar con el mismo token recupera asiento, mano y turno.
> - Enviar 30 mensajes en 1 s produce `RATE_LIMITED`.
>
> **NO HAGAS:** no metas lógica de reglas aquí. No emitas el estado completo del motor: solo vistas.

---

## P9 · Servidor — simulador con bots ⚠️ ALTO VALOR

**Contexto:** `01-CONTRATOS.md` §2.3, §5.3.

**PROMPT**
> Implementa `apps/server/src/sim/`:
> - `bot.ts` — un cliente Socket.IO automático con una política simple: si puede cerrar, cierra; si la carta superior del descarte reduce sus puntos sueltos, la roba; si no, roba del mazo; descarta la carta suelta de más puntos.
> - `run.ts` — script `pnpm sim -- --games=50 --players=4 --seed=1 --chaos=0.1` que levanta el servidor en memoria, lanza N partidas con bots y reporta: partidas terminadas, turnos medios, duración media, errores por código, y cualquier partida colgada.
> - `chaos.ts` — con probabilidad `chaos`, un bot se desconecta 2–5 s y vuelve a entrar con su token, o envía una acción con `expectedVersion` desfasada, o repite un `clientActionId`.
>
> **Criterios de aceptación:** `pnpm sim -- --games=50 --chaos=0.2` termina el 100 % de las partidas sin errores inesperados (solo se admiten `STALE_VERSION` y `NOT_YOUR_TURN` provocados por el caos) y sin fugas de información privada (el bot verifica en cada `state:view` que no ve manos ajenas). El proceso devuelve código de salida distinto de 0 si algo falla, para poder usarlo como test de humo.
>
> **NO HAGAS:** no metas el simulador en el arranque de producción. No hagas que los bots sean buenos jugando: solo tienen que ser legales y rápidos.

---

## P10 · Web — bootstrap, tokens de diseño y PWA

**Contexto:** `01-CONTRATOS.md` §7, §8 completo.

**PROMPT**
> Monta `apps/web` con Next.js (App Router) y Tailwind v4:
> - `src/app/layout.tsx` — fuentes con `next/font/google` (Familjen Grotesk 700, IBM Plex Sans 400/600, IBM Plex Mono 500), metadatos, `viewport-fit=cover`, color de tema `#14161F`.
> - `src/styles/globals.css` — **todos** los tokens de color del contrato §8.1 como variables CSS, la escala tipográfica §8.2, y `@theme` de Tailwind mapeando esos tokens a utilidades (`bg-mesa`, `text-hueso`, `border-linea`, `text-brasa`…).
> - `public/manifest.webmanifest`, iconos 192/512 y maskable generados como SVG→PNG propios (la marca es la palabra «Ronda» en Familjen Grotesk sobre `--tinta` con una línea `--brasa` debajo).
> - `public/sw.js` escrito a mano: precache del shell (`/`, `/unirse`, estáticos), `NetworkOnly` para todo lo demás, y registro desde un componente cliente. Sin librerías de PWA.
> - `src/app/page.tsx` provisional con la portada: nombre, «Crear partida», «Unirse a una partida».
>
> **Criterios de aceptación:** Lighthouse PWA instalable en local. Nada de colores escritos a mano fuera de `globals.css`: todo pasa por tokens. Un test de lint prohíbe literales `#rrggbb` en `src/app` y `src/components`.
>
> **NO HAGAS:** no instales shadcn, MUI, next-pwa, framer-motion ni ninguna librería de componentes o animación. Las animaciones son CSS.

---

## P11 · Web — sistema de componentes y la baraja SVG

**Contexto:** `01-CONTRATOS.md` §8.3, §8.4, §8.5.

**PROMPT**
> Crea `apps/web/src/components/ui/` y `components/cards/`:
> - `Button.tsx` — variantes `primary` (fondo `--brasa`), `ghost`, `danger`. Altura mínima 56 px. Estado `loading` que bloquea.
> - `Sheet.tsx` — panel inferior deslizante, cierre con gesto y con `Escape`.
> - `Toast.tsx`, `Banner.tsx` (banda de conexión de 4 px), `Pill.tsx`, `Avatar.tsx` (inicial sobre el color del asiento), `RoomCode.tsx` (código en 4 casillas grandes, monoespaciado).
> - `components/cards/PlayingCard.tsx` — la carta SVG exactamente como el contrato §8.3, con props `cardId`, `size` (`sm` 48×72, `md` 72×108, `lg` 120×180), `faceDown`, `selected`, `dimmed`, `meldColor`.
> - `components/cards/suits.tsx` — los cuatro símbolos como `<path>` propios. Geométricos, sin depender de ninguna tipografía.
> - `components/cards/CardBack.tsx`, `components/cards/Pile.tsx` (montón con rotación determinista derivada del `CardId`).
> - Una página de escaparate en `src/app/dev/design/page.tsx` que pinte las 50 cartas, todos los tamaños y todos los componentes.
>
> **Criterios de aceptación:** las 50 cartas se ven correctamente a tamaño `sm` en una pantalla de 360 px de ancho. Contraste AA. La carta no usa ninguna imagen ni emoji. `PlayingCard` es un componente puro sin estado.
>
> **NO HAGAS:** no dibujes personajes ni ilustraciones figurativas de las figuras (10, 11, 12): usa el número y un tratamiento tipográfico. No imites ninguna baraja comercial existente.

---

## P12 · Web — capa de socket, estado y reconexión

**Contexto:** `01-CONTRATOS.md` §2.3, §2.4, §2.5, §6.

**PROMPT**
> Implementa `apps/web/src/lib/`:
> - `socket.ts` — cliente Socket.IO único tipado con `@ronda/protocol`, `autoConnect: false`, reconexión exponencial (250 ms → 8 s), y `emitWithAck(event, payload)` que devuelve `Result`.
> - `token.ts` — guardar/leer/borrar el token en `localStorage` bajo `ronda.token.<CODE>`, más `listSavedRooms()` para la portada.
> - `store.ts` — store de Zustand con: `view`, `version`, `connection: 'online'|'reconnecting'|'offline'`, `pendingAction`, `lastError`, `events`. Acciones: `createRoom`, `joinRoom`, `resume`, `sendAction`, `leave`.
> - Comportamiento obligatorio de `sendAction`: genera `clientActionId` con `crypto.randomUUID()`, envía `expectedVersion` = versión actual, bloquea la interfaz mientras esté en vuelo, ante `STALE_VERSION` espera al siguiente `state:view` y reintenta **una sola vez**, y ante cualquier otro error muestra el texto de `messages.ts`.
> - Al reconectar el socket: si hay token guardado para la sala actual, emite `room:resume` automáticamente.
> - `useSounds.ts` — sonidos generados con `AudioContext` (sin ficheros de audio): tu turno, carta descartada, fin de ronda. Con interruptor y respeto a `prefers-reduced-motion`.
> - `useHaptics.ts` — `navigator.vibrate` cuando empieza tu turno, si está disponible.
>
> **Criterios de aceptación:** tests con Vitest y un servidor de Socket.IO falso: reintento único ante `STALE_VERSION`; no se envían dos acciones a la vez; el token sobrevive a una recarga simulada; `connection` refleja los tres estados.
>
> **NO HAGAS:** no metas lógica de reglas en el cliente. El cliente **nunca** calcula si una jugada es válida: solo pinta `availableActions` y `closableDiscards` que le manda el servidor.

---

## P13 · Web — portada, catálogo, crear y unirse

**Contexto:** `01-CONTRATOS.md` §7, §8.5.

**PROMPT**
> Implementa las pantallas:
> - `/` — nombre, dos botones grandes, y si hay salas guardadas, una tarjeta «Volver a la partida A7K9».
> - `/juegos` — ficha del Chinchón: 2–4 jugadores, 15–30 min, cómo se juega en 5 viñetas, botón «Crear partida».
> - `/crear` — apodo + configuración de variantes con controles grandes (número de jugadores, comodines, umbral de cierre, puntuación de eliminación, chinchón acaba la partida). Cada opción con una línea de explicación de menos de 10 palabras. Al enviar: `room:create` y navegación a `/sala/[code]`.
> - `/unirse` — cuatro casillas para el código, teclado en mayúsculas, más apodo. Errores en línea con los textos de `messages.ts`.
> - `/unirse/[code]` — igual pero con el código bloqueado; solo pide apodo. Es la pantalla que abre el QR.
> - Aviso legal mínimo bajo el campo de apodo: «Tu apodo se ve en la partida. No guardamos nada más.»
>
> **Criterios de aceptación:** todo el flujo funciona contra el servidor real. Navegación con teclado. En un iPhone SE (375×667) no hay desbordes ni recortes.
>
> **NO HAGAS:** no pidas email, ni registro, ni permisos. No pongas más de 5 opciones visibles a la vez en `/crear`: el resto va tras un desplegable «Más variantes».

---

## P14 · Web — sala de espera y pantalla de partida ⚠️ CRÍTICO

**Contexto:** `01-CONTRATOS.md` §2.5, §5.3, §8.4, §8.5.

**PROMPT**
> Implementa `/sala/[code]`, que renderiza según `view.status`:
>
> **Lobby.** Código grande en 4 casillas, QR generado en cliente con `qrcode` apuntando a `/unirse/[code]`, botón «Copiar enlace», lista de jugadores con estado de conexión, y para el anfitrión: cambiar variantes, expulsar, y «Empezar» (deshabilitado con menos de 2 jugadores, con la razón escrita debajo).
>
> **Partida.** Estructura vertical:
> - Banda de conexión (4 px) arriba.
> - Fila de jugadores: avatar, apodo, número de cartas, puntuación. **El hilo de turno** (contrato §8.4) recorre esta fila al cambiar el turno.
> - Zona común en el centro: mazo (con el número de cartas restantes), montón de descarte con la carta superior visible.
> - Mano en el tercio inferior: cartas en abanico ligero, desplazamiento horizontal si no caben, toque para seleccionar, arrastrar para reordenar (`sortHand`), y botón «Ordenar» que agrupa por combinación sugerida usando `me.bestMelds`.
> - Barra de acción inferior: **una sola acción principal**. En fase `draw`: «Robar del mazo» y, si el descarte es útil, un toque sobre el descarte. En fase `discard`: «Descartar» con la carta seleccionada, y «Cerrar» solo si `me.canClose` y la carta seleccionada está en `me.closableDiscards`.
> - Las combinaciones sugeridas se marcan con un subrayado del color del asiento; las cartas sueltas van atenuadas con su valor en puntos.
> - Si no es tu turno: la barra de acción muestra «Le toca a {nick}» y las cartas no responden salvo para reordenar.
> - Si un jugador está desconectado y es su turno: cartel «Esperando a {nick}» con los segundos transcurridos.
>
> **Criterios de aceptación:** se puede jugar una partida entera de 4 jugadores desde 4 navegadores. Nunca hay dos botones principales a la vez. Ninguna acción se puede enviar dos veces con doble toque. Con la mano llena (8 cartas), todas se ven sin hacer scroll en 375 px de ancho.
>
> **NO HAGAS:** no calcules reglas en el cliente. No muestres las cartas de otros jugadores ni sus puntos durante la partida. No uses librerías de arrastrar y soltar: eventos de puntero a mano.

---

## P15 · Web — pantalla central `/mesa/[code]`

**Contexto:** `01-CONTRATOS.md` §2.5 (`TableView`), §8.4.

**PROMPT**
> Implementa `/mesa/[code]`: una vista para tele o tablet, horizontal, sin interacción salvo entrar.
> - Al entrar, pide el código si no viene en la ruta y emite `screen:attach`. Nunca guarda token.
> - Composición: anillo de asientos alrededor de un centro con el mazo y el descarte. Cada asiento: apodo, color, número de cartas en forma de abanico de dorsos, y puntuación en `IBM Plex Mono` grande.
> - **El hilo de turno** recorre el anillo entre asientos (elemento firma).
> - Animaciones: reparto en cascada, lanzamiento de carta al descarte con rotación determinista, y revelado escalonado de combinaciones al final de la ronda.
> - Esquina superior: código de sala y QR pequeño permanente, para que alguien se una desde la mesa.
> - Modo «distancia»: tipografía y cartas escaladas con `clamp()` para que se lea desde 3 metros. Nada por debajo de 24 px equivalentes.
> - Si no hay partida en curso, muestra el código a pantalla completa y la lista de quién ha entrado.
>
> **Criterios de aceptación:** un test comprueba que este componente jamás lee `view.me` (no existe en `TableView`). Se ve bien en 1920×1080 y en 1280×720. Sin scroll.
>
> **NO HAGAS:** no permitas ninguna acción de juego desde esta pantalla. No muestres nada privado, jamás, ni siquiera «X tiene un chinchón a punto».

---

## P16 · Web — fin de ronda, fin de partida y revancha

**Contexto:** `01-CONTRATOS.md` §2.5 (`RoundResult`), §5.8.

**PROMPT**
> Implementa las pantallas de resultado dentro de `/sala/[code]` y `/mesa/[code]`:
> - **Fin de ronda:** tabla con una fila por jugador: combinaciones reveladas (cartas reales, agrupadas), cartas sueltas con sus puntos, puntos de la ronda y total. Quien cerró va marcado. El cierre en seco se resalta con el −10. Botón «Siguiente ronda», que envía `nextRound` y muestra quién falta por confirmar.
> - **Eliminación:** cuando alguien supera el límite, su fila se marca y aparece un cartel sobrio, sin celebración.
> - **Fin de partida:** ganador, clasificación final, número de rondas, y dos botones: «Revancha» (envía `rematch:vote` y muestra los votos) y «Salir».
> - En `/mesa`, la misma información en grande y con el revelado escalonado.
>
> **Criterios de aceptación:** los números de la tabla cuadran siempre con `roundResult` del servidor; el cliente no recalcula nada. Con revancha aceptada por todos, se empieza una partida nueva con los mismos asientos y el marcador a cero.
>
> **NO HAGAS:** no inventes estadísticas que no vengan del servidor. Nada de confeti.

---

## P17 · Web — reconexión, errores y estados límite

**Contexto:** `01-CONTRATOS.md` §6; `00-MASTER.md` §8.

**PROMPT**
> Cierra todos los estados límite de la interfaz:
> - Recarga en medio de la partida → `room:resume` automático y vuelta al mismo sitio, sin pantalla en blanco.
> - Volver a abrir la app horas después → tarjeta «¿Quieres volver a la partida A7K9?» con la opción de descartarla.
> - Pérdida de conexión → banda `--brasa`, acciones bloqueadas, cartel «Sin conexión. Reintentando…» y recuperación transparente al volver.
> - Sala cerrada o caducada → pantalla explicativa con «Crear una partida nueva», y borrado del token guardado.
> - Anfitrión expulsándote → mensaje claro y vuelta a la portada.
> - Doble pestaña con el mismo token → la pestaña vieja se marca como inactiva y muestra «Estás jugando en otra pestaña».
> - Fallo del servidor (5xx o socket caído más de 30 s) → pantalla de error con botón de reintento, nunca un error de React sin capturar. Añade `error.tsx` y `not-found.tsx` en el App Router.
>
> **Criterios de aceptación:** una lista de comprobación manual en `apps/web/CHECKLIST-RECONEXION.md` con los 7 casos y cómo probarlos (modo avión, cerrar pestaña, matar el servidor…). Los 7 pasan.
>
> **NO HAGAS:** no muestres nunca `INTERNAL` ni trazas técnicas al jugador. Registra y enseña un texto humano.

---

## P18 · Pulido, accesibilidad y telemetría de playtest

**PROMPT**
> Última capa:
> - Telemetría: el servidor registra en `playtest_events` los eventos `room_created`, `player_joined`, `game_started`, `round_ended`, `game_ended`, `rematch`, `disconnect`, `reconnect`, `error`, con marcas de tiempo. Añade un script `pnpm report` que imprima las 7 métricas de `00-MASTER.md` §10 a partir de esa tabla.
> - Accesibilidad: foco visible en todo, `aria-live` para el cambio de turno, objetivos táctiles ≥ 56 px, contraste AA verificado, `prefers-reduced-motion` respetado en las cuatro animaciones.
> - Rendimiento: sin re-render de toda la mano al cambiar el turno (memoiza `PlayingCard`); presupuesto de JS del cliente < 200 KB comprimido.
> - Textos: repasa **todos** los textos de la interfaz contra `01-CONTRATOS.md` §8.5.7. Frase corta, verbo activo, sin exclamaciones ni disculpas.
> - `/reglas`: redacta las reglas del Chinchón con tus propias palabras a partir del contrato §5. Máximo 600 palabras, con ejemplos.
>
> **NO HAGAS:** no añadas funciones nuevas. Este paquete no crea pantallas.

---

## P19 · Despliegue

**PROMPT**
> Deja el proyecto desplegable y documentado en `DEPLOY.md`:
> - **Base de datos:** proyecto de Supabase (o Neon) solo como Postgres. `DATABASE_URL` con el *pooler*. Ejecutar `pnpm db:migrate`.
> - **Servidor:** Fly.io con `fly.toml`, una sola máquina, `min_machines_running = 1`, `auto_stop_machines = false` (el estado vive en memoria: la máquina no puede dormirse), health check a `/health`, región `mad`. `Dockerfile` con Node 22 alpine, build de pnpm, usuario no root.
> - **Web:** Vercel, raíz `apps/web`, variable `NEXT_PUBLIC_SERVER_URL` apuntando al dominio del servidor. `CORS_ORIGIN` en el servidor apuntando al dominio de Vercel.
> - Comprobación posterior al despliegue: `/health`, crear sala desde dos móviles con datos móviles distintos, y una partida completa.
>
> **NO HAGAS:** no configures escalado horizontal ni varias instancias: la arquitectura actual **no** lo soporta (las salas están en memoria de un proceso). Está documentado como límite conocido.

---

## P20 · Protocolo de playtest

**PROMPT**
> Escribe `PLAYTEST.md`: guion de tres sesiones con grupos reales de 3–4 personas que no hayan visto la app.
> - Preparación: una tele con `/mesa`, móviles de los participantes, un QR impreso.
> - Regla del observador: **no ayudar**. Anotar cada vez que alguien pregunta «¿y ahora qué hago?».
> - Cronometrar: escaneo → dentro de la sala; sala creada → partida empezada; duración de la partida.
> - Después: 5 preguntas fijas, entre ellas «¿jugarías otra?» y «¿qué has mirado más, el móvil o a la gente?».
> - Plantilla de recogida de datos y sección de decisiones: qué se cambia antes de la siguiente sesión.
>
> **NO HAGAS:** no escribas código en este paquete.

---

## P21 · Contrato de Pocha (segundo juego) ⚠️ SOLO DOCUMENTACIÓN

**Contexto:** `01-CONTRATOS.md` §2, §3 completo (para saber qué se está ampliando), §5 (para el nivel de detalle a igualar), §9 y §10 (nuevos, este mismo paquete).

**PROMPT**
> Escribe el contrato congelado de las reglas de Pocha en `01-CONTRATOS.md`, con el mismo nivel de detalle que §5 (Chinchón): materiales, estructura de rondas, reparto y triunfo, cantes y regla del enganche, juego de bazas y algoritmo de ganador de baza, puntuación, fin de partida y desempate, manejo de abandono a mitad de ronda, configuración (`PochaConfig`) con sus valores por defecto, y tests dorados con casos numéricos concretos.
>
> Además, documenta explícitamente los cambios de contrato que hacen falta para admitir un segundo juego: `GameId` como unión, `GameConfig` como unión discriminada por `gameId` (con `ChinchonConfig`/`PochaConfig` y un posible `CommonGameConfig` compartido), qué entradas nuevas hacen falta en `GameEvent`, `GameAction` y `ERROR_CODES`, y cómo deben funcionar `MAX_PLAYERS`/`MIN_PLAYERS` cuando cada juego tiene su propio rango de jugadores. Revisa también si hay algo más en `§2`-`§3` (tipos de vista, colores de asiento, etc.) que asuma implícitamente que solo existe Chinchón, y decláralo.
>
> Cualquier detalle mecánico necesario que no esté explícitamente decidido debe quedar marcado en el propio documento como una decisión de este paquete pendiente de confirmar — nunca inventado en silencio.
>
> **Criterios de aceptación:** el contrato de Pocha no contradice ninguna sección congelada de Chinchón que no dependa de ampliarse a propósito (§10.2, §10.6, §10.7 de este mismo paquete son las únicas ampliaciones conscientes). Revisión de consistencia interna antes de dar el paquete por cerrado.
>
> **NO HAGAS:** no escribas código de motor, servidor ni interfaz en este paquete. No implementes la variante de baraja francesa más allá de dejarla documentada como configurable. No toques el registro `GAMES` ni ningún fichero de `packages/engine`, `apps/server` o `apps/web`.

---

## Después del MVP (no antes)

En este orden, y solo cuando los 4 hitos de `00-MASTER.md` §7 estén cumplidos:

1. **Segundo juego: Pocha.** Es el que más pone a prueba la generalidad del motor (apuestas, bazas, rondas de tamaño variable) sin ser tan complejo como el Mus. Al implementarlo se descubre qué hay que sacar a `core/`. **No generalices antes de tenerlo.** Contrato de reglas: `P21` (`01-CONTRATOS.md` §9-§10). Motor, servidor e interfaz son paquetes futuros (propuesta: P22 motor, P23 servidor, P24 interfaz), pendientes de confirmación antes de empezar cada uno.
2. Reacciones rápidas (4 emojis, sin chat libre).
3. Estadísticas del grupo, guardadas por sala.
4. Mus (necesita parejas, señas y una capa social muy distinta: es un proyecto en sí mismo).
5. Juego original con roles secretos, que es lo que realmente diferencia la plataforma.
6. App nativa con Expo, solo si el playtest demuestra que el juego offline y las notificaciones hacen falta de verdad.
