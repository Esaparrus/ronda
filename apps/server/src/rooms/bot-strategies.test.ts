import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRISCA_CONFIG,
  DEFAULT_CINQUILLO_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_ESCOBA_CONFIG,
  DEFAULT_LA_RONDA_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  type ChinchonPlayerView,
  type ClassicPlayerView,
  type PublicPlayer,
  type RondaCardView,
  type RondaPlayerView,
} from '@ronda/protocol';
import { decideChinchonAction, decideClassicAction, decideRondaAction } from './bot-policy.ts';

function player(playerId: string, seat: number, score = 0): PublicPlayer {
  return {
    playerId,
    nick: playerId,
    seat,
    colorIndex: seat as PublicPlayer['colorIndex'],
    score,
    handCount: 3,
    connected: true,
    isHost: seat === 0,
    eliminated: false,
    teamIndex: null,
  };
}

function chinchonView(discardTop: string): ChinchonPlayerView {
  return {
    kind: 'player',
    roomCode: 'CHIN',
    gameId: 'chinchon',
    config: DEFAULT_CONFIG,
    status: 'playing',
    round: 1,
    players: [player('human', 0), player('bot', 1)],
    turnPlayerId: 'bot',
    turnPhase: 'draw',
    turnDeadlineAt: null,
    deckCount: 24,
    discardTop,
    discardCards: [discardTop],
    discardCount: 1,
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
    me: {
      playerId: 'bot',
      hand: ['oros-1', 'oros-2', 'oros-4', 'copas-5', 'espadas-6', 'bastos-7', 'copas-12'],
      bestMelds: [],
      deadwood: 41,
      canClose: false,
      closableDiscards: [],
      lockedCardId: null,
      availableActions: ['drawDeck', 'drawDiscard'],
    },
  };
}

function classicView(
  gameId: ClassicPlayerView['gameId'],
  overrides: Partial<ClassicPlayerView>,
): ClassicPlayerView {
  const config =
    gameId === 'brisca'
      ? DEFAULT_BRISCA_CONFIG
      : gameId === 'escoba'
        ? DEFAULT_ESCOBA_CONFIG
        : gameId === 'sieteymedia'
          ? DEFAULT_SIETE_Y_MEDIA_CONFIG
          : DEFAULT_CINQUILLO_CONFIG;
  return {
    kind: 'player',
    roomCode: 'CLAS',
    gameId,
    config,
    status: 'playing',
    phase:
      gameId === 'escoba'
        ? 'capture'
        : gameId === 'sieteymedia'
          ? 'draw'
          : gameId === 'cinquillo'
            ? 'layout'
            : 'trick',
    round: 1,
    players: [player('human', 0), player('bot', 1)],
    turnPlayerId: 'bot',
    winnerId: null,
    rematchVotes: [],
    deckCount: 20,
    trumpCardId: null,
    trumpSuit: null,
    currentTrick: [],
    tableCards: [],
    capturedCounts: [0, 0],
    escobas: [0, 0],
    bankerPlayerId: null,
    totals: [null, null],
    stoodPlayerIds: [],
    bustPlayerIds: [],
    revealedHands: [],
    me: {
      playerId: 'bot',
      hand: [],
      legalCardIds: [],
      total: null,
      availableActions: [],
    },
    ...overrides,
  } as ClassicPlayerView;
}

describe('estrategia de Chinchón', () => {
  it('toma un descarte que completa una escalera y rechaza uno inútil', () => {
    expect(decideChinchonAction(chinchonView('oros-3'))).toEqual({ type: 'drawDiscard' });
    expect(decideChinchonAction(chinchonView('bastos-12'))).toEqual({ type: 'drawDeck' });
  });
});

