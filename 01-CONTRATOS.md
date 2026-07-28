# RONDA — Contratos congelados (v1)

> Todo lo de este documento es **contrato**. No se cambia sin autorización de Unai.
> Los nombres de código van en inglés. Los textos de interfaz, en castellano.

---

## 1. Convenciones

- Ficheros: `kebab-case.ts`. Componentes React: `PascalCase.tsx`.
- Tipos e interfaces: `PascalCase`. Funciones y variables: `camelCase`. Constantes: `SCREAMING_SNAKE`.
- Exportaciones nombradas siempre; `export default` solo en páginas y componentes de Next.
- Nada de `any`, nada de `!` no nulo, nada de `@ts-ignore`. Si hace falta, es que el tipo está mal.
- Errores: se devuelven, no se lanzan, en el motor (`Result<T>`). En el servidor se lanzan `AppError` con `code`.
- Todo el tiempo se pasa como parámetro `now: number` (ms epoch). El motor nunca lee el reloj.

```ts
// packages/protocol/src/result.ts
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: ErrorCode; detail?: string };
export type Result<T> = Ok<T> | Err;
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = (code: ErrorCode, detail?: string): Err => ({ ok: false, code, detail });
```

---

## 2. `packages/protocol`

### 2.1 Identificadores

```ts
export type RoomCode = string;   // 4 caracteres
export type PlayerId = string;   // uuid v4
export type GameId = 'chinchon';
export type CardId = string;     // 'oros-7' | 'copas-12' | 'joker-1' | 'joker-2'

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I O 0 1
export const ROOM_CODE_LENGTH = 4;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
```

### 2.2 Códigos de error (lista cerrada)

```ts
export const ERROR_CODES = [
  'ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_ALREADY_STARTED', 'ROOM_CLOSED',
  'NICK_TAKEN', 'NICK_INVALID', 'NOT_HOST', 'NOT_ENOUGH_PLAYERS',
  'INVALID_TOKEN', 'PLAYER_NOT_IN_ROOM', 'PLAYER_ELIMINATED',
  'NOT_YOUR_TURN', 'INVALID_ACTION', 'CARD_NOT_IN_HAND', 'MUST_DRAW_FIRST',
  'ALREADY_DREW', 'CANNOT_CLOSE', 'CANNOT_DISCARD_DRAWN_CARD',
  'STALE_VERSION', 'GAME_NOT_FOUND', 'RATE_LIMITED', 'INTERNAL',
] as const;
export type ErrorCode = typeof ERROR_CODES[number];
```

Cada código tiene un texto en castellano en `packages/protocol/src/messages.ts`. Ejemplos obligatorios (voz de la interfaz, sin disculpas, siempre dicen qué hacer):

| code | texto |
|------|-------|
| `ROOM_NOT_FOUND` | «Esa sala no existe. Comprueba el código.» |
| `ROOM_FULL` | «La sala está completa.» |
| `NICK_TAKEN` | «Ese nombre ya está cogido en esta sala.» |
| `NOT_YOUR_TURN` | «Todavía no es tu turno.» |
| `MUST_DRAW_FIRST` | «Primero roba una carta.» |
| `CANNOT_CLOSE` | «No puedes cerrar: te sobran más de {n} puntos.» |
| `STALE_VERSION` | «La partida ha avanzado. Vuelve a intentarlo.» |

### 2.3 Eventos cliente → servidor

Todos con *acknowledgement* (callback). Todos los payloads validados con zod en el servidor **antes** de tocar nada.

```ts
'room:create'  { gameId, config: GameConfig, nick: string }
   → Result<{ roomCode, playerId, playerToken, seat }>

'room:join'    { roomCode, nick: string }
   → Result<{ roomCode, playerId, playerToken, seat }>

'room:resume'  { playerToken: string }
   → Result<{ roomCode, playerId, seat }>       // la vista llega por 'state:view'

'room:config'  { patch: Partial<GameConfig> }   // solo anfitrión, solo en lobby
   → Result<{ config: GameConfig }>

'room:start'   {}                               // solo anfitrión
   → Result<{}>

'room:kick'    { playerId }                     // solo anfitrión
   → Result<{}>

'room:leave'   {}
   → Result<{}>

'screen:attach' { roomCode }                    // pantalla central, sin token
   → Result<{ roomCode }>

'game:action'  { clientActionId: string, expectedVersion: number, action: GameAction }
   → Result<{ version: number }>

'rematch:vote' { value: boolean }
   → Result<{}>

'ping'         {} → Result<{ serverTime: number }>
```

