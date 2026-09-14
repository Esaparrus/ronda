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
export type CardId = string;     // 'oros-7' | 'copas-12' — baraja de 40, sin comodines (P31)

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
  closeThreshold: 0|3|5|10;       // puntos sueltos máximos para cerrar · por defecto 5
  dryCloseBonus: -10|0;           // cerrar con 0 puntos · por defecto -10
  eliminationScore: 50|100|150;   // por defecto 100 (se elimina al SUPERARLO)
  chinchonEndsGame: boolean;      // por defecto true
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
type Rank = 1|2|3|4|5|6|7|10|11|12;
interface Card { id: CardId; suit: Suit; rank: Rank; points: number }

// 40 cartas: rangos 1-7, 10, 11, 12 en los cuatro palos. Sin comodines. Es la
// MISMA baraja en los tres juegos (P31).
// Puntos: rank 1..7 → su valor. rank 10,11,12 → 10.
// Escaleras: sobre la POSICIÓN del rango (rankPosition: 1..7 → 1..7, 10,11,12
// → 8,9,10), no sobre el rango. El hueco entre el 7 y la sota NO corta la
// escalera: 6-7-sota es escalera. No hay vuelta (rey→as no vale).
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
Baraja española de **40 cartas**: rangos 1-7, 10 (sota), 11 (caballo) y 12 (rey) en oros, copas, espadas y bastos. **Sin comodines.**

> **P31 — cambio a un contrato congelado, decidido por Unai.** Hasta P30 esta baraja era de 48 + 2 comodines. Ahora es la misma que la de Pocha (§9.1) y la de Mus (§12.1): los tres juegos reparten los mismos 40 naipes. Consecuencias que se detallan más abajo: las escaleras se cuentan por posición (§5.4), desaparecen las variantes `jokers`, `jokerPoints` y `maxJokersPerMeld` (§2.7), y en una mesa de 4 quedan 11 cartas en el mazo tras el reparto en vez de 21, así que se rebaraja el descarte (§5.3) mucho antes.

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
- **Escalera:** 3 o más cartas seguidas del mismo palo. "Seguidas" se mide sobre la **posición** del rango en la baraja de 40, no sobre el número: 1,2,3,4,5,6,7,sota,caballo,rey son las posiciones 1 a 10. Por lo tanto **6-7-sota es escalera** y 5-6-7-sota es escalera de cuatro. Sin vuelta: `caballo,rey,as` no vale.
- **Sin comodines.** No existen en la baraja (§5.1).
- Ninguna carta puede estar en dos combinaciones a la vez.

### 5.5 Puntos sueltos (*deadwood*)
Suma de los puntos de las cartas que no forman parte de ninguna combinación, usando **la mejor combinación posible** de la mano (calculada por el resolver, §5.8).
- Rangos 1–7: su valor. Rangos 10, 11, 12: 10 puntos.

### 5.6 Cerrar
Un jugador puede ejecutar `close` con una carta `X` si, tras retirar `X` de su mano de 8 cartas, sus puntos sueltos son **≤ `config.closeThreshold`** (5 por defecto). Si no, el servidor responde `CANNOT_CLOSE`.
- `X` se va al descarte boca abajo (visualmente; en el estado es un descarte normal).
- La ronda termina inmediatamente. Nadie más juega.

### 5.7 Chinchón
Una mano de 7 cartas que forma **una única escalera de 7 cartas del mismo palo**, medida en posiciones igual que el §5.4. Con la baraja de 40 hay **4 chinchones por palo** (empezando en as, dos, tres o cuatro), 16 en total.
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
   a) Grupos: para cada rango con k cartas presentes (k ≥ 3), todos los subconjuntos de
      tamaño 3 y 4.
   b) Escaleras: para cada palo, para cada POSICIÓN inicial s de 1 a 10 y cada longitud
      L ≥ 3 con s+L-1 ≤ 10: si están presentes las L cartas → combinación.
      (Posición, no rango: ver §5.4. El hueco 7→sota no corta la escalera.)
3. Búsqueda exhaustiva con memoización sobre la máscara restante:
     best(mask) = min( puntos(mask) ,  min sobre combinaciones c ⊆ mask de best(mask \ c) )
   Como n ≤ 8, hay como mucho 256 estados. Es instantáneo.
