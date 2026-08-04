// Vistas censuradas de Chinchón. Contrato §2.5.
//
// Invariante de seguridad (verificable con un test, §2.5 final):
//   serializar una TableView o una PlayerView y comprobar que no aparece ningún
//   CardId de la mano de otro jugador, salvo dentro de roundResult cuando
//   status !== 'playing'.
import {
  type AvailableAction,
  type CardId,
  type ChinchonCommonView,
  type ChinchonPlayerView,
  type ChinchonPlayerViewMe,
  type ChinchonTableView,
  type ConnectionPlayer,
  type PlayerId,
  type PlayerView,
  type PublicPlayer,
} from '@ronda/protocol';
import { solveHand, closableDiscards } from './melds.ts';
import type { ChinchonState } from './state.ts';

/** Color de asiento por defecto: 0..3 = brasa, azul, verde, oro (§8.1). */
function colorIndex(seat: number): 0 | 1 | 2 | 3 {
  return (seat % 4) as 0 | 1 | 2 | 3;
}

/** Construye la lista pública de jugadores (sin manos). */
function buildPublicPlayers(state: ChinchonState): PublicPlayer[] {
  return state.players.map((p) => ({
    playerId: p.playerId,
    nick: p.nick,
    seat: p.seat,
    colorIndex: colorIndex(p.seat),
    score: p.score,
    handCount: p.hand.length,
    // connected y isHost los gestiona el servidor (RoomManager); aquí true/host
    // por defecto. El servidor los sobreescribe al difundir.
    connected: true,
    isHost: p.seat === 0,
    eliminated: p.eliminated,
    teamIndex: null, // Chinchón no tiene parejas (§12.12, P28)
  }));
}

/** Parte común a ambas vistas. */
function buildCommon(state: ChinchonState): ChinchonCommonView {
  const turnSeat = state.turnSeat;
  const turnPlayerId =
    turnSeat !== null ? (state.players[turnSeat]?.playerId ?? null) : null;

  return {
    roomCode: state.roomCode,
    gameId: state.gameId,
    config: state.config,
    status: state.status,
    round: state.round,
    players: buildPublicPlayers(state),
    turnPlayerId,
    turnPhase: state.turnPhase,
    deckCount: state.deck.length,
    discardTop: state.discard.length > 0 ? (state.discard[state.discard.length - 1] ?? null) : null,
    discardCount: state.discard.length,
    roundResult: state.roundResult,
    winnerId: state.winnerId,
    rematchVotes: state.rematchVotes,
  };
}

/**
 * Vista del jugador: incluye `me` con la mano propia y sugerencias.
 * Contrato §2.5 PlayerView. Las manos ajenas NUNCA aparecen.
 */
export function getPlayerView(state: ChinchonState, playerId: PlayerId): ChinchonPlayerView {
  const common = buildCommon(state);
  const me = buildMe(state, playerId);
  return { kind: 'player', ...common, me };
}

/**
 * Vista de la pantalla central: SOLO CommonView. Sin `me`, jamás.
 * Contrato §2.5 TableView.
 */
export function getTableView(state: ChinchonState): ChinchonTableView {
  return { kind: 'table', ...buildCommon(state) };
}

/** Construye el bloque `me` privado del jugador. */
function buildMe(state: ChinchonState, playerId: PlayerId): ChinchonPlayerViewMe {
  const player = state.players.find((p) => p.playerId === playerId);

  // Si el jugador no está o está eliminado/abandonado: vista mínima sin mano.
  if (!player) {
    return {
      playerId,
      hand: [],
      bestMelds: [],
      deadwood: 0,
      canClose: false,
      closableDiscards: [],
      lockedCardId: null,
      availableActions: [],
    };
  }

  const hand = player.hand;
  const isMyTurn =
    state.status === 'playing' &&
    state.turnSeat !== null &&
    state.players[state.turnSeat]?.playerId === playerId &&
    !player.eliminated &&
    !player.left;

  // Resolver sobre la mano actual. En fase discard la mano tiene 8 cartas:
  // las sugerencias se calculan considerando que el jugador descartará una.
  const sol = solveHand(hand, state.config);

  // canClose: ¿existe alguna carta cuyo descarte permita cerrar?
  const closable = hand.length === 8 ? closableDiscards(hand, state.config) : [];
  const canClose = closable.length > 0;

  // Acciones disponibles según fase y turno.
  const availableActions: AvailableAction[] = [];
  if (isMyTurn && state.turnPhase === 'draw') {
    availableActions.push('drawDeck');
    if (state.discard.length > 0) availableActions.push('drawDiscard');
  } else if (isMyTurn && state.turnPhase === 'discard') {
    availableActions.push('discard');
    if (canClose) availableActions.push('close');
  }

  return {
    playerId,
    hand,
    bestMelds: sol.melds,
    deadwood: sol.deadwood,
    canClose,
    closableDiscards: closable,
    lockedCardId: player.lockedCardId,
    availableActions,
  };
}

// Reexporta el tipo para que el servidor lo pueda usar al difundir connection.
export type { ConnectionPlayer };

// Helpers de validación de estanqueidad (usados por tests y, opcionalmente,
// por el servidor como aserto de seguridad).

/**
 * Comprueba que una PlayerView no filtra cartas ajenas mientras status === 'playing'.
 * Devuelve la lista de CardId sospechosos (vacío si todo correcto).
 *
 * Solo se inspecciona durante 'playing': en 'roundEnd'/'gameEnd' las manos se
 * revelan dentro de roundResult, lo cual es legítimo.
 *
 * `allowed` admite ids legítimamente públicos además de la mano propia (p.ej.
 * la cima del descarte). Por defecto solo la propia mano.
 */
export function leakedCards(view: PlayerView, ownHand: CardId[], allowed: CardId[] = []): CardId[] {
  if (view.status !== 'playing') return [];
  const own = new Set<CardId>([...ownHand, ...allowed]);
  const serialized = JSON.stringify(view);
  const cardRe = /"(?:oros|copas|espadas|bastos)-(?:\d{1,2})|joker-[12]"/g;
  const matches = serialized.match(cardRe) ?? [];
  const leaked: CardId[] = [];
  for (const m of matches) {
    const id = m.replace(/"/g, '') as CardId;
    if (!own.has(id) && !leaked.includes(id)) leaked.push(id);
  }
  return leaked;
}