Reglas:
- `clientActionId` = uuid generado por el cliente. Si el servidor ya lo procesó, responde `ok` con la versión resultante de la primera vez (idempotencia) y **no** vuelve a aplicar la acción.
- `expectedVersion` distinta de la versión actual del estado ⇒ `STALE_VERSION`. El cliente refresca y reintenta una sola vez.
- El cliente **bloquea la interfaz** mientras tiene una acción en vuelo.

### 2.4 Eventos servidor → cliente

```ts
'state:view'   { version: number, view: PlayerView | TableView }   // snapshot completo censurado
'room:closed'  { reason: 'host_left' | 'empty' | 'expired' }
'events'       { version: number, items: GameEvent[] }             // solo para animaciones
'toast'        { level: 'info' | 'warn', text: string }
'connection'   { players: { playerId, connected, isHost }[] }
```

`GameEvent` es **cosmético**: nunca contiene información privada de terceros y la interfaz debe funcionar sin él.

```ts
type GameEvent =
  | { t: 'dealt'; round: number }
  | { t: 'drewDeck'; playerId: PlayerId }
  | { t: 'drewDiscard'; playerId: PlayerId; cardId: CardId }
  | { t: 'discarded'; playerId: PlayerId; cardId: CardId }
  | { t: 'closed'; playerId: PlayerId }
  | { t: 'chinchon'; playerId: PlayerId }
  | { t: 'deckReshuffled' }
  | { t: 'roundScored'; scores: { playerId: PlayerId; delta: number; total: number }[] }
  | { t: 'eliminated'; playerId: PlayerId }
  | { t: 'gameOver'; winnerId: PlayerId };
```

### 2.5 Vistas (esto es lo que pinta la interfaz — congelado)

```ts
interface PublicPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;            // 0..3
  colorIndex: 0|1|2|3;     // color de asiento, asignado por asiento
  score: number;           // acumulado de la partida
  handCount: number;       // nº de cartas, nunca cuáles
  connected: boolean;
  isHost: boolean;
  eliminated: boolean;
}

interface CommonView {
  roomCode: RoomCode;
  gameId: GameId;
  config: GameConfig;
  status: 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
  round: number;
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  turnPhase: 'draw' | 'discard' | null;
  deckCount: number;
  discardTop: CardId | null;
  discardCount: number;
  roundResult: RoundResult | null;   // solo en status 'roundEnd' | 'gameEnd'
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

interface PlayerView extends CommonView {
  kind: 'player';
  me: {
    playerId: PlayerId;
    hand: CardId[];                    // orden tal y como lo dejó el jugador
    bestMelds: CardId[][];             // sugerencia calculada por el servidor
    deadwood: number;                  // puntos sueltos con la mejor combinación
    canClose: boolean;                 // si descartando alguna carta podría cerrar
    closableDiscards: CardId[];        // cartas cuyo descarte permite cerrar
    lockedCardId: CardId | null;       // carta robada del descarte que no puede descartar
    availableActions: ('drawDeck'|'drawDiscard'|'discard'|'close')[];
  };
}

interface TableView extends CommonView {
  kind: 'table';                        // sin campo 'me'. Jamás.
}

interface RoundResult {
  closedBy: PlayerId | null;
  chinchonBy: PlayerId | null;
  rows: {
    playerId: PlayerId;
    melds: CardId[][];      // combinaciones reveladas
    leftovers: CardId[];    // cartas sueltas reveladas
    delta: number;          // puntos sumados esta ronda (puede ser negativo)
    total: number;          // acumulado tras la ronda
    eliminated: boolean;
  }[];
}
```

**Invariante de seguridad, verificable con un test:** serializar una `TableView` o una `PlayerView` y comprobar que no aparece ningún `CardId` de la mano de otro jugador, salvo dentro de `roundResult` cuando `status !== 'playing'`.