4. Reconstruye la solución guardando la combinación elegida en cada estado.
```

Casos límite obligatorios en los tests:
- Escalera que cruza el hueco de la baraja (…6-7-sota-caballo…): válida, y es el caso que hay que fijar (P31).
- Una carta que encaja en un grupo y en una escalera: el resolver elige lo que minimice puntos.
- Mano sin ninguna combinación: `melds = []`, `deadwood` = suma de todo.
- Escalera de 8 cartas en la mano de 8 antes de descartar: válida, se descarta la sobrante.
- Una mano con un ocho, un nueve o un comodín: el resolver **lanza**, no la puntúa (no son cartas de la baraja).

### 5.10 Tests dorados (escribir con estas manos exactas)

`config` por defecto. Formato `palo-rango`. **Actualizados en P31**: los casos 4, 5 y 6 usaban comodines o nueves y se han sustituido por los que fijan la baraja de 40 — el hueco 7→sota y el tope sota-caballo-rey.

| # | Mano (7) | melds esperadas | deadwood |
|---|----------|-----------------|----------|
| 1 | oros-1, oros-2, oros-3, oros-4, oros-5, oros-6, oros-7 | 1 escalera de 7 | 0 (chinchón) |
| 2 | oros-1, oros-2, oros-3, copas-5, copas-5… *(inválido, no repetir)* | — | — |
| 3 | oros-1, oros-2, oros-3, copas-7, espadas-7, bastos-7, copas-12 | escalera(3) + grupo(3) | 10 |
| 4 | oros-5, oros-6, oros-7, oros-10, copas-3, copas-4, copas-5 | escalera oros 5-6-7-sota (cruza el hueco) + escalera copas 3-5 | 0 |
| 5 | oros-1, copas-3, espadas-5, bastos-7, oros-11, copas-12, espadas-10 | ninguna | 1+3+5+7+10+10+10 = 46 |
| 6 | espadas-10, espadas-11, espadas-12, oros-1, oros-2, copas-4, copas-5 | escalera espadas sota-caballo-rey | 1+2+4+5 = 12 |
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

**Concepto (reescrito en P32, decisión de Unai):** un **bar de barrio español**. Madera oscura con veta, latón gastado, tapete verde de mesa camilla con su filete rojo, y los tantos contados con **garbanzos**. Sigue sin ser un casino: lo que se descartaba en la versión original de este párrafo era el brillo de casino —neón, dorado metálico, fieltro saturado, mesa ovalada—, no el mueble. Una mesa de bar con tapete no es una mesa de casino, así que **se levanta la prohibición del verde tapete** que decía aquí hasta P32; el resto de la prohibición sigue en pie.

> El diseño de origen es el proyecto `Ronda mobile app UI design` de claude.ai/design (`Ronda.dc.html`). Lo que se implementó y lo que se descartó de él está en `02-PAQUETES.md` P32.

### 8.1 Tokens de color

```css
--tinta:     #241509;  /* fondo general: madera oscura */
--veta:      #2A180C;  /* segunda banda de la veta del fondo */
--mesa:      #3B2417;  /* superficies, tarjetas de interfaz */
--linea:     #5A4530;  /* bordes */
--hueso:     #EFE3C8;  /* texto principal y cara de las cartas */
--humo:      #B8A688;  /* texto secundario */
--brasa:     #8C2F22;  /* acción principal */
--oro:       #C9982E;  /* latón: acento, bordes vivos, foco */
--teja:      #A33B2A;  /* asiento 1 */
--verde:     #3F6B4F;  /* asiento 2 (verde botella) */
--azul:      #5B6B7A;  /* asiento 4 (gris pizarra) */
--violeta:   #7A5A8C;  /* asiento 5 */
--rosa:      #9C4F5E;  /* asiento 6 */
```

Colores de asiento (`colorIndex` 0..5): `--teja`, `--verde`, `--oro`, `--azul`, `--violeta`, `--rosa`. **Ninguno es `--brasa`**: la acción principal no puede confundirse con un asiento, que es lo que pasaba antes de P32 con el asiento 0.

El fondo de la página no es un color plano sino la propia madera: una veta de 6 px (`--tinta` / `--veta`) con un halo de latón al 8 % arriba, y `background-attachment: fixed` para que no se mueva al hacer scroll —que es lo que la delataría como rayas.

La paleta de la CARA de la carta (`--card-*`) no cambia: la carta es un objeto impreso aparte de la interfaz que la rodea, y es la baraja fotografiada de `public/cards/` (P30/P31).

#### El mueble y la legumbre

```css
--table-wood-a: #6B4726;  --table-wood-b: #4A2F18;  --table-wood-c: #3B2417;
--table-felt-a: #335640;  --table-felt-b: #213A2C;
--table-edge:   #7A2A20;  /* filete rojo del tapete y marcas de palo */
--table-stud-a: #E0B85A;  --table-stud-b: #8A6A2A;  /* tachuelas de latón */
--garbanzo-a:   #F2E3B8;  --garbanzo-b: #C9A868;  --garbanzo-c: #9C7E48;
```

Se materializan en cuatro clases de `globals.css` —`.bar-table`, `.bar-felt`, `.bar-stud`, `.garbanzo`/`.garbanzo-vacio`— porque son degradados, y un literal de color solo puede vivir en ese fichero.

### 8.2 Tipografías (Google Fonts, vía `next/font`)

- **Display:** `Domine` (600 / 700). **Cambiada en P32**, era `Familjen Grotesk`: una serif con mucho peso es lo que hay pintado en la fachada de un bar, y la grotesca leía como app. Se usa con moderación: marcador, título de pantalla, inicial del avatar.
- **Cuerpo e interfaz:** `IBM Plex Sans` (400 / 600).
- **Datos y puntuación:** `IBM Plex Mono` (500), cifras tabulares, para que los marcadores no bailen.

Escala: 12 / 14 / 16 / 20 / 28 / 40 / 64. Interlineado 1.2 en display, 1.5 en cuerpo.

### 8.3 La carta (componente `PlayingCard`)

Proporción **2:3** (`viewBox` 0 0 72 108), esquinas 8 px. El MARCO es SVG —fondo, contorno de tinta, barra de combinación y velo de atenuado— y la CARA es la imagen de la baraja española de `public/cards/`.

> **Actualizado por P30/P31, no por P32.** Este párrafo describía hasta aquí una baraja dibujada entera en SVG (pips geométricos, figuras, comodín). Ya no existe: P30 metió la baraja de imágenes y P31 borró el dibujo SVG al quedarse sin camino, porque los 40 naipes de los tres juegos tienen imagen. Queda escrito aquí porque el documento seguía describiendo un componente que no existe. **Sigue pendiente y es de Unai:** esas imágenes son de un tercero y llevan marca de agua (ver P30).

- Dorso: sigue siendo SVG (`CardBack`), retícula diagonal en dos tonos violeta con filete y rombo en `--card-back-gold`. Es lo único que se dibuja de la carta.

### 8.4 Elemento firma: **el hilo de turno**

Una línea fina y continua de 2 px en `--brasa` que **viaja físicamente** de un asiento al siguiente cuando cambia el turno (250 ms, `ease-out`), en lugar de encenderse y apagarse.

> **Acotado por P32.** El hilo nació cuando las tres pantallas de partida tenían una banda de jugadores en la que recorrer. Sigue igual donde sigue habiendo banda: en `/mesa` (el anillo de asientos de `SeatRing`) y en Pocha, que conserva `PlayerStrip` por caber hasta seis. En Chinchón y en Mus ya no hay banda —la gente está sentada alrededor de la mesa—, y ahí el turno se marca con **aro de `--hueso`** en el avatar del asiento en turno, más el apodo en el encabezado. El aro va en hueso y no en latón porque el latón ya es el borde de todos los avatares, y como señal de turno no diría nada.

Otras animaciones permitidas, y solo estas: reparto en cascada (40 ms por carta), lanzamiento de la carta al descarte (180 ms, con rotación determinista derivada del `CardId` para que el montón parezca real), y revelado de combinaciones al final de ronda (escalonado, 80 ms). Todo se desactiva con `prefers-reduced-motion`.

### 8.5 Reglas de interfaz no negociables

1. **En tu turno hay una sola acción principal visible.** Roba → descarta. Nunca los dos botones a la vez.
2. Zona táctil mínima 56 px. Las cartas de la mano se seleccionan con un toque; se confirman con el botón grande inferior.
3. Nada de texto de más de 12 palabras en pantalla de partida.
4. La mano ocupa el tercio inferior. Nada importante en los 80 px superiores (muescas y barras del sistema).
5. El estado de conexión es una banda de 4 px arriba: verde translúcido conectado, `--oro` reconectando, `--brasa` sin conexión.
6. Foco de teclado siempre visible. Contraste mínimo AA sobre `--tinta`.
7. Textos: frase corta, verbo activo, sin exclamaciones. «Roba una carta», no «¡Es tu turno, roba una carta!».

### 8.6 La mesa y los garbanzos (P32)

**La mesa** (`BarTable`) es un mueble, no un rectángulo de color: tablero de madera de 340×262 con las esquinas a 10 px, cuatro tachuelas de latón de 7 px, y un tapete verde hundido 13 px con esquinas a 26 px, su filete rojo interior y **un palo español marcado en cada esquina** (oros, copas, espadas, bastos). Es **cuadrada, no ovalada**: la ovalada es de casino; la de bar de barrio es cuadrada y de cuatro patas.

`BarTable` solo pone el mueble. Lo que se apoya encima lo pasa quien la usa: mazo y descarte en Chinchón, triunfo y baza en Pocha, el lance en Mus.

**Los asientos** en vertical (`TableSeat`): tú abajo, en una chapa ovalada con la marca «TÚ»; los demás arriba, en columnas de 72 px, ordenados por `orderAroundMe()` según te llega el turno. En Mus eso deja al compañero (asiento+2) en el centro de la fila de arriba, enfrente de ti, sin que el componente sepa nada de parejas: es la geometría de la mesa real. **Pocha se queda fuera** y conserva `PlayerStrip`: admite seis jugadores (§10.7) y cinco asientos de 72 px no caben en el borde superior de un móvil.

**Los garbanzos** (`Garbanzos`) son la unidad de cuenta visible. Ocho huecos en los tres juegos, para que la fila signifique siempre lo mismo —cuántos te faltan para que pase algo— pero contando cosas distintas:

| Juego | Qué es un garbanzo | Huecos |
|-------|--------------------|--------|
| Mus | Un amarrako de tu pareja (§12.3). Es el caso literal: en la mesa se apartan con legumbre. | 8 = un juego |
| Chinchón | Un octavo de `config.eliminationScore`. Cuenta lo que te acerca a quedarte fuera. | 8 = eliminado |
| Pocha | Una baza ganada en la ronda, en `PochaBidRow`. | Lo que cantaste — y si te pasas, la fila crece por encima |

El número **siempre** acompaña a la fila: un garbanzo se ve de un vistazo, pero «27» no se lee en garbanzos, y §8.5.6 pide que ningún dato dependa solo de una forma.

---

## 9. REGLAS DE POCHA — versión congelada (P21)

Segundo juego (`02-PAQUETES.md`, "Después del MVP" #1). Ruleset confirmado por Unai
para este paquete. Igual que §5: **esta es la única fuente de verdad. Si algo no
está aquí, no existe.**

**Actualización tras confirmación de Unai (segunda ronda de P21):** de las
cuatro notas marcadas **[DECISIÓN P21, A CONFIRMAR]** en la redacción
original de esta sección, dos quedan resueltas aquí:

- La baraja francesa **se descarta por completo** (§9.1) — Pocha solo se
  juega con la española de 40 cartas, sin variante de baraja configurable.
- El orden de rango para ganar bazas **pasa a ser configurable** (§9.6,
  `config.rankOrder`), con ambos órdenes especificados con precisión.

Las otras dos notas (desempate de fin de partida, §9.8; abandono a mitad de
ronda, §9.9) **siguen siendo propuestas pendientes de confirmar**, sin
cambios en esta actualización — se mantiene el mismo criterio: son
razonables para que el contrato quede completo, pero no definitivas hasta
que Unai las confirme explícitamente (`00-MASTER.md` punto 9).

### 9.1 Materiales

Baraja española, **40 cartas**: rangos 1–7, 10, 11, 12 (sin 8 ni 9) en oros,
copas, espadas y bastos. Única baraja soportada — sin variante configurable.
Reutiliza el tipo `Rank` existente de `packages/protocol` sin cambios: es un
subconjunto de `1|2|...|12`, no hace falta ampliar el tipo, solo que el
constructor de baraja de Pocha no genere 8 ni 9.

### 9.2 Jugadores y estructura de rondas (pirámide)

- **Jugadores:** de 3 a 6, fijado por `config.maxPlayers` al crear la sala
  (igual que Chinchón usa `config.maxPlayers` como tope elegido por el
  anfitrión). Mínimo de partida: **3** (fijo, no configurable).
- Sea `D = 40` (nº de cartas de la baraja española) y `n` el nº de jugadores.
  El tamaño máximo de mano de la ronda es:

  ```
  M = floor((D - 1) / n) = floor(39 / n)
  ```

  (el "−1" reserva siempre al menos una carta para revelar el triunfo, §9.3).

- La partida se juega en rondas de tamaño **1, 2, …, M−1, M, M−1, …, 2, 1**
  (sube hasta M y baja, sin repetir el pico) — de ahí "pirámide". Total de
  rondas: `2M − 1`.
- Valores exactos de `M` y nº de rondas por nº de jugadores:

  | Jugadores | M   | Rondas |
  | --------- | --- | ------ |
  | 3         | 13  | 25     |
  | 4         | 9   | 17     |
  | 5         | 7   | 13     |
  | 6         | 6   | 11     |

- El repartidor de la ronda 1 es el asiento 0; rota al siguiente asiento en
  cada ronda (sin saltar a nadie: a diferencia de Chinchón, en Pocha no hay
  eliminación durante la partida, §9.8).

### 9.3 Reparto y triunfo

1. Se baraja con el RNG sembrado.
2. Se reparten `roundSize` cartas a cada jugador, una a una, empezando por el
   jugador a la izquierda del repartidor.
3. Se revela **1 carta** de la baraja restante (la primera carta no repartida):
   su palo es el **triunfo** de la ronda, si `config.trump` es `true`. Esa
   carta no entra en ninguna mano ni se juega.
4. Si `config.trump` es `false`, no hay revelado ni triunfo: gana la baza
   siempre la carta de más fuerza del palo que salió, según `config.rankOrder`
   (§9.6) — el mismo criterio de fuerza aplica con o sin triunfo.
5. Cualquier carta de la baraja que sobre tras el reparto y el revelado (puede
   pasar: `M` es un `floor`, así que a veces sobra más de 1 carta) se queda
   fuera de juego esa ronda — no se reparte ni se usa.

### 9.4 Cantes (apuestas de bazas)

- Tras ver su mano (y el triunfo, si lo hay), cada jugador **canta** cuántas
  bazas cree que va a ganar esa ronda, un número entero entre `0` y
  `roundSize`. Se canta en el mismo orden de turno que se juega (empezando por
  el jugador a la izquierda del repartidor), así que **el repartidor siempre
  canta el último**.
- **Regla del enganche:** sea `S` la suma de los cantes ya hechos por el resto
  de jugadores antes de que le toque al repartidor. El repartidor **no puede**
  cantar el valor `roundSize − S` (el único que dejaría la suma total de
  cantes exactamente igual al número de bazas disponibles). Si ese valor no
  está entre `0` y `roundSize` de todas formas, la regla no restringe nada
  (el repartidor puede cantar con total libertad). Ningún otro jugador tiene
  esta restricción: pueden cantar cualquier valor válido, aunque deje
  imposible o ya garantizado el resultado para los que faltan por cantar.
- Cantar un valor fuera de `[0, roundSize]`, o el valor prohibido por el
  enganche siendo el repartidor, es `INVALID_BID` / `BID_HOOKED` (§10.5).

### 9.5 Juego de bazas

- Lleva la primera baza el jugador a la izquierda del repartidor. Cada
  jugador, en orden de turno, juega una carta de su mano.
- **Obligación de asistir:** si el jugador tiene alguna carta del palo que
  salió, debe jugar una de ese palo. Si no tiene ninguna, puede jugar
  cualquier carta (incluido triunfo). Jugar fuera de palo teniendo cartas de
  ese palo es `MUST_FOLLOW_SUIT`.
- Ganada la baza (§9.6), quien la gana lleva la siguiente. Se repite hasta
  jugar las `roundSize` cartas de la mano.

### 9.6 Ganador de una baza (algoritmo obligatorio)

La "fuerza" de una carta para decidir bazas depende de `config.rankOrder`
(confirmado por Unai como variante configurable, elegida al crear la sala,
igual que `trump`/`maxPlayers`). Dos tablas de fuerza posibles, ambas
sobre el mismo conjunto de 10 rangos de la baraja española de Pocha
(1,2,3,4,5,6,7,10,11,12 — §9.1):

| Rango        | `numerico` (fuerza) | `brisca` (fuerza)      |
| ------------ | ------------------- | ---------------------- |
| 1 (As)       | 1                   | **10** (la más fuerte) |
| 2            | 2                   | 1 (la más débil)       |
| 3 (Tres)     | 3                   | 9                      |
| 4            | 4                   | 2                      |
| 5            | 5                   | 3                      |
| 6            | 6                   | 4                      |
| 7            | 7                   | 5                      |
| 10 (Sota)    | 10                  | 6                      |
| 11 (Caballo) | 11                  | 7                      |
| 12 (Rey)     | 12                  | 8                      |

(La columna `numerico` es, a propósito, idéntica al propio `rank` — no hace
falta ninguna tabla de verdad para ese modo, se lista aquí solo para
comparar los dos órdenes lado a lado en la misma tabla. La columna `brisca`
sí es una tabla de verdad: es un orden de fuerza arbitrario que no coincide
con ningún valor existente.)

- **`numerico`** (por defecto): la fuerza es el propio valor de `rank` — el
  mismo orden que ya usa Chinchón para escaleras (12 el más alto, 1 el más
  bajo), sin tabla especial. Elegido como valor por defecto por dos motivos:
  es el más simple de los dos (no hace falta tabla de fuerza en el motor,
  basta comparar `rank`), y es consistente con el resto del código, que ya
  usa el orden numérico natural de `Rank` en todas partes (Chinchón no tiene
  ningún concepto de "fuerza" especial de carta).
- **`brisca`**: el orden de fuerza tradicional de los juegos de baza
  españoles (brisca, tute) — As y Tres por encima de las figuras, que es la
  parte contraintuitiva que hay que tener tabulada explícitamente en vez de
  improvisarla. Configurable para quien prefiera esta convención, más
  familiar para bastante gente en España que ha jugado a brisca o tute.

```
entrada: cartas jugadas en la baza, en orden, con quién jugó cada una;
         palo que salió (el de la primera carta jugada); palo de triunfo o null;
         config.rankOrder ('numerico' | 'brisca').
