import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRAN_RONDA_CONFIG,
  type GameAction,
  type GranRondaEmbeddedGameAction,
  type GranRondaMiniGameId,
} from '@ronda/protocol';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView } from './views.ts';
import type { GranRondaState } from './state.ts';
import { getClassicPlayerView } from '../classics/views.ts';
import { getPlayerView as getMusicalPlayerView } from '../musical/views.ts';
import { colorQuestionById } from '../party/content.ts';

const players = [
  { playerId: 'p1', nick: 'Ana', seat: 0, isBot: false },
  { playerId: 'p2', nick: 'Bruno', seat: 1, isBot: false },
  { playerId: 'p3', nick: 'Cris', seat: 2, isBot: false },
];

function makeState(): GranRondaState {
  return createInitialState({
    config: { ...DEFAULT_GRAN_RONDA_CONFIG, rounds: 4 },
    players,
    seed: 'granronda-test',
    roomCode: 'TEST',
  });
}

function play(action: GameAction, state: GranRondaState, playerId: string): GranRondaState {
  const result = applyAction(state, playerId, action, 0);
  if (!result.ok) {
    throw new Error(
      `${result.code} action=${JSON.stringify(action)} phase=${state.phase} turn=${state.turnSeat} player=${playerId}`,
    );
  }
  return result.value.state;
}

function currentPlayer(state: GranRondaState) {
  const player = state.players.find((candidate) => candidate.seat === state.turnSeat);
  if (!player) throw new Error('No hay jugador activo');
  return player;
}

function firstRoute(playerId: string, state: GranRondaState): string {
  const option = getPlayerView(state, playerId).routeOptions[0];
  if (!option) throw new Error('Falta una ruta');
  return option;
}

function resolveCurrentTurn(state: GranRondaState): GranRondaState {
  const player = currentPlayer(state);
  let next = state;
  if (next.phase === 'movement') {
    next = play({ type: 'rollGranRonda' }, next, player.playerId);
  }
  if (next.phase === 'routeChoice') {
    const view = getPlayerView(next, player.playerId);
    const option = view.routeOptions[0];
    if (!option) throw new Error('Falta una ruta');
    next = play({ type: 'chooseGranRondaPath', nextSpaceId: option }, next, player.playerId);
  }
  while (next.phase === 'moving') {
    next = play({ type: 'advanceGranRondaMovement' }, next, player.playerId);
    if (next.phase === 'routeChoice') {
      const view = getPlayerView(next, player.playerId);
      const option = view.routeOptions[0];
      if (!option) throw new Error('Falta una ruta intermedia');
      next = play({ type: 'chooseGranRondaPath', nextSpaceId: option }, next, player.playerId);
    }
  }
  if (next.phase === 'resolving') {
    next = play({ type: 'continueGranRondaResolution' }, next, player.playerId);
  }
  return next;
}

function makeMiniGameState(gameId: GranRondaMiniGameId): GranRondaState {
  let state = makeState();
  state.miniGame.questionOrder = [gameId];
  state.miniGame.questionIndex = 0;
  state.miniGame.questionId = gameId;
  while (state.phase !== 'minigameInput') state = resolveCurrentTurn(state);
  return state;
}

function playEmbedded(
  state: GranRondaState,
  playerId: string,
  action: GranRondaEmbeddedGameAction,
): GranRondaState {
  return play({ type: 'submitGranRondaMiniGameAction', action }, state, playerId);
}

