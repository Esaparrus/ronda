// Vistas censuradas de Mus. Contrato §2.5, §12.12.
//
// Invariante de seguridad (igual que Chinchón y Pocha): una TableView, o la
// PlayerView de otro jugador, no filtra jamás la mano de nadie. La única
// excepción es `handResult.hands`, que solo existe cuando la mano ya ha
// terminado y las cartas se han descubierto de verdad sobre la mesa (§12.9,
// y §12.8 cuando el órdago se quiere) -- exactamente el mismo permiso que
// tiene `roundResult` de Chinchón.
//
// Lo que Mus cambia respecto a los otros dos (§12.12): el marcador es de la
// pareja. `winnerId` va SIEMPRE a null y el ganador de verdad va en
// `winnerTeamIndex`; `PublicPlayer.score` va SIEMPRE a 0 y las piedras están
// en `teams`. Los dos son deliberados: cualquier número inventado ahí
// escondería justo el supuesto que §12.12 quiere romper ("un jugador, una
// puntuación") y haría que la clasificación de `/sala`, `/mesa` y las
// estadísticas de §11.2 pareciesen funcionar mientras mienten.
import type {
  MusAvailableAction,
  MusCommonView,
  MusPlayerView,
  MusPlayerViewMe,
  MusTableView,
  MusTeam,
  PlayerId,
  PublicPlayer,
} from '@ronda/protocol';
import { juegoSuma, paresOf, tieneJuego } from './hand.ts';
import { MUS_META, PIEDRAS_POR_AMARRAKO } from './recuento.ts';
import { postreSeat, type MusState } from './state.ts';

function buildPublicPlayers(state: MusState): PublicPlayer[] {
  return state.players.map((p) => ({
    playerId: p.playerId,
    nick: p.nick,
    seat: p.seat,
    colorIndex: p.seat as PublicPlayer['colorIndex'],
    score: 0, // en Mus puntúa la pareja, no el jugador: ver `teams`
    handCount: p.hand.length,
    connected: true, // el servidor lo sobreescribe al difundir, igual que en los otros dos
    isHost: p.seat === 0,
    eliminated: false, // Mus no elimina a nadie: se juega a 4 o no se juega (§12.2)
    teamIndex: p.teamIndex,
  }));
}

function buildTeams(state: MusState): MusTeam[] {
  return ([0, 1] as const).map((index) => {
    const piedras = state.piedras[index] ?? 0;
    return {
      index,
      piedras,
      amarrakos: Math.floor(piedras / PIEDRAS_POR_AMARRAKO),
      juegos: state.juegosWon[index] ?? 0,
    };
  });
}

/** Los votos parciales de la pareja que delibera son privados hasta cerrar. */
function buildPublicMusSaid(state: MusState): (boolean | null)[] {
  if (state.config.modo !== 'online' || state.phase !== 'mus' || state.musConsultingTeam === null) {
    return state.players.map((player) => player.musSaid);
  }
  return state.players.map((player) =>
    player.teamIndex === state.musConsultingTeam ? null : player.musSaid,
  );
}

function buildCommon(state: MusState): MusCommonView {
  const turnSeat = state.turnSeat;
  return {
    roomCode: state.roomCode,
    gameId: 'mus',
    config: state.config,
    status: state.status,
    round: state.handNumber,
    players: buildPublicPlayers(state),
    turnPlayerId: turnSeat !== null ? (state.players[turnSeat]?.playerId ?? null) : null,
    winnerId: null, // en Mus gana una pareja: ver `winnerTeamIndex` (§12.12)
    rematchVotes: state.rematchVotes,
    teams: buildTeams(state),
    winnerTeamIndex: state.winnerTeamIndex,
    manoSeat: state.manoSeat,
    postreSeat: postreSeat(state),
    phase: state.phase,
    lance: state.lance,
    bet: state.bet
      ? {
          piedras: state.bet.piedras,
          byTeam: state.bet.byTeam,
          ifRejected: state.bet.ifRejected,
          isOrdago: state.bet.isOrdago,
        }
      : null,
    musConsultingTeam: state.musConsultingTeam,
    musSaid: buildPublicMusSaid(state),
    paresDeclared: state.players.map((p) => p.paresDeclared),
    juegoDeclared: state.players.map((p) => p.juegoDeclared),
    handResult: state.handResult,
  };
}