fuerza(carta) = tabla de arriba según config.rankOrder, indexada por rank.

1. Si hay triunfo Y alguna carta jugada es de ese palo:
     gana quien jugó la carta de triunfo con mayor fuerza(carta).
2. Si no:
     gana quien jugó la carta del palo que salió con mayor fuerza(carta)
     (las cartas de otros palos, jugadas por no poder asistir, no cuentan).
```

### 9.7 Puntuación de la ronda

Para cada jugador, al final de la ronda (todas las bazas jugadas):

| Condición              | Puntos de la ronda   |
| ---------------------- | -------------------- |
| Bazas ganadas == cante | `10 + bazas ganadas` |
| Bazas ganadas != cante | `0`                  |

Los puntos se **acumulan** entre rondas (no hay resta, no hay eliminación
intermedia — a diferencia de Chinchón, aquí nadie queda eliminado a mitad de
partida, ver §9.8).

### 9.8 Fin de la partida y desempate

- La partida termina al completar la ronda de tamaño 1 final (la última de la
  pirámide, `2M − 1` rondas jugadas en total). No hay condición de fin
  anticipado: se juegan todas las rondas.
- Gana quien tenga el total más alto acumulado.
- **[DECISIÓN P21, A CONFIRMAR]** Desempate, en cascada (no especificado por
  Unai, propuesto aquí siguiendo el mismo estilo de cascada que Chinchón
  §5.8.5): (1) quien haya acertado el cante más veces en toda la partida: (2)
  quien haya ganado más bazas en total; (3) el asiento más bajo entre los
  empatados.

### 9.9 Abandono o desconexión a mitad de ronda

**[DECISIÓN P21, A CONFIRMAR]** Pocha no tiene un mecanismo natural de
"abandonar y seguir" como Chinchón (§6: las cartas de quien se va pasan al
descarte y la partida sigue sin él): en una ronda de bazas, quitar a un
jugador a mitad deja cantes y bazas ya jugadas sin sentido para el resto. Se
propone: si un jugador se desconecta y no vuelve dentro del margen normal de
reconexión, la ronda **en curso se anula sin puntuar para nadie** y la
partida continúa en la siguiente ronda de la pirámide sin ese jugador (su
cante y sus bazas de la ronda anulada no cuentan). Si en algún momento quedan
menos de 3 jugadores conectados, la partida termina y gana quien tenga el
total más alto acumulado hasta ese punto (mismo criterio de desempate de
§9.8). Esto es una propuesta razonable, no una petición explícita de Unai —
confirmar antes de que P22 la implemente.

### 9.10 Configuración (`PochaConfig`)

```ts
interface PochaConfig {
  gameId: 'pocha';
  trump: boolean; // por defecto true
  rankOrder: 'numerico' | 'brisca'; // por defecto 'numerico' — ver §9.6
  maxPlayers: 3 | 4 | 5 | 6; // por defecto 4 (no especificado por Unai; rango confirmado 3-6)
  soundEnabled: boolean; // por defecto true, igual que Chinchón
}
```

No lleva campo `deck`: la baraja española de 40 cartas es la única soportada
(§9.1), no una variante configurable.

`minPlayers` no es configurable: siempre 3, análogo a como `MIN_PLAYERS` de
Chinchón tampoco se expone en la interfaz. Solo el anfitrión y solo antes de
empezar, igual que `ChinchonConfig` (§2.7).

### 9.11 Tests dorados (escribir con estos casos exactos)

Con `config` por defecto (española 40, triunfo activo, 4 jugadores):

1. **Pirámide:** `M = floor(39/4) = 9`. La secuencia de tamaños de ronda debe
   ser exactamente `[1,2,3,4,5,6,7,8,9,8,7,6,5,4,3,2,1]` (17 rondas).
2. **Enganche activa:** ronda de 4 bazas, 4 jugadores. Cantan en orden 1, 1, 1
   (suma 3). Al repartidor (4º en cantar) se le prohíbe cantar `4 - 3 = 1`
   (dejaría la suma en 4, igual a las bazas disponibles); cualquier otro valor
   de `0..4` menos el 1 es válido.
3. **Enganche no aplica:** mismos cantes 1, 1, 1 (suma 3) pero ronda de 5
   bazas: el valor prohibido sería `5 - 3 = 2`, que sigue estando disponible
   como única restricción — pero si la suma ya fuera, por ejemplo, 6 (cantes
   2,2,2 en una ronda de 4), el valor prohibido `4-6=-2` cae fuera de `[0,4]`
   y el repartidor puede cantar lo que quiera.
4. **Triunfo decide la baza (independiente de `rankOrder`):** salen bastos,
   triunfo oros. Se juegan bastos-10, bastos-12, oros-2, bastos-7. Gana quien
   jugó `oros-2` (único triunfo en la baza), sea cual sea `config.rankOrder`
   — con un solo triunfo en la baza no hace falta comparar fuerzas.
5. **Sin triunfo en la baza, orden `numerico` (por defecto):** salen copas,
   sin triunfo jugado. Se juegan copas-3, copas-11, oros-7 (no pudo asistir),
   copas-6. Gana quien jugó `copas-11` (fuerza numérica 11, la más alta de
   las de copas); la `oros-7` no cuenta al no ser del palo que salió ni
   triunfo.
   5b. **Mismas cartas, orden `brisca`:** exactamente la misma baza que el caso
   5 (copas-3, copas-11, oros-7, copas-6), pero con `config.rankOrder =