### 2.6 Acciones de juego

```ts
type GameAction =
  | { type: 'drawDeck' }
  | { type: 'drawDiscard' }
  | { type: 'discard'; cardId: CardId }
  | { type: 'close'; cardId: CardId }        // descarta esa carta y cierra
  | { type: 'sortHand'; order: CardId[] }    // solo reordena la mano del jugador
  | { type: 'nextRound' };                   // confirmar en pantalla de fin de ronda
```

`sortHand` no consume turno, no cambia la versión pública y solo la puede ejecutar el dueño de la mano.

### 2.7 Configuración de partida

```ts
interface GameConfig {
  maxPlayers: 2|3|4;              // por defecto 4
  handSize: 7;                    // congelado en 7 para el MVP
  jokers: 0|2;                    // por defecto 2
  closeThreshold: 0|3|5|10;       // puntos sueltos máximos para cerrar · por defecto 5
  dryCloseBonus: -10|0;           // cerrar con 0 puntos · por defecto -10
  eliminationScore: 50|100|150;   // por defecto 100 (se elimina al SUPERARLO)
  chinchonEndsGame: boolean;      // por defecto true
  jokerPoints: 20|25;             // por defecto 25
  maxJokersPerMeld: 1;            // congelado en 1
  forbidDiscardDrawnCard: boolean;// por defecto true
  soundEnabled: boolean;          // por defecto true (preferencia local, no afecta al motor)
}
```

Solo el anfitrión y solo antes de empezar. La config se guarda dentro del estado de la partida y no cambia a mitad.

---

## 3. `packages/engine` — API pública

```ts
// packages/engine/src/index.ts
export interface GameModule<S, A> {
  id: GameId;
  createInitialState(input: {
    config: GameConfig;
    players: { playerId: PlayerId; nick: string; seat: number }[];
    seed: string;
  }): S;
  applyAction(state: S, playerId: PlayerId, action: A, now: number): Result<{ state: S; events: GameEvent[] }>;
  getPlayerView(state: S, playerId: PlayerId): PlayerView;
  getTableView(state: S): TableView;
  isFinished(state: S): boolean;
}

export const GAMES: Record<GameId, GameModule<any, any>>;
```

Requisitos duros del motor:

1. **Puro.** Mismo estado + misma acción ⇒ mismo resultado, siempre. Sin `Math.random`, sin `Date`, sin `fetch`, sin `process`.
2. **Inmutable.** `applyAction` devuelve un estado nuevo; nunca muta el que recibe. Test: congelar el estado con `Object.freeze` recursivo antes de llamar.
3. **RNG con semilla.** `mulberry32` sembrado con hash de `seed`; el contador va dentro del estado (`rng: { seed: string; calls: number }`) y se re-deriva al usarlo, para que el estado sea JSON serializable puro.
4. **Serializable.** `JSON.parse(JSON.stringify(state))` da un estado equivalente. Nada de `Map`, `Set`, `Date` ni clases.
5. **Validación total.** `applyAction` valida turno, fase, propiedad de la carta y legalidad. No confía en nada.

### 3.1 Baraja

```ts
type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';
interface Card { id: CardId; suit: Suit | null; rank: number | null; isJoker: boolean; points: number }

// 48 cartas: rangos 1..12 en los cuatro palos. Más 2 comodines si config.jokers === 2.
// Puntos: rank 1..9 → su valor. rank 10,11,12 → 10. Comodín → config.jokerPoints.
// Escaleras: orden natural 1,2,3,...,12. No hay vuelta (12→1 no vale).
// Grupos: 3 o 4 cartas del mismo rango (los palos son distintos por construcción).
```

---

## 4. Base de datos (Postgres)

Solo el servidor accede, con una única cadena de conexión y permisos plenos. Sin RLS: el rol anónimo no existe.