describe('estrategias de clásicos', () => {
  it('en Brisca gana una baza valiosa con la carta ganadora más barata', () => {
    const view = classicView('brisca', {
      trumpSuit: 'oros',
      currentTrick: [{ playerId: 'human', cardId: 'copas-10' }],
      me: {
        playerId: 'bot',
        hand: ['copas-12', 'copas-1'],
        legalCardIds: ['copas-12', 'copas-1'],
        total: null,
        availableActions: ['playCard'],
      },
    });
    expect(decideClassicAction(view)).toEqual({ type: 'playCard', cardId: 'copas-12' });
  });

  it('en Escoba prioriza vaciar la mesa y llevarse el siete de oros', () => {
    const view = classicView('escoba', {
      tableCards: ['copas-4', 'bastos-4'],
      me: {
        playerId: 'bot',
        hand: ['oros-7', 'copas-5'],
        legalCardIds: ['oros-7', 'copas-5'],
        total: null,
        availableActions: ['playCapture'],
      },
    });
    expect(decideClassicAction(view)).toEqual({
      type: 'playCapture',
      cardId: 'oros-7',
      captureIds: ['copas-4', 'bastos-4'],
    });
  });

  it('la banca de Siete y media se planta cuando ya iguala la mejor mano', () => {
    const view = classicView('sieteymedia', {
      bankerPlayerId: 'bot',
      totals: [6, 6],
      me: {
        playerId: 'bot',
        hand: ['oros-6'],
        legalCardIds: ['oros-6'],
        total: 6,
        availableActions: ['drawDeck', 'stand'],
      },
    });
    expect(decideClassicAction(view)).toEqual({ type: 'stand' });
  });

  it('en Cinquillo abre primero la cadena que puede continuar', () => {
    const view = classicView('cinquillo', {
      tableCards: ['oros-5'],
      me: {
        playerId: 'bot',
        hand: ['oros-6', 'oros-7', 'copas-5'],
        legalCardIds: ['oros-6', 'copas-5'],
        total: null,
        availableActions: ['playCard'],
      },
    });
    expect(decideClassicAction(view)).toEqual({ type: 'playCard', cardId: 'oros-6' });
  });
});

function rondaCard(id: string, kind: RondaCardView['kind'], priceCents = 0): RondaCardView {
  return { id, kind, name: id, description: '', priceCents, tapaType: null };
}

function rondaBillChoiceView(): RondaPlayerView {
  return {
    kind: 'player',
    roomCode: 'RNDA',
    gameId: 'laronda',
    config: DEFAULT_LA_RONDA_CONFIG,
    status: 'playing',
    phase: 'billChoice',
    round: 2,
    players: [player('human', 0, 60_000), player('bot', 1, 65_000), player('other', 2, 55_000)],
    turnPlayerId: 'bot',
    winnerId: null,
    winnerIds: [],
    rematchVotes: [],
    direction: 1,
    orderingCardCount: 8,
    deckCount: 50,
    tapas: [
      { type: 'carne', blocked: false, topPriceCents: 3_000, cards: [] },
      { type: 'pescado', blocked: false, topPriceCents: 4_000, cards: [] },
      { type: 'vegetal', blocked: false, topPriceCents: 2_000, cards: [] },
    ],
    wineCount: 1,
    wineCostCents: 3_000,
    publicCards: [],
    ordersClosed: false,
    billPreviewCents: 18_000,
    billRequesterId: 'bot',
    billMode: null,
    billTargetId: null,
    billResponderId: null,
    passedPlayerIds: [],
    protectedPlayerIds: [],
    roundResult: null,
    me: {
      playerId: 'bot',
      hand: [rondaCard('entre-todos-1', 'grupo')],
      legalCardIds: [],
      legalTargetTypes: [],
      legalTargetPlayerIds: ['human', 'other'],
      availableBillModes: ['solo', 'group'],
      availableActions: ['chooseRondaBillMode'],
    },
  };
}

describe('estrategia de La Ronda', () => {
  it('reparte la cuenta entre el grupo cuando tiene la carta', () => {
    expect(decideRondaAction(rondaBillChoiceView())).toEqual({
      type: 'chooseRondaBillMode',
      mode: 'group',
      cardId: 'entre-todos-1',
    });
  });
});