'brisca'`. Gana `copas-3` en vez de `copas-11` — bajo la tabla de fuerza
   de §9.6, el Tres tiene fuerza 9 y el Caballo (11) solo fuerza 7. Este caso
   existe específicamente para que el test de `rankOrder` distinga los dos
   modos con una única baza, no solo con la tabla de fuerza aislada.
6. **Puntuación:** jugador cantó 3, ganó 3 bazas → `10 + 3 = 13` puntos.
   Jugador cantó 2, ganó 1 baza → `0` puntos.

Además, escribir un test de propiedad: para cualquier ronda válida (bazas y
cantes generados aleatoriamente con semilla fija), la suma de bazas
efectivamente ganadas por todos los jugadores debe ser exactamente
`roundSize`.

---

## 10. Cambios de contrato para admitir un segundo juego (decisiones de P21)

Esta sección amplía `§2` y `§3` para que quepa Pocha. Son cambios de contrato
de verdad (no solo de Pocha): tocan tipos que hoy solo conoce Chinchón. Cada
punto dice explícitamente si Chinchón cambia de forma (aunque no de
comportamiento) o si solo se añade algo nuevo al lado.

### 10.1 `GameId`

```ts
export type GameId = 'chinchon' | 'pocha';
```

Único cambio de `§2.1`. Se ensancha el literal; nada más de esa sección
cambia.

### 10.2 `GameConfig`

Pasa de ser una interfaz única (hoy, en la práctica, `ChinchonConfig` con
otro nombre) a una unión discriminada por `gameId`, tal y como ya anticipaba
el comentario de `packages/protocol/src/config.ts` escrito en P1:

```ts
interface CommonGameConfig {
  soundEnabled: boolean; // preferencia local, no afecta al motor (igual que hoy)
}

