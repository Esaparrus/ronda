// @ronda/engine
//
// Motor puro y determinista: reglas del juego, sin red, sin base de datos, sin
// reloj, sin Math.random (el RNG lleva semilla en el estado).

export * from './core/types.ts';
export * from './core/rng.ts';
export * from './core/deck.ts';
export * from './core/registry.ts';
export * from './core/freeze.ts';

// Registro del juego Chinchón (efecto lateral: lo añade a GAMES).
import './games/chinchon/index.ts';
export * from './games/chinchon/index.ts';

// Registro del juego Pocha (efecto lateral: lo añade a GAMES). P22.
import './games/pocha/index.ts';
export {
  pochaModule,
  createInitialState as pochaCreateInitialState,
  applyAction as pochaApplyAction,
  getPlayerView as pochaGetPlayerView,
  getTableView as pochaGetTableView,
  dealRound as pochaDealRound,
  buildPochaDeck,
  POCHA_RANKS,
  POCHA_DECK_SIZE,
  maxRoundSize,
  totalRounds,
  roundSizeFor,
  resolveTrick,
  fuerza,
  activePlayers as pochaActivePlayers,
  nextActiveSeat as pochaNextActiveSeat,
  findPlayer as pochaFindPlayer,
  isPlayerTurn as pochaIsPlayerTurn,
  type PochaState,
  type PochaPlayer,
  type PochaPhase,
  type PochaStatus,
} from './games/pocha/index.ts';

// Registro del juego Mus (efecto lateral: lo añade a GAMES). P28.
import './games/mus/index.ts';
export {
  musModule,
  createInitialState as musCreateInitialState,
  applyAction as musApplyAction,
  getPlayerView as musGetPlayerView,
  getTableView as musGetTableView,
  dealHand as musDealHand,
  buildMusDeck,
  MUS_RANKS,
  MUS_DECK_SIZE,
  MUS_HAND_SIZE,
  MUS_PLAYERS,
  MUS_META,
  PIEDRAS_POR_AMARRAKO,
  fuerzaMus,
  fuerzasDesc,
  compareGrande,
  compareChica,
  paresOf,
  comparePares,
  juegoSuma,
  juegoRank,
  juegoPiedras,
  tieneJuego,
  puntoValor,
  runRecuento,
  eligibleSeats as musEligibleSeats,
  lanceWinnerSeat as musLanceWinnerSeat,
  teamOfSeat as musTeamOfSeat,
  otherTeam as musOtherTeam,
  seatsFromMano as musSeatsFromMano,
  findPlayer as musFindPlayer,
  isPlayerTurn as musIsPlayerTurn,
  type MusState,
  type MusPlayer,
  type MusStatus,
  type MusBetState,
  type MusLanceState,
  type MusLanceOutcome,
  type Pares,
  type ParesKind,
} from './games/mus/index.ts';

// Registro de los modos sociales (Orden, Colores, Mayoría y Escala).
import './games/party/index.ts';
export {
  ordenModule,
  coloresModule,
  mayoriaModule,
  escalaModule,
  createPartyState,
  applyAction as partyApplyAction,
  getPlayerView as partyGetPlayerView,
  getTableView as partyGetTableView,
  COLOR_NAMES,
  COLOR_QUESTIONS,
  colorQuestionById,
  MAJORITY_QUESTIONS,
  SCALE_QUESTIONS,
  type PartyState,
  type PartyPlayer,
  type PartyStatus,
  type PartyPhase,
  type OrdenRoundState,
  type ColorsRoundState,
  type MajorityRoundState,
  type ScaleRoundState,
} from './games/party/index.ts';
