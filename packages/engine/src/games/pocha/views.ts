// Vistas censuradas de Pocha. Resuelve, para Pocha, el mismo gap de vista que
// se resolvió en `@ronda/protocol` (views.ts) durante P22: §10 (P21) nunca
// diseñó la forma de PlayerView/TableView de Pocha.
//
// Invariante de seguridad (igual que Chinchón, contrato §2.5 final): una
// TableView, o una PlayerView de otro jugador, nunca debe filtrar cartas de
// la mano de un jugador salvo dentro de `roundResult` una vez la ronda ha
// terminado -- y en Pocha ni siquiera entonces: `PochaRoundResult` (a
// diferencia del de Chinchón) no revela las manos, solo cante/bazas/puntos.
import {
  parseCardId,
  type CardId,
  type PlayerId,
  type PochaAvailableAction,
  type PochaCommonView,
  type PochaPlayerView,
  type PochaPlayerViewMe,
  type PochaTableView,
  type PublicPlayer,
} from '@ronda/protocol';
import type { PochaState } from './state.ts';

/** Color de asiento por defecto: igual criterio que Chinchón (§10.7: sin
 * ensanchar todavía a 0-5, punto de diseño diferido a P24). */
function colorIndex(seat: number): 0 | 1 | 2 | 3 {
  return (seat % 4) as 0 | 1 | 2 | 3;
}

function buildPublicPlayers(state: PochaState): PublicPlayer[] {
  return state.players.map((p) => ({
    playerId: p.playerId,
    nick: p.nick,
    seat: p.seat,
    colorIndex: colorIndex(p.seat),
    score: p.score,
    handCount: p.hand.length,
    connected: true, // el servidor (RoomManager) sobreescribe al difundir, igual que Chinchón
    isHost: p.seat === 0,
    eliminated: false, // Pocha no elimina a mitad de partida (§9.8)
  }));
}

function buildCommon(state: PochaState): PochaCommonView {
  const turnSeat = state.turnSeat;
  const turnPlayerId = turnSeat !== null ? (state.players[turnSeat]?.playerId ?? null) : null;

  return {
    roomCode: state.roomCode,
    gameId: 'pocha',
    config: state.config,
    status: state.status,
    round: state.round,
    players: buildPublicPlayers(state),
    turnPlayerId,
    winnerId: state.winnerId,
    rematchVotes: state.rematchVotes,
    trumpSuit: state.trumpSuit,
    trumpCardId: state.trumpCardId,
    roundSize: state.roundSize,
    dealerSeat: state.dealerSeat,
    bids: state.players.map((p) => p.bid),
    tricksWon: state.players.map((p) => p.tricksWon),
    currentTrick: state.currentTrick.map((t) => {
      const player = state.players[t.seat];
      return { playerId: player ? player.playerId : '', cardId: t.cardId };
    }),
    leadSuit: state.leadSuit,
    roundResult: state.roundResult,
  };
}

export function getPlayerView(state: PochaState, playerId: PlayerId): PochaPlayerView {
  const common = buildCommon(state);
  const me = buildMe(state, playerId);
  return { kind: 'player', ...common, me };
}

export function getTableView(state: PochaState): PochaTableView {
  return { kind: 'table', ...buildCommon(state) };
}

/** Cartas jugables ahora mismo respetando la obligación de asistir (§9.5). */
function legalCardsFor(state: PochaState, hand: CardId[]): CardId[] {
  if (state.leadSuit === null) return [...hand];
  const followers = hand.filter((id) => {
    const r = parseCardId(id);
    return r.ok && r.value.suit === state.leadSuit;
  });
  return followers.length > 0 ? followers : [...hand];
}

function buildMe(state: PochaState, playerId: PlayerId): PochaPlayerViewMe {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) {
    return { playerId, hand: [], legalCardIds: [], availableActions: [] };
  }

  const isMyTurn =
    state.status === 'playing' &&
    state.turnSeat !== null &&
    state.players[state.turnSeat]?.playerId === playerId &&
    !player.left;

  const availableActions: PochaAvailableAction[] = [];
  if (isMyTurn && state.phase === 'bidding') availableActions.push('bid');
  if (isMyTurn && state.phase === 'trick') availableActions.push('playCard');
  if (state.status === 'roundEnd' && !state.rematchVotes.includes(playerId)) {
    availableActions.push('nextRound');
  }

  const legalCardIds = isMyTurn && state.phase === 'trick' ? legalCardsFor(state, player.hand) : [];

  return {
    playerId,
    hand: player.hand,
    legalCardIds,
    availableActions,
  };
}