```sql
-- db/migrations/0001_init.sql

create table rooms (
  id            uuid primary key,
  code          text not null unique,
  game_id       text not null,
  status        text not null,                  -- lobby | playing | roundEnd | gameEnd | closed
  config        jsonb not null,
  host_player_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  closed_at     timestamptz
);
create index rooms_status_updated_idx on rooms (status, updated_at desc);

create table players (
  id          uuid primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  nick        text not null,
  seat        int  not null,
  token_hash  text not null,                    -- sha256 hex del token
  is_host     boolean not null default false,
  connected   boolean not null default false,
  left_at     timestamptz,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, seat)
);
create index players_token_idx on players (token_hash);

create table matches (
  id          uuid primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  seed        text not null,
  version     int  not null default 0,
  state       jsonb not null,                   -- estado completo del motor
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  result      jsonb
);
create index matches_room_idx on matches (room_id, started_at desc);

create table match_events (
  id         bigserial primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  version    int  not null,
  type       text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index match_events_match_idx on match_events (match_id, version);

create table playtest_events (
  id         bigserial primary key,
  room_code  text,
  kind       text not null,                     -- room_created | player_joined | game_started |
                                                -- round_ended | game_ended | rematch | disconnect |
                                                -- reconnect | error
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Estrategia de persistencia:
- La verdad está **en memoria**. Postgres es el respaldo.
- Snapshot de `matches.state` con *debounce* de 400 ms, y siempre inmediato en: fin de ronda, fin de partida, entrada/salida de jugador.
- Al arrancar el servidor, se rehidratan las salas con `status in ('playing','roundEnd')` y `updated_at > now() - interval '6 hours'`.
- Purga: salas en `lobby` sin actividad 2 h → `closed`. Salas terminadas de más de 7 días → borradas.
- **Nunca** se guardan datos personales. El apodo es lo único que escribe el jugador y se advierte de ello en la pantalla de unirse.

---

## 5. REGLAS DE CHINCHÓN — versión congelada

Esta es la única fuente de verdad. Si algo no está aquí, no existe.

### 5.1 Materiales
Baraja de 48 cartas: rangos 1 a 12 en oros, copas, espadas y bastos. Más 2 comodines si `config.jokers === 2`.

### 5.2 Preparación de una ronda
1. Se baraja con el RNG sembrado.
2. Se reparten **7 cartas** a cada jugador no eliminado, una a una, empezando por el jugador a la izquierda del repartidor (asiento `(dealerSeat + 1) % n`, saltando eliminados).
3. Se levanta **1 carta** al descarte.
4. El resto forma el mazo.
5. Empieza el jugador a la izquierda del repartidor. El repartidor de la ronda 1 es el asiento 0; después rota al siguiente asiento no eliminado.

### 5.3 Turno
Un turno tiene exactamente dos pasos, en este orden:

**Paso 1 — robar (obligatorio).** `drawDeck` (carta superior del mazo) o `drawDiscard` (carta superior del descarte). La mano pasa a 8 cartas.
- Si roba del descarte y `config.forbidDiscardDrawnCard` es `true`, esa carta queda marcada como `lockedCardId` y **no puede descartarse en ese mismo turno**. Sí puede descartarse en turnos posteriores.
- Si el mazo está vacío al intentar robar: se toma el descarte entero salvo su carta superior, se baraja con el RNG y se convierte en el mazo nuevo (evento `deckReshuffled`). Si tras eso el mazo sigue vacío, la ronda termina sin cierre y **todos** suman sus puntos sueltos (nadie recibe bonificación).

**Paso 2 — descartar (obligatorio).** `discard` o `close`. La mano vuelve a 7 cartas y el turno pasa al siguiente jugador no eliminado.

No existe ninguna otra acción que consuma turno. `sortHand` se puede hacer en cualquier momento.

### 5.4 Combinaciones válidas
- **Grupo:** 3 o 4 cartas del mismo rango. (Los palos son distintos siempre, porque no hay cartas repetidas.)
- **Escalera:** 3 o más cartas consecutivas del mismo palo, en orden 1,2,…,12. Sin vuelta: `11,12,1` no vale.
- **Comodines:** un comodín puede sustituir a cualquier carta dentro de un grupo o de una escalera. **Máximo 1 comodín por combinación** (`maxJokersPerMeld: 1`, congelado).
- Ninguna carta puede estar en dos combinaciones a la vez.

### 5.5 Puntos sueltos (*deadwood*)
Suma de los puntos de las cartas que no forman parte de ninguna combinación, usando **la mejor combinación posible** de la mano (calculada por el resolver, §5.8).
- Rangos 1–9: su valor. Rangos 10, 11, 12: 10 puntos. Comodín suelto: `config.jokerPoints` (25 por defecto).

### 5.6 Cerrar
Un jugador puede ejecutar `close` con una carta `X` si, tras retirar `X` de su mano de 8 cartas, sus puntos sueltos son **≤ `config.closeThreshold`** (5 por defecto). Si no, el servidor responde `CANNOT_CLOSE`.
- `X` se va al descarte boca abajo (visualmente; en el estado es un descarte normal).
- La ronda termina inmediatamente. Nadie más juega.

### 5.7 Chinchón
Una mano de 7 cartas que forma **una única escalera de 7 cartas del mismo palo**, sin comodines (congelado: los comodines no valen para el chinchón).
- Se declara con `close` descartando la octava carta.
- Si `config.chinchonEndsGame` es `true` (por defecto): la partida entera termina en ese instante y ese jugador gana, sea cual sea el marcador.
- Si es `false`: la ronda termina y el jugador que hizo chinchón resta 25 puntos; los demás suman sus puntos sueltos.

### 5.8 Puntuación al final de la ronda
1. Para **cada** jugador no eliminado se calcula la mejor combinación posible y sus puntos sueltos.
2. El que cerró suma sus puntos sueltos (entre 0 y `closeThreshold`). Si son exactamente 0, suma `config.dryCloseBonus` (−10 por defecto) en lugar de 0.
3. Los demás suman sus puntos sueltos.
4. Todo jugador cuyo total sea **estrictamente mayor** que `config.eliminationScore` queda eliminado.
5. Si tras eliminar queda **un solo jugador**, gana la partida. Si quedan 0 (empate por eliminación simultánea), gana quien tenga el total más bajo; si persiste el empate, gana quien cerró; si tampoco, el asiento más bajo.
6. Si no, se reparte una ronda nueva con el repartidor rotado. Las manos y el descarte se descartan por completo.

### 5.9 Resolver óptimo (algoritmo obligatorio, no improvisar)

Entrada: mano de 7 u 8 cartas. Salida: `{ melds: CardId[][], leftovers: CardId[], deadwood: number }` con `deadwood` mínimo; a igualdad de puntos, la que use más cartas en combinaciones; a igualdad, orden estable por `CardId`.

```
1. Indexa las cartas 0..n-1 (n ≤ 8). Cada subconjunto es una máscara de bits.
2. Enumera TODAS las combinaciones válidas como máscaras:
   a) Grupos: para cada rango con k cartas presentes (k ≥ 2), todos los subconjuntos de
      tamaño ≥ 3; y todos los subconjuntos de tamaño exactamente 2 más un comodín.
   b) Escaleras: para cada palo, para cada rango inicial s de 1 a 12 y cada longitud
      L ≥ 3 con s+L-1 ≤ 12:
        - si están presentes las L cartas → combinación sin comodín.
        - si falta exactamente 1 y hay comodín libre → combinación con comodín.
   c) Descarta cualquier combinación con más de 1 comodín.