export function getPlayerView(state: MusState, playerId: PlayerId): MusPlayerView {
  return { kind: 'player', ...buildCommon(state), me: buildMe(state, playerId) };
}

export function getTableView(state: MusState): MusTableView {
  return { kind: 'table', ...buildCommon(state) };
}

function buildMe(state: MusState, playerId: PlayerId): MusPlayerViewMe {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) {
    return {
      playerId,
      hand: [],
      teamIndex: 0,
      pares: null,
      juego: { suma: 0, tiene: false },
      minEnvite: null,
      musConsultation: null,
      availableActions: [],
    };
  }

  const isMyTurn =
    state.status === 'playing' &&
    state.turnSeat !== null &&
    state.turnSeat === player.seat &&
    !player.left;
  const partner = state.players.find(
    (candidate) =>
      candidate.teamIndex === player.teamIndex && candidate.playerId !== player.playerId,
  );
  const isConsulting =
    state.status === 'playing' &&
    state.phase === 'mus' &&
    state.config.modo === 'online' &&
    state.musConsultingTeam === player.teamIndex &&
    !player.left;

  const available: MusAvailableAction[] = [];
  let minEnvite: number | null = null;

  if (isConsulting && player.musSaid === null && !player.musDelegated) {
    if (player.musSignal === null && partner?.musDelegated !== true) {
      available.push('musSignal');
    }
    available.push('mus', 'noMus');
  }

  if (isMyTurn) {
    switch (state.phase) {
      case 'reparto':
        available.push('repartir');
        break;
      case 'mus':
        if (state.config.modo === 'presencial') available.push('mus', 'noMus');
        break;
      case 'descarte':
        available.push('descartar');
        break;
      case 'lance': {
        const bet = state.bet;
        const canBid = state.lance !== 'pares' || player.paresDeclared === true;
        const canBidJuego = state.lance !== 'juego' || player.juegoDeclared === true;
        const canRaise = bet === null || bet.byTeam !== player.teamIndex;
        const canEnvido = canBid && canBidJuego && canRaise;
        if (bet === null) {
          available.push('paso');
          if (canEnvido) {
            available.push('envidar', 'ordago');
            minEnvite = 2; // mínimo del contrato (§12.7)
          }
        } else {
          available.push('querer', 'noQuerer');
          // Sobre un órdago solo se puede querer o no querer (§12.8).
          if (!bet.isOrdago && canEnvido) {
            available.push('envidar', 'ordago');
            minEnvite = bet.piedras + 1;
          }
        }
        break;
      }
      case 'recuento':
        break;
    }
  }

  if (state.status === 'roundEnd' && !state.rematchVotes.includes(playerId)) {
    available.push('nextRound');
  }

  const pares = paresOf(player.hand, state.config.ochoReyes);
  const suma = juegoSuma(player.hand);

  return {
    playerId,
    hand: player.hand,
    teamIndex: player.teamIndex,
    pares: pares ? { kind: pares.kind, piedras: pares.piedras } : null,
    juego: { suma, tiene: tieneJuego(suma) },
    minEnvite,
    musConsultation:
      isConsulting && partner
        ? {
            partnerPlayerId: partner.playerId,
            partnerNick: partner.nick,
            mySignal: player.musSignal,
            partnerSignal: partner.musSignal,
            myDecision: player.musSaid,
            partnerDecision: partner.musSaid,
            myDelegated: player.musDelegated,
            partnerDelegated: partner.musDelegated,
          }
        : null,
    availableActions: available,
  };
}

/** Reexportado por comodidad de quien pinte el marcador (§12.3). */
export { MUS_META, PIEDRAS_POR_AMARRAKO };