describe('La Gran Ronda', () => {
  it('conserva la ficha elegida y la publica en el mapa', () => {
    const [ana, bruno, cris] = players;
    if (!ana || !bruno || !cris) throw new Error('Faltan jugadores de prueba');
    const state = createInitialState({
      config: { ...DEFAULT_GRAN_RONDA_CONFIG, rounds: 4 },
      players: [{ ...ana, tokenIcon: '🧭' as const }, bruno, cris],
      seed: 'granronda-token-test',
      roomCode: 'TEST',
    });

    expect(getPlayerView(state, 'p1').players[0]?.tokenIcon).toBe('🧭');
  });

  it('crea un mapa con coordenadas, economía y turnos', () => {
    const state = makeState();
    expect(state.board.length).toBeGreaterThan(15);
    expect(
      state.board.every((space) => space.x > 0 && space.x < 100 && space.y > 0 && space.y < 100),
    ).toBe(true);
    expect(state.phase).toBe('movement');
    expect(state.turnSeat).toBe(0);
    expect(state.players.every((player) => player.coins === 5)).toBe(true);
  });

  it('publica la tirada, anima pasos y resuelve la casilla antes de cambiar turno', () => {
    let state = makeState();
    state = play({ type: 'rollGranRonda' }, state, 'p1');
    expect(state.movement?.roll).toBeGreaterThanOrEqual(1);
    expect(state.movement?.roll).toBeLessThanOrEqual(6);
    expect(['moving', 'routeChoice']).toContain(state.phase);

    if (state.phase === 'routeChoice') {
      state = play(
        { type: 'chooseGranRondaPath', nextSpaceId: firstRoute('p1', state) },
        state,
        'p1',
      );
    }
    const startPathLength = state.movement?.path.length ?? 0;
    state = play({ type: 'advanceGranRondaMovement' }, state, 'p1');
    expect(state.movement?.path.length).toBeGreaterThan(startPathLength);

    while (state.phase === 'moving' || state.phase === 'routeChoice') {
      if (state.phase === 'routeChoice') {
        state = play(
          { type: 'chooseGranRondaPath', nextSpaceId: firstRoute('p1', state) },
          state,
          'p1',
        );
      } else {
        state = play({ type: 'advanceGranRondaMovement' }, state, 'p1');
      }
    }
    expect(state.phase).toBe('resolving');
    expect(state.resolution).not.toBeNull();
    expect(state.turnSeat).toBe(0);

    state = play({ type: 'continueGranRondaResolution' }, state, 'p1');
    expect(state.turnSeat).toBe(1);
    expect(state.movement).toBeNull();
  });

  it('ofrece la arista de vuelta y mantiene las acciones del mapa como casillas', () => {
    let state = makeState();
    const player = state.players[0];
    if (!player) throw new Error('falta jugador activo');
    player.position = 'plaza-copas';
    state.turnSeat = player.seat;

    state = play({ type: 'rollGranRonda' }, state, player.playerId);
    expect(state.phase).toBe('routeChoice');
    expect(state.movement?.routeOptions).toContain('union-bastos');
    expect(state.movement?.routeOptions).toContain('paseo-sol');

    const actionSpace = state.board.find((space) => space.type === 'doble');
    expect(actionSpace?.id).toBe('sendero-bastos');
    expect(state.board.some((space) => space.type === 'tienda')).toBe(true);
    expect(state.board.some((space) => space.type === 'penalizacion')).toBe(true);
  });

  it('activa las casillas de dado doble y penalización al aterrizar', () => {
    let state = makeState();
    const player = state.players[0];
    if (!player) throw new Error('falta jugador activo');
    state.turnSeat = player.seat;
    player.position = 'senda-bastos';
    state.movement = {
      playerId: player.playerId,
      roll: 1,
      dice: [1],
      path: ['senda-bastos'],
      remainingSteps: 1,
      routeOptions: [],
      forcedNextSpaceId: 'sendero-bastos',
    };
    state.phase = 'moving';
    state = play({ type: 'advanceGranRondaMovement' }, state, player.playerId);
    expect(state.phase).toBe('resolving');
    expect(state.players[0]?.powerups.doubleRoll).toBe(1);

    state.phase = 'moving';
    state.resolution = null;
    const playerAfterDouble = state.players[0];
    if (!playerAfterDouble) throw new Error('falta jugador tras el dado doble');
    state.movement = {
      playerId: playerAfterDouble.playerId,
      roll: 1,
      dice: [1],
      path: ['curva-bastos'],
      remainingSteps: 1,
      routeOptions: [],
      forcedNextSpaceId: 'arco-copas',
    };
    playerAfterDouble.position = 'curva-bastos';
    state = play({ type: 'advanceGranRondaMovement' }, state, playerAfterDouble.playerId);
    expect(state.phase).toBe('resolving');
    expect(state.players[0]?.powerups.rivalPenalty).toBe(1);
  });

  it('termina el movimiento, abre el juego de la ronda y deja avanzar al anfitrión', () => {
    let state = makeState();
    while (state.phase !== 'minigameInput') state = resolveCurrentTurn(state);
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('minigameInput');
    expect(state.miniGame.submissions).toEqual({});

    const rejected = applyAction(state, 'p2', { type: 'nextRound' }, 0);
    expect(rejected.ok).toBe(false);
    state = play({ type: 'finishGranRondaMiniGame' }, state, 'p1');
    expect(state.phase).toBe('minigameReveal');
    expect(state.miniGame.scoreDeltas).not.toBeNull();
    state = play({ type: 'nextRound' }, state, 'p1');
    expect(state.round).toBe(2);
    expect(state.phase).toBe('movement');
    expect(state.turnSeat).toBe(1);
  });

  it('resuelve un minijuego competitivo con acciones y clasificación de Oros', () => {
    let state = makeState();
    while (state.phase !== 'minigameInput') state = resolveCurrentTurn(state);
    let guard = 0;
    while (state.phase === 'minigameInput' && guard < 160) {
      guard += 1;
      const embedded = state.miniGame.embeddedGame;
      if (!embedded) throw new Error('falta el juego original alojado');
      if (embedded.gameId === 'sieteymedia') {
        const player = embedded.players.find((candidate) => candidate.seat === embedded.turnSeat);
        if (!player) throw new Error('falta el turno de Siete y Media');
        state = play(
          { type: 'submitGranRondaMiniGameAction', action: { type: 'stand' } },
          state,
          player.playerId,
        );
      } else if (embedded.gameId === 'cinquillo') {
        const player = embedded.players.find((candidate) => candidate.seat === embedded.turnSeat);
        if (!player) throw new Error('falta el turno de Cinquillo');
        const view = getClassicPlayerView(embedded, player.playerId);
        const cardId = view.me.legalCardIds[0];
        state = play(
          {
            type: 'submitGranRondaMiniGameAction',
            action: cardId ? { type: 'playCard', cardId } : { type: 'pass' },
          },
          state,
          player.playerId,
        );
      } else if (embedded.gameId === 'musical') {
        const view = getMusicalPlayerView(embedded, 'p1');
        const nestedActions = new Set(view.me.availableActions);
        const trackIndex = embedded.playedTrackIds.length + 1;
        const action = nestedActions.has('musicSelectTrack')
          ? {
              type: 'musicSelectTrack' as const,
              track: {
                id: `granronda-test-track-${trackIndex}`,
                title: `Canción de prueba ${trackIndex}`,
                artist: 'Artista de prueba',
                year: 2020,
                previewUrl: 'https://example.com/preview.mp3',
                artworkUrl: null,
                storeUrl: 'https://example.com',
              },
            }
          : nestedActions.has('musicStartClip')
            ? { type: 'musicStartClip' as const }
            : nestedActions.has('musicBuzz')
              ? { type: 'musicBuzz' as const }
              : nestedActions.has('musicSubmitGuess')
                ? { type: 'musicSubmitGuess' as const, artist: 'No', title: 'No', year: null }
                : nestedActions.has('musicNextClip')
                  ? { type: 'musicNextClip' as const }
                  : { type: 'musicNextRound' as const };
        state = play({ type: 'submitGranRondaMiniGameAction', action }, state, 'p1');
      } else {
        throw new Error(`juego alojado inesperado: ${embedded.gameId}`);
      }
    }
    expect(guard).toBeLessThan(160);
    expect(state.phase).toBe('minigameReveal');
    expect(state.miniGame.embeddedGame).not.toBeNull();
    expect(state.miniGame.results).not.toBeNull();
    expect(Object.values(state.miniGame.scoreDeltas ?? {}).some((delta) => delta > 0)).toBe(true);
  });

  it('aloja los juegos sociales exprés y termina tras una sola prueba', () => {
    const socialMiniGames = ['colores', 'mayoria', 'escala', 'matiz'] as const;

    for (const gameId of socialMiniGames) {
      let state = makeMiniGameState(gameId);
      const embedded = state.miniGame.embeddedGame;
      if (!embedded || embedded.gameId !== gameId) {
        throw new Error(`falta el juego social alojado: ${gameId}`);
      }

      if (embedded.gameId === 'colores') {
        const correctColors = colorQuestionById(embedded.colors?.questionId ?? '').correctColors;
        for (const player of state.players) {
          state = playEmbedded(state, player.playerId, {
            type: 'submitColors',
            colors: correctColors,
          });
        }
      } else if (embedded.gameId === 'mayoria') {
        for (const player of state.players) {
          state = playEmbedded(state, player.playerId, {
            type: 'submitMajority',
            answer: 'pizza',
          });
        }
        state = playEmbedded(state, 'p1', {
          type: 'resolveMajority',
          groups: [state.players.map((player) => player.playerId)],
        });
      } else if (embedded.gameId === 'escala') {
        const cluePlayerId = embedded.scale?.cluePlayerId;
        if (!cluePlayerId) throw new Error('falta la guía de Escala');
        state = playEmbedded(state, cluePlayerId, {
          type: 'submitScaleClue',
          clue: 'Una prueba corta',
        });
        for (const player of state.players) {
          if (player.playerId === cluePlayerId) continue;
          state = playEmbedded(state, player.playerId, { type: 'submitScale', value: 50 });
        }
      } else {
        for (const player of state.players) {
          state = playEmbedded(state, player.playerId, {
            type: 'submitMatiz',
            hex: '#808080',
          });
        }
      }

      expect(state.phase).toBe('minigameReveal');
      expect(state.miniGame.results).not.toBeNull();
      expect(Object.keys(state.miniGame.scoreDeltas ?? {})).toHaveLength(state.players.length);
    }
  });

  it('devuelve el control al mapa al cerrar cualquiera de los minijuegos alojados', () => {
    const miniGames = [
      'chinchon',
      'pocha',
      'brisca',
      'escoba',
      'sieteymedia',
      'tute',
      'cinquillo',
      'orden',
      'colores',
      'mayoria',
      'escala',
      'matiz',
      'preciojusto',
      'banderas',
      'cifras',
      'quienloharia',
      'completalafrase',
      'laronda',
      'musical',
    ] as const satisfies readonly GranRondaMiniGameId[];

    for (const gameId of miniGames) {
      let state = makeMiniGameState(gameId);
      expect(state.miniGame.embeddedGame?.gameId).toBe(gameId);
      state = play({ type: 'finishGranRondaMiniGame' }, state, 'p1');
      expect(state.phase, `${gameId} debe revelar resultados`).toBe('minigameReveal');
      state = play({ type: 'nextRound' }, state, 'p1');
      expect(state.phase, `${gameId} debe volver al mapa`).toBe('movement');
    }
  });

  it('permite comprar sellos y potenciadores y aplicar sus efectos', () => {
    let state = makeState();
    const p1 = state.players[0];
    const p2 = state.players[1];
    if (!p1 || !p2) throw new Error('faltan jugadores para la prueba');
    state.phase = 'resolving';
    state.turnSeat = 0;
    p1.position = 'plaza-copas';
    p1.coins = 20;
    state.movement = {
      playerId: 'p1',
      roll: 1,
      dice: [1],
      path: ['plaza-copas'],
      remainingSteps: 0,
      routeOptions: [],
      forcedNextSpaceId: null,
    };
    state.resolution = {
      kind: 'sello',
      spaceId: 'plaza-copas',
      title: 'Sello disponible',
      message: 'Puedes comprarlo',
      coinsDelta: 0,
      sealsDelta: 0,
    };

    state = play({ type: 'buyGranRondaSeal' }, state, 'p1');
    const afterSeal = state.players[0];
    if (!afterSeal) throw new Error('falta p1 tras comprar el sello');
    expect(afterSeal.coins).toBe(12);
    expect(afterSeal.seals).toBe(1);
    expect(state.stampSpaceId).not.toBe('plaza-copas');

    state.resolution = {
      kind: 'tienda',
      spaceId: 'mirador',
      title: 'Tienda',
      message: 'Puedes comprar',
      coinsDelta: 0,
      sealsDelta: 0,
    };

    state = play({ type: 'buyGranRondaPowerup', powerup: 'doubleRoll' }, state, 'p1');
    const afterPowerup = state.players[0];
    if (!afterPowerup) throw new Error('falta p1 tras comprar el poder');
    expect(afterPowerup.coins).toBe(7);
    expect(afterPowerup.powerups.doubleRoll).toBe(1);

    state.phase = 'movement';
    state.resolution = null;
    state.movement = null;
    state = play({ type: 'useGranRondaPowerup', powerup: 'doubleRoll' }, state, 'p1');
    const afterUse = state.players[0];
    if (!afterUse) throw new Error('falta p1 tras usar el poder');
    expect(afterUse.powerups.doubleRoll).toBe(0);
    expect(state.movement?.dice).toHaveLength(2);
    expect(state.movement?.roll).toBe(
      (state.movement?.dice[0] ?? 0) + (state.movement?.dice[1] ?? 0),
    );

    let penaltyState = makeState();
    penaltyState.phase = 'movement';
    penaltyState.turnSeat = 0;
    const penaltyP1 = penaltyState.players[0];
    const penaltyP2 = penaltyState.players[1];
    if (!penaltyP1 || !penaltyP2) throw new Error('faltan jugadores para la penalización');
    penaltyP1.powerups.rivalPenalty = 1;
    penaltyP2.coins = 3;
    penaltyState = play(
      { type: 'useGranRondaPowerup', powerup: 'rivalPenalty', targetPlayerId: 'p2' },
      penaltyState,
      'p1',
    );
    const afterPenaltyP1 = penaltyState.players[0];
    const afterPenaltyP2 = penaltyState.players[1];
    if (!afterPenaltyP1 || !afterPenaltyP2)
      throw new Error('faltan jugadores tras la penalización');
    expect(afterPenaltyP1.powerups.rivalPenalty).toBe(0);
    expect(afterPenaltyP2.coins).toBe(1);
  });
});
