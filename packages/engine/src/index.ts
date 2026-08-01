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