interface ChinchonConfig extends CommonGameConfig {
  gameId: 'chinchon';
  maxPlayers: 2 | 3 | 4;
  handSize: 7;
  closeThreshold: 0 | 3 | 5 | 10;
  dryCloseBonus: -10 | 0;
  eliminationScore: 50 | 100 | 150;
  chinchonEndsGame: boolean;
  forbidDiscardDrawnCard: boolean; // P31: fuera jokers, jokerPoints, maxJokersPerMeld
}

interface PochaConfig extends CommonGameConfig {
  // campos en §9.10
}

export type GameConfig = ChinchonConfig | PochaConfig;
```

**Esto SÍ toca la forma congelada de `ChinchonConfig` (§2.7):** gana un campo
`gameId: 'chinchon'` que hoy no tiene (necesario para que TypeScript pueda
distinguir el miembro de la unión) y pasa a heredar `soundEnabled` de
`CommonGameConfig` en vez de declararlo suelto. Ningún valor ni comportamiento
de Chinchón cambia — es solo la forma del tipo. Aun así, es un cambio real a
un contrato congelado y se lista aquí explícitamente en vez de darlo por
hecho.

### 10.3 `GameEvent` (nuevos, además de los 10 existentes de §2.4)

```ts
type GameEvent =
  // ... los 10 de §2.4, sin cambios ...
  | { t: 'trumpRevealed'; cardId: CardId }
  | { t: 'bid'; playerId: PlayerId; amount: number }
  | { t: 'cardPlayed'; playerId: PlayerId; cardId: CardId }
  | { t: 'trickWon'; playerId: PlayerId; cards: CardId[] };
```

`roundScored` y `gameOver` (ya existentes) se reutilizan tal cual para Pocha.

### 10.4 `GameAction` (nuevos, además de los 6 existentes de §2.6)

```ts
type GameAction =
  // ... los 6 de §2.6 (algunos no aplican a Pocha, ver nota) ...
  { type: 'bid'; amount: number } | { type: 'playCard'; cardId: CardId };