3. Búsqueda exhaustiva con memoización sobre la máscara restante:
     best(mask) = min( puntos(mask) ,  min sobre combinaciones c ⊆ mask de best(mask \ c) )
   Como n ≤ 8, hay como mucho 256 estados. Es instantáneo.
4. Reconstruye la solución guardando la combinación elegida en cada estado.
```

Casos límite obligatorios en los tests:
- Dos comodines en la mano: cada uno puede ir en una combinación distinta, nunca los dos en la misma.
- Una carta que encaja en un grupo y en una escalera: el resolver elige lo que minimice puntos.
- Mano sin ninguna combinación: `melds = []`, `deadwood` = suma de todo.
- Escalera de 7 con comodín: **no** es chinchón, pero sí es una escalera válida con 0 puntos sueltos.
- Escalera de 8 cartas en la mano de 8 antes de descartar: válida, se descarta la sobrante.

### 5.10 Tests dorados (escribir con estas manos exactas)

`config` por defecto. Formato `palo-rango`, comodines `joker-1`/`joker-2`.

| # | Mano (7) | melds esperadas | deadwood |
|---|----------|-----------------|----------|
| 1 | oros-1, oros-2, oros-3, oros-4, oros-5, oros-6, oros-7 | 1 escalera de 7 | 0 (chinchón) |
| 2 | oros-1, oros-2, oros-3, copas-5, copas-5… *(inválido, no repetir)* | — | — |
| 3 | oros-1, oros-2, oros-3, copas-7, espadas-7, bastos-7, copas-12 | escalera(3) + grupo(3) | 10 |
| 4 | oros-4, oros-5, joker-1, oros-7, copas-3, copas-4, copas-5 | escalera oros 4-7 con comodín + escalera copas 3-5 | 0 |
| 5 | oros-1, copas-3, espadas-5, bastos-7, oros-9, copas-11, espadas-12 | ninguna | 1+3+5+7+9+10+10 = 45 |
| 6 | joker-1, joker-2, oros-10, oros-11, copas-4, copas-5, copas-6 | escalera copas 4-6 + escalera oros 10-12 con 1 comodín | 25 (el otro comodín suelto) |
| 7 | oros-11, oros-12, copas-1, oros-1, espadas-1, bastos-1 + copas-2 | grupo de cuatro 1 + resto suelto | 10+10+2 = 22 |

(La fila 2 está intencionadamente marcada como inválida: sirve para recordar que **no puede haber cartas repetidas**; el test correspondiente debe comprobar que construir una mano con duplicados lanza error de invariante.)

Además, escribir un test de propiedad: 5.000 manos aleatorias con semilla fija; para cada una, comprobar que `deadwood` ≤ suma total y que las combinaciones devueltas son válidas y disjuntas.

---

## 6. Reglas de sala, conexión y anfitrión

- **Código de sala:** 4 caracteres del alfabeto sin ambigüedades. Se reintenta hasta encontrar uno libre entre las salas activas (máximo 10 intentos, luego `INTERNAL`).
- **Token de jugador:** 32 bytes aleatorios en base64url. El cliente lo guarda en `localStorage` bajo `ronda.token.<ROOMCODE>`. El servidor guarda solo el `sha256`.
- **Apodo:** 2 a 12 caracteres, letras (incluye tildes y ñ), números, espacios y guiones. Se recorta y se colapsan espacios. Único dentro de la sala, sin distinguir mayúsculas.
- **Desconexión:** el jugador se marca `connected: false`. La partida **se pausa** en su turno con un cartel «Esperando a {nick}». Sin expulsión automática.
- **Traspaso de anfitrión:** si el anfitrión lleva `HOST_GRACE = 45 s` desconectado, el anfitrión pasa al jugador conectado con el asiento más bajo. Evento `toast` a todos.
- **Expulsar o abandonar en partida:** el jugador sale, sus cartas van al descarte (sin puntuar), su marcador se congela y queda `eliminated: true`. Si quedan menos de 2 jugadores activos, la partida termina y gana el que quede.
- **Caducidad:** sala en `lobby` sin actividad 2 h → cerrada. Sala en juego sin nadie conectado 6 h → cerrada.
- **Límite de ritmo:** máximo 20 mensajes por socket y 10 s. Al superarlo, `RATE_LIMITED` y se ignoran los excedentes.
- **Pantalla central:** se conecta solo con el código de sala, sin token. Recibe únicamente `TableView`. Nunca puede enviar `game:action` ni `room:*`.

---

## 7. Rutas de la aplicación web

| Ruta | Pantalla | Notas |
|------|----------|-------|
| `/` | Inicio | Crear partida · Unirse · «Volver a la partida X» si hay token guardado |
| `/juegos` | Catálogo | Solo Chinchón. Ficha: jugadores, duración, cómo se juega |
| `/crear` | Crear sala | Elegir variantes, número de jugadores, apodo |
| `/unirse` | Unirse | Campo de código de 4 caracteres + apodo |
| `/unirse/[code]` | Unirse por enlace/QR | Código precargado, solo pide apodo |
| `/sala/[code]` | Lobby y partida | Renderiza según `view.status`. Es la pantalla principal |
| `/mesa/[code]` | Pantalla central | Sin token, solo lectura, pensada para tele. Landscape |
| `/reglas` | Reglas del Chinchón | Texto propio, redactado de cero |

Layout: móvil primero. `/mesa` es la única pantalla pensada para 16:9 grande.

---

## 8. Dirección de diseño (congelada)

**Concepto:** no es un casino. Es una mesa de bar con una baraja bien impresa. La referencia son las barajas españolas de imprenta: tinta densa, papel hueso, colores planos, geometría. Deliberadamente **no** verde tapete ni dorado de casino.

### 8.1 Tokens de color

```css
--tinta:     #14161F;  /* fondo general */
--mesa:      #1E2130;  /* superficies, tarjetas de interfaz */
--linea:     #2E3346;  /* bordes */
--hueso:     #EDE6D8;  /* texto principal y cara de las cartas */
--humo:      #9AA0B5;  /* texto secundario */
--brasa:     #D4462F;  /* acción principal y palo de copas */
--oro:       #C79A3B;  /* palo de oros */
--azul:      #3E6EA8;  /* palo de espadas */
--verde:     #2F6F5E;  /* palo de bastos */
```

Colores de asiento (`colorIndex` 0..3): `--brasa`, `--azul`, `--verde`, `--oro`.

### 8.2 Tipografías (Google Fonts, vía `next/font`)

- **Display / números de carta:** `Familjen Grotesk` (700). Se usa con moderación: números de carta, marcador, título de pantalla.
- **Cuerpo e interfaz:** `IBM Plex Sans` (400 / 600).
- **Datos y puntuación:** `IBM Plex Mono` (500), cifras tabulares, para que los marcadores no bailen.

Escala: 12 / 14 / 16 / 20 / 28 / 40 / 64. Interlineado 1.2 en display, 1.5 en cuerpo.

### 8.3 La carta (componente `PlayingCard`)

SVG generado, sin imágenes. Proporción **2:3**. Fondo `--hueso`, línea interior de 1.5 px del color del palo a 6 px del borde, esquinas 8 px.
- Rango arriba a la izquierda en `Familjen Grotesk` 700, y repetido abajo a la derecha girado 180°.
- El símbolo del palo es **geométrico y propio**: oros = círculo con anillo interior; copas = arco en U sobre pie rectangular; espadas = rombo alargado; bastos = barra con dos muescas. Todo con `<path>`, nada de tipografías de iconos ni emojis.
- Comodín: la palabra `JOKER` en vertical y los cuatro símbolos en las esquinas, en gris `--humo`.
- Dorso: `--tinta` con una retícula diagonal de líneas `--linea` a 45° y el punto central en `--brasa`.

### 8.4 Elemento firma: **el hilo de turno**

Una línea fina y continua de 2 px en `--brasa` que **viaja físicamente** de un asiento al siguiente cuando cambia el turno (250 ms, `ease-out`), en lugar de encenderse y apagarse. En el móvil recorre la banda superior de jugadores; en `/mesa` recorre el anillo de asientos alrededor del centro. Es lo único animado con ambición: todo lo demás es sobrio.

Otras animaciones permitidas, y solo estas: reparto en cascada (40 ms por carta), lanzamiento de la carta al descarte (180 ms, con rotación determinista derivada del `CardId` para que el montón parezca real), y revelado de combinaciones al final de ronda (escalonado, 80 ms). Todo se desactiva con `prefers-reduced-motion`.

### 8.5 Reglas de interfaz no negociables

1. **En tu turno hay una sola acción principal visible.** Roba → descarta. Nunca los dos botones a la vez.
2. Zona táctil mínima 56 px. Las cartas de la mano se seleccionan con un toque; se confirman con el botón grande inferior.
3. Nada de texto de más de 12 palabras en pantalla de partida.
4. La mano ocupa el tercio inferior. Nada importante en los 80 px superiores (muescas y barras del sistema).
5. El estado de conexión es una banda de 4 px arriba: verde translúcido conectado, `--oro` reconectando, `--brasa` sin conexión.
6. Foco de teclado siempre visible. Contraste mínimo AA sobre `--tinta`.
7. Textos: frase corta, verbo activo, sin exclamaciones. «Roba una carta», no «¡Es tu turno, roba una carta!».