```

De las 6 acciones de Chinchón, solo `nextRound` se reutiliza en Pocha
(confirmar ronda en la pantalla de fin de ronda). `drawDeck`, `drawDiscard`,
`discard`, `close` y `sortHand` no tienen sentido en Pocha (no hay mazo ni
descarte individual) y su `GameModule.applyAction` simplemente no los acepta.

### 10.5 `ERROR_CODES` (nuevos, además de los 22 existentes de §2.2)

```ts
export const ERROR_CODES = [
  // ... los 22 de §2.2 ...
  'INVALID_BID', // cante fuera de 0..roundSize
  'BID_HOOKED', // repartidor intentando el cante prohibido por el enganche (§9.4)
  'MUST_FOLLOW_SUIT', // jugó fuera de palo teniendo cartas del palo que salió (§9.5)
  'NOT_YOUR_TRICK', // jugó carta fuera de su turno de baza
] as const;
```

Reutilizables sin cambio: `ROOM_NOT_FOUND`, `ROOM_FULL`, `NOT_YOUR_TURN`,
`CARD_NOT_IN_HAND`, `STALE_VERSION`, `RATE_LIMITED`, `INTERNAL`, etc. — todo
lo que no es específico de robar/descartar/cerrar.

### 10.6 `MAX_PLAYERS` / `MIN_PLAYERS`

Hoy son constantes globales únicas (`MAX_PLAYERS = 4`, `MIN_PLAYERS = 2`,
§2.1) usadas como el único límite de sala. Con dos juegos de rango distinto
(Chinchón 2-4, Pocha 3-6), pasan a ser el **límite absoluto de la sala**
(unión de ambos rangos), no el límite de un juego concreto:

```ts
export const MAX_PLAYERS = 6; // antes 4
export const MIN_PLAYERS = 2; // sin cambio — Chinchón lo sigue necesitando
```

El límite real de cada partida lo sigue poniendo el `maxPlayers` del
`GameConfig` de ese juego (§2.7 para Chinchón, §9.10 para Pocha) — estas dos
constantes solo acotan cosas que no dependen del juego, como el tamaño de
array de `players` antes de saber qué se va a jugar en esa sala.

### 10.7 `colorIndex` y colores de asiento — hallazgo real, no anticipado

Al revisar `§2.5` para escribir esta sección se ha encontrado una dependencia
concreta que Pocha rompe de verdad, más allá de los tipos: `PublicPlayer.colorIndex`
está congelado como `0|1|2|3` (§2.5) y `§8.1` solo define **4** colores de
asiento (`--brasa`, `--azul`, `--verde`, `--oro`) — que además son los mismos
4 tokens que ya representan los 4 palos de la baraja española. Con hasta 6
jugadores en Pocha, esto no llega:

- `colorIndex` necesita ensancharse a `0|1|2|3|4|5`.
- Hacen falta **2 colores de asiento nuevos** en `§8.1` — y no pueden ser
  simplemente "más tonos", porque los 4 existentes ya significan un palo cada
  uno en el contexto de las cartas; reutilizarlos para asiento 5 y 6 sería
  visualmente confuso en la misma pantalla. Esto es una decisión de diseño
  real (qué color, y que siga la identidad "papel hueso, tinta densa" de
  `§8`), no solo una ampliación de tipo — pendiente de que Unai la apruebe
  cuando se aborde la interfaz de Pocha (P24 en el plan propuesto).
- La geometría de `SeatRing` (`/mesa`, P15) y de la banda de jugadores de
  `/sala` (`PlayerStrip`, P14) se construyó asumiendo como máximo 4 asientos;
  layout para 5-6 es trabajo de interfaz nuevo, no una reutilización directa.

Se deja constancia aquí porque es exactamente el tipo de cosa que
`00-MASTER.md` (punto 8, y la nota "no generalices antes de tenerlo" de
`02-PAQUETES.md`) predijo que Pocha forzaría a descubrir — y es más grande de
lo que un cambio de tipo sugiere a primera vista.

### 10.8 Lo que NO cambia

- `GameModule<S, A>` (§3) y el registro `GAMES` — el motivo de que este
  ejercicio sea manejable es que esa interfaz ya era genérica de verdad.
- `Card`, `Suit`, `Rank`, `CardId` (§3.1) — sin ningún cambio: Pocha usa la
  misma baraja española que Chinchón (subconjunto de rangos ya representable
  en `Rank`, mismos 4 palos). La variante de baraja francesa que se
  planteó en la primera redacción de este paquete se ha descartado por
  completo (§9.1) — no hay ninguna ampliación de `Suit` pendiente.
- El sobre de red (`§2.3`, `§2.4`: `game:action`, `room:*`, `state:view`,
  idempotencia por `clientActionId`, `expectedVersion`) — Pocha es un
  `GameModule` más, no un protocolo de transporte nuevo.
- La base de datos (`§4`): `rooms.game_id` ya es `text`, no un enum de
  Postgres — no hace falta migración para añadir `'pocha'` como valor.

---

## 11. EXTRAS SOCIALES POST-MVP (P25 · P26) — implementado

Los dos primeros puntos del roadmap "Después del MVP" de `02-PAQUETES.md`
posteriores a Pocha. Ninguno toca el motor: son ampliaciones del sobre de red
(§2.3, §2.4) y del servidor, no reglas de juego.

### 11.1 Reacciones rápidas (§2 del roadmap) — P25

Cuatro emojis, lista cerrada, **sin chat libre en ninguna parte de la app**.
Lo que impide que esto degenere en un chat es el contrato, no la interfaz: el
payload solo admite uno de cuatro identificadores.

- `REACTION_IDS = ['aplauso', 'risa', 'asombro', 'pensar']`
  (`packages/protocol/src/reactions.ts`). El **emoji no viaja**: el protocolo
  transporta el identificador y la cara la pone
  `apps/web/src/lib/reactions.ts`.
- Evento cliente→servidor `reaction:send` `{ reaction: ReactionId }`, ack
  `Result<null>`. Evento servidor→cliente `reaction`
  `{ playerId, seat, reaction, at }`, difundido a **todos** los miembros —
  incluidos el propio autor y la pantalla central (`/mesa`).
- No es una `GameAction`: no pasa por el reducer, no consume versión y no
  aparece en `events`.
- **Enfriamiento propio por jugador**: `REACTION_COOLDOWN_MS = 1500`. Al
  superarlo, el ack responde `RATE_LIMITED` (no hizo falta código de error
  nuevo). Es independiente del límite global de sockets de §6.
- Vale en cualquier estado de sala (lobby incluido) y para cualquier jugador,
  eliminado o no. **No cuenta como actividad**: no llama a `room.touch()`, así
  que una sala en la que solo se mandan emojis sigue caducando por §6.
- En pantalla vive `REACTION_TTL_MS = 2500`. La animación `reaction-float` es
  la única añadida a la lista cerrada de §8.4, y respeta
  `prefers-reduced-motion` como el resto.

### 11.2 Estadísticas del grupo, por sala (§3 del roadmap) — P26

- Son **de la sala**, no de un jugador: sin cuentas ni identidad persistente
  (`00-MASTER.md` §1, cambio 12), estas cifras viven mientras viva la sala y
  se acumulan entre partidas sucesivas de esa misma sala (revanchas).
- `RoomStats { roomCode, gameId, matches, rows: RoomStatsRow[] }` con
  `RoomStatsRow { playerId, nick, seat, matches, wins, rounds, totalScore,
  bestScore, worstScore }` (`packages/protocol/src/stats.ts`).
- Evento cliente→servidor `room:stats` (sin payload), ack `Result<RoomStats>`.
  **A demanda, no en cada snapshot**: meterlas en `state:view` habría
  engordado el mensaje más frecuente del protocolo para un dato que solo se
  mira al abrir el panel o al terminar una partida. Solo devuelve información
  pública, así que también la puede pedir una pantalla central.
- Se anotan al llegar una partida a `gameEnd`, **una sola vez por partida**
  (idempotencia por semilla: cada partida tiene la suya y la revancha genera
  una nueva). Una partida que acaba por abandono cuenta igual: se jugó y tiene
  ganador.
- **`bestScore` depende del juego**: en Chinchón es la puntuación MÁS BAJA
  (§5, se elimina quien pasa del umbral) y en Pocha la MÁS ALTA (§9.7). El
  criterio lo aplica el servidor, que conoce el `gameId`; la interfaz solo
  rotula ("Mejor (mín.)" / "Mejor (máx.)").
- Persistencia: tabla `room_stats` (`db/migrations/0002_room_stats.sql`),
  escrita al terminar cada partida. La **fuente de verdad en caliente es la
  memoria** (`Room.stats`): la tabla es el histórico para `pnpm report` y el
  análisis de playtest. Como `playtest_events`, su repositorio nunca lanza.

---

## 12. REGLAS DE MUS — versión congelada (P27)

Tercer juego del roadmap (`02-PAQUETES.md`, "Después del MVP" §4). Mismo
criterio que P21 con Pocha — todo detalle mecánico que no estaba decidido
quedó marcado como **[DECISIÓN P27, A CONFIRMAR]** en lugar de inventarse en
silencio.

> **Estado (P28).** Las seis decisiones abiertas están **cerradas** y el
> **motor está escrito** (`packages/engine/src/games/mus/`). Servidor e
> interfaz de Mus siguen sin empezar. §12.14 recoge lo que P28 encontró al
> implementar y no estaba en el contrato.

Aviso de tamaño, para que nadie lo empiece a la ligera: `00-MASTER.md` §4 y
`02-PAQUETES.md` ya avisan de que el Mus "es un proyecto en sí mismo". §12.12
explica por qué: es el primer juego **por parejas**, y eso rompe supuestos que
Chinchón y Pocha compartían.

### 12.1 Materiales

- Baraja española de **40 cartas**, exactamente la misma que Pocha (§9.1):
  rangos 1-7, 10, 11 y 12 en oros, copas, espadas y bastos. Sin comodines.
- Variante **"ocho reyes"**: los Treses valen como Rey y los Doses como As.
  `config.ochoReyes`, por defecto `true` (es lo más extendido). Con ella hay 8
  cartas de máxima y 8 de mínima.
- La baraja no se agota en la práctica; si se agotara al descartar (§12.5) se
  barajan los descartes y se sigue.

### 12.2 Jugadores y parejas

- **Exactamente 4 jugadores**, ni uno más ni uno menos. No es un rango: no hay
  Mus a 2 ni a 3 en esta versión.
- **2 parejas fijas** durante toda la partida. Los compañeros se sientan
  enfrentados: asientos **0 y 2** contra **1 y 3**.
- **[CONFIRMADO EN P28]**: las parejas las asigna el anfitrión en el lobby
  moviendo asientos; no hay sorteo automático. El motor las deriva del asiento
  (`teamOfSeat = seat % 2`) y no las guarda aparte.

### 12.3 Estructura de la partida

```
partida  =  1 o más juegos (config.juegos: 1 | 2 | 3, por defecto 1)
juego    =  40 piedras  =  8 amarrakos   (1 amarrako = 5 piedras)
juego    =  varias manos
mano     =  reparto -> fase de mus -> 4 lances -> recuento
```

- Gana el **juego** la pareja que llega a 40 piedras. Con `config.juegos > 1`,
  gana la **partida** quien primero gane esa cantidad de juegos ("vaca").
- El tanteo se lleva **por pareja**, nunca por jugador (§12.12).

### 12.4 Mano, postre y reparto

- El **mano** habla primero en todo; el **postre** es el jugador a su derecha
  y es quien reparte.
- La mano rota un asiento a la izquierda al terminar cada mano.
- Se reparten **4 cartas** a cada jugador, de una en una, empezando por el
  mano.
- En caso de empate en cualquier lance, **gana quien esté más cerca del mano**,
  contando desde él en el orden de asientos (§12.9).

### 12.5 Fase de mus y descarte

1. Empezando por el mano y por orden, cada jugador dice **"mus"** o **"no hay
   mus"** (corta).
2. Si los cuatro dicen mus, hay **descarte**: cada jugador descarta de 1 a 4
   cartas (nunca 0) y roba las mismas. Vuelve a empezar el punto 1.
3. En cuanto uno corta, se acabó el mus para esa mano y se juegan los lances
   con las cartas que cada uno tenga.
4. **[CONFIRMADO EN P28]**: sin límite de rondas de mus. Si faltan cartas para
   servir un descarte, se barajan los descartes (incluidos los que se acaban
   de tirar, que es como se juega en la mesa).

### 12.6 Los cuatro lances, en orden

**1) Grande** — gana la mano más alta. Se comparan las 4 cartas ordenadas de
mayor a menor, una a una, hasta que una difiera.

**2) Chica** — gana la mano más baja, comparando de menor a mayor.

Orden de fuerza (con `ochoReyes = true`):

| Fuerza | Cartas |
|--------|--------|
| máxima | Rey (12) y Tres (3) |
| | Caballo (11) |
| | Sota (10) |
| | Siete (7) |
| | Seis (6) |
| | Cinco (5) |
| | Cuatro (4) |
| mínima | As (1) y Dos (2) |

Con `ochoReyes = false`, el Tres va entre la Sota y el Siete, y el Dos entre el
Cuatro y el As.

**3) Pares** — solo juegan quienes tengan al menos una pareja. Hay que
declarar si se tienen o no, y la declaración es pública.

| Categoría | Qué es | Vale |
|-----------|--------|------|
| Duples | dos parejas, o cuatro cartas iguales | 3 piedras |
| Medias | tres cartas iguales | 2 piedras |
| Pareja | dos cartas iguales | 1 piedra |

Entre dos duples gana el de la pareja más alta y, si empatan, la segunda.
Entre dos medias, la más alta. Entre dos parejas, la más alta.

**4) Juego** — solo juegan quienes sumen **31 o más**, contando Rey, Caballo y
Sota como **10** y el resto por su número (As = 1). También se declara si se
tiene o no.

Orden de mejor juego (de mejor a peor): **31, 32, 40, 37, 36, 35, 34, 33**.

| Juego | Vale |
|-------|------|
| 31 | 3 piedras |
| cualquier otro (32-40) | 2 piedras |

**[RESUELTO EN P28 — Unai]**: la variante `ochoReyes` **NO** interviene al
sumar el juego. Sota, Rey y Caballo cuentan 10 y el resto vale su número, sea
cual sea la config: el Tres suma 3 y el Dos suma 2 siempre. `ochoReyes` solo
cambia la fuerza con la que se comparan Grande y Chica (y, por tanto, qué
cartas hacen pareja en §12.6.3).

Consecuencia asumida: el 31 sale menos y el lance del punto (§12.6 bis)
aparece más a menudo que con la otra lectura.

**4-bis) Punto** — si **nadie** tiene juego, en lugar del lance de juego se
juega "al punto": gana la suma más alta que no llegue a 31. Vale **1 piedra**.
**[CONFIRMADO EN P28]**: 1 y no 2 — hay mesas que lo pagan a 2, y para eso
está `config.puntoVale`, que admite los dos valores con 1 por defecto.

### 12.7 Envites

En cada lance, empezando por el mano y por orden:

| Acción | Efecto |
|--------|--------|
| **Paso** | cede la palabra. Si pasan los cuatro, el lance queda "en paso" y vale **1 piedra** al ganador, que se decide en el recuento. |
| **Envido** | apuesta un número de piedras, **mínimo 2**. |
| **Subir** | envida por encima de lo apostado (mínimo, +1 sobre lo anterior). |
| **Quiero** | acepta: lo apostado se resuelve en el recuento. |
| **No quiero** | rechaza: quien envidó se lleva **las piedras acumuladas antes del último envite** (1 si no había nada) y el lance no se compara. |
| **Órdago** | apuesta el **juego entero** (§12.8). |

- Aceptar o rechazar corresponde a la pareja contraria; el compañero de quien
  envidó no puede subir hasta que la contraria responda.
- En **Pares** y **Juego** solo pueden envidar quienes hayan declarado que
  tienen. Si solo una pareja tiene, se lleva lo suyo sin comparación.
- Si **ningún** jugador tiene pares (o juego), ese lance **no existe** en esa
  mano: no se envida ni se paga nada (en juego, se sustituye por el punto).

### 12.8 Órdago

- Se puede lanzar en cualquier lance, en lugar de un envite.
- Si la contraria dice **"no quiero"**, quien lo lanzó gana **1 piedra** y la
  mano sigue.
- Si dice **"quiero"**, se **descubren las cartas de los cuatro** y se resuelve
  ese lance en el acto: la pareja que lo gane **gana el juego entero**, sea
  cual sea el tanteo.

### 12.9 Recuento

Al terminar la mano (sin órdago aceptado) se descubren las cartas y se
resuelven los lances **en el orden de §12.6**, sumando a cada pareja:

1. lo envidado y querido en ese lance, o la piedra del "en paso";
2. lo que valgan sus **pares** y su **juego** (tablas de §12.6), que se cobran
   **aunque el lance se haya jugado en paso**, y por **cada jugador** de la
   pareja que los tenga;
3. si una pareja llega a 40 piedras a mitad del recuento, el juego termina **en
   ese momento**: no se siguen contando lances.

Empates en cualquier comparación: gana la mano más cercana al mano (§12.4).

### 12.10 Señas

**[RESUELTO EN P28 — Unai: opción A]**: **sin señas.** El motor no abre
ningún canal entre compañeros, ni de gestos ni de nada. Es coherente con "sin
chat libre" (§11.1) y con que en una app cada uno mira su móvil, donde una
seña física no se ve.

La opción B que se barajaba (un conjunto cerrado de gestos que solo viera el
compañero, reutilizando el mecanismo de §11.1) queda **descartada**: abre un
canal privado dentro de la partida, y eso no se hace de rebote. Si algún día
se retoma, es un paquete propio con su contrato, no un añadido al motor.

### 12.11 Abandono o desconexión

- El Mus **no se puede jugar con 3**. Si un jugador abandona, la partida queda
  **suspendida** esperando su reconexión; no se convierte en otra cosa.
- **[CONFIRMADO EN P28]**: si no vuelve en el plazo, la partida se anula y
  **no cuenta** en las estadísticas de sala (§11.2) — a diferencia de Chinchón
  y Pocha, donde el abandono sí produce un ganador. Como en los otros dos
  juegos, esto es responsabilidad de `apps/server`, no del motor: `MusPlayer`
  tiene `left`, pero el motor **no salta asientos** porque no hay Mus con tres.
- Los bots (modo "contra la máquina") tendrían que saber envidar y farolear:
  es un problema mucho más difícil que el de los bots actuales y **no está
  incluido** en este contrato.

### 12.12 Cambios de contrato que Mus exige

Esto es lo que hace que Mus no sea "un `GameModule` más". Cada punto es una
decisión de arquitectura pendiente, no un detalle de implementación:

- **`GameId`** pasa a `'chinchon' | 'pocha' | 'mus'` (§10.1, mismo patrón).
- **Equipos.** Es el cambio de fondo: el marcador deja de ser por jugador.
  `PublicPlayer` necesita `teamIndex: 0 | 1`, y las vistas necesitan un
  `teams: { index, piedras, amarrakos, juegos }[]`. `winnerId: PlayerId | null`
  (§2.5) **no sirve**: hace falta un ganador de equipo. Chinchón y Pocha
  comparten hoy el supuesto "un jugador, una puntuación"; Mus lo rompe, y con
  él la clasificación de `/sala` y `/mesa` (P16) y las estadísticas de §11.2,
  que cuentan `wins` por jugador.
- **`MAX_PLAYERS` / `MIN_PLAYERS`**: Mus es exactamente 4. §10.6 dejó estos
  valores como límite absoluto de sala y el rango real en el `GameConfig` de
  cada juego; ese diseño ya lo admite (`minPlayers = maxPlayers = 4`).
- **`GameAction`** nuevas: `mus`, `noMus`, `descartar { cardIds }`,
  `envidar { piedras }`, `querer`, `noQuerer`, `ordago`,
  `declararPares { tiene }`, `declararJuego { tiene }`.
- **`ERROR_CODES`** nuevos: `NOT_IN_MUS_PHASE`, `MUST_DISCARD_AT_LEAST_ONE`,
  `BET_TOO_LOW`, `CANNOT_BID_WITHOUT_PARES`, `CANNOT_BID_WITHOUT_JUEGO`,
  `NOT_YOUR_TEAM_TURN`.
- **`MusConfig`**: `{ gameId: 'mus'; maxPlayers: 4; ochoReyes: boolean;
  juegos: 1 | 2 | 3; puntoVale: 1 | 2; sonido: boolean }`.
- **Base de datos**: sin migración (`rooms.game_id` es `text`, §10.8).

### 12.13 Tests dorados (escribir con estos casos exactos)

1. **Grande, comparación carta a carta.** `[Rey, Rey, Caballo, As]` contra
   `[Rey, Rey, Sota, Sota]`: gana la primera (empatan los dos Reyes; Caballo
   supera a Sota).
2. **Ocho reyes.** `[Tres, Rey, Sota, As]` con `ochoReyes: true` equivale a
   `[Rey, Rey, Sota, As]` a efectos de Grande; con `ochoReyes: false`, el Tres
   queda por debajo de la Sota y la mano vale menos.
3. **Chica.** `[As, Dos, Rey, Caballo]` con `ochoReyes: true` gana a
   `[As, Cuatro, Rey, Rey]`: empatan los Ases y el Dos vale como As, que es
   más bajo que el Cuatro.
4. **Pares.** `[Rey, Rey, Sota, Sota]` (duples) gana a `[Rey, Rey, Rey, As]`
   (medias), y paga 3 piedras frente a 2.
5. **Juego.** `[Rey, Caballo, Sota, As]` suma 31 y gana a
   `[Rey, Rey, Rey, Sota]`, que suma 40. El 31 paga 3 piedras.
6. **Punto.** Ninguna mano llega a 31: `[Rey, Sota, Siete, As]` suma 28 y gana
   a `[Caballo, Sota, Seis, As]`, que suma 27. Paga `config.puntoVale`.
   (Cerrado en P28: la suma no depende de `ochoReyes`, §12.6.)
7. **Empate y mano.** Dos manos idénticas en Grande: gana quien esté antes
   contando desde el mano.
8. **Órdago querido.** Se descubren las cartas, se resuelve solo ese lance y la
   pareja ganadora gana el juego con el marcador que sea.
9. **Corte del recuento.** Pareja a **39** piedras que gana Grande "en paso"
   (1) y tiene medias (2): llega a 40 con la primera y el recuento **para**;
   las piedras de medias no se cuentan.
   (El contrato decía "38", pero 38 + 1 son 39. P28 corrige la aritmética
   manteniendo la intención del caso, que es el corte.)

---

### 12.14 Lo que P28 encontró al implementar el motor

Igual que P22 declaró el gap de vistas que §10 no había cubierto, aquí queda
escrito lo que hubo que decidir o corregir al escribir el motor. Nada de esto
se coló en silencio.

**1. Falta la acción `paso`.** §12.12 lista las `GameAction` nuevas y se deja
`paso`, que §12.7 describe como la primera fila de la tabla de envites. Sin
ella no se puede ceder la palabra. Añadida a `GameActionSchema`.

**2. `FALSE_DECLARATION`, código de error nuevo.** `declararPares` y
`declararJuego` son acciones del jugador, pero la respuesta verdadera está en
sus cartas y el motor es la autoridad (§2). Sin un código propio, mentir caía
en el genérico `INVALID_ACTION` y la interfaz no podía explicar qué pasó.

**3. `PublicPlayer.teamIndex` admite `null`.** §12.12 lo pedía como
`0 | 1` obligatorio. Hacerlo obligatorio forzaría a Chinchón y a Pocha a
inventarse una pareja que sus reglas no tienen, y cualquier valor que
eligieran sería mentira para la clasificación y para §11.2. `null` dice la
verdad ("este juego no tiene parejas") y obliga a distinguir el caso.

**4. Orden de las tablas dentro de un lance [DECISIÓN P28].** §12.9 no fija en
qué orden se apuntan las tablas de pares/juego de las dos parejas. Se apuntan
primero a la **pareja del mano**. Solo se nota en el caso límite en que las
dos llegarían a 40 con las tablas del mismo lance, y "más cerca del mano gana"
es el criterio que §12.9 usa en todo lo demás.

**5. Las piedras del "no quiero" se pagan en el acto.** §12.9 enumera lo que
se suma en el recuento y el rechazo no está en la lista; §12.7 dice que quien
envidó "se lleva" las piedras. El motor las apunta al rechazarse, no al final.
Importa: un "no quiero" puede llevar a 40 y terminar el juego con lances sin
jugar. El recuento las enseña marcadas pero no las suma dos veces.

**6. AVISO — la escala de fuerza sin `ochoReyes` no es la habitual.** §12.6
dice que con `ochoReyes = false` "el Tres va entre la Sota y el Siete, y el
Dos entre el Cuatro y el As". Lo dice dos veces y de forma internamente
coherente (§12.6 y el caso dorado §12.13.2), así que el motor lo implementa
tal cual. Pero **en la mayoría de las mesas sin ocho reyes el Tres es
simplemente un 3** (por debajo del Cuatro) y el Dos un 2. Si esto fue un
desliz al congelar el contrato, corregirlo es cambiar una tabla
(`FUERZA_SIN_OCHO_REYES` en `hand.ts`) y el caso dorado 2, y nada más. El
valor por defecto es `ochoReyes: true`, así que hoy no afecta a ninguna
partida.
