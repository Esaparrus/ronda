// Difusión de snapshots y eventos. Contrato §2.4 / §2.5 / P8.
//
// REGLA CRÍTICA DE SEGURIDAD: un socket solo recibe PlayerView de su propio
// playerId. La difusión NUNCA hace io.to(room).emit con datos privados.
//
// Para cada socket de jugador → getPlayerView(state, playerId).
// Para cada socket de pantalla → getTableView(state).
//
// En lobby (sin estado de motor) se difunde una vista mínima construida aquí,
// porque el motor no existe todavía.
import type { Server as IoServerType } from 'socket.io';
import type { TypedIoServer } from '../io.ts';
import type { Room } from '../rooms/room.ts';
import {
  GAMES,
  GRAN_RONDA_BOARD,
  GRAN_RONDA_MINIGAMES,
  GRAN_RONDA_TRAP_TARGETS,
} from '@ronda/engine';
import type {
  ChinchonCommonView,
  ChinchonPlayerView,
  ChinchonTableView,
  ClassicCommonView,
  ClassicPlayerView,
  ClassicTableView,
  GranRondaCommonView,
  GranRondaPlayerView,
  GranRondaTableView,
  GameEvent,
  MusCommonView,
  MusPlayerView,
  MusTableView,
  MusicalCommonView,
  MusicalPlayerView,
  MusicalTableView,
  PrecioJustoCommonView,
  PrecioJustoPlayerView,
  PrecioJustoTableView,
  RoadmapCommonView,
  RoadmapPlayerView,
  RoadmapTableView,
  PartyCommonView,
  PartyPlayerView,
  PartyTableView,
  PlayerView,
  PochaCommonView,
  PochaPlayerView,
  PochaTableView,
  PublicPlayer,
  ReactionPayload,
  RondaCommonView,
  RondaPlayerView,
  RondaTableView,
  TableView,
} from '@ronda/protocol';

/** Versión del lobby (0). El motor arranca en versión 0. */
const LOBBY_VERSION = 0;

/** Jugadores públicos, comunes a la vista de lobby de cualquier juego. */
function buildLobbyPlayers(room: Room): PublicPlayer[] {
  return room.playersBySeat().map((p) => ({
    playerId: p.playerId,
    nick: p.nick,
    seat: p.seat,
    colorIndex: p.seat as PublicPlayer['colorIndex'],
    score: 0,
    handCount: 0,
    connected: p.connected,
    isHost: p.isHost,
    isBot: p.isBot,
    tokenIcon: p.tokenIcon,
    eliminated: false,
    groupIndex: room.gameId === 'escala' ? (p.groupIndex ?? null) : null,
    // Parejas: solo Mus las tiene (§12.12). El motor las deriva de
    // `seat % 2` al empezar (§12.2), así que el lobby puede adelantarlas con
    // la misma fórmula -- y tiene que hacerlo, porque el anfitrión asigna
    // las parejas moviendo asientos y necesita ver el resultado antes de
    // darle a "Empezar". En los otros dos juegos, `null` dice la verdad.
    teamIndex: room.gameId === 'mus' ? ((p.seat % 2) as 0 | 1) : null,
  }));
}

/**
 * Construye la parte común de la vista de lobby de Chinchón (vocabulario
 * turnPhase/deckCount/discardTop/discardCards/discardCount).
 */
function buildChinchonLobbyCommon(room: Room): ChinchonCommonView {
  return {
    roomCode: room.code,
    gameId: 'chinchon',
    config: room.config as ChinchonCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    turnPhase: null,
    turnDeadlineAt: null,
    deckCount: 0,
    discardTop: null,
    discardCards: [],
    discardCount: 0,
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
  };
}

/** Misma idea que `buildChinchonLobbyCommon`, con la forma de Pocha (§9/§10.2). */
function buildPochaLobbyCommon(room: Room): PochaCommonView {
  return {
    roomCode: room.code,
    gameId: 'pocha',
    config: room.config as PochaCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    trumpSuit: null,
    trumpCardId: null,
    roundSize: 0,
    dealerSeat: 0,
    bids: [],
    tricksWon: [],
    currentTrick: [],
    leadSuit: null,
    roundResult: null,
  };
}

function buildClassicLobbyCommon(room: Room): ClassicCommonView {
  return {
    roomCode: room.code,
    gameId: room.gameId as ClassicCommonView['gameId'],
    config: room.config as ClassicCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    phase:
      room.gameId === 'escoba'
        ? 'capture'
        : room.gameId === 'sieteymedia'
          ? 'draw'
          : room.gameId === 'cinquillo'
            ? 'layout'
            : 'trick',
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    deckCount: 0,
    trumpCardId: null,
    trumpSuit: null,
    currentTrick: [],
    tableCards: [],
    capturedCounts: [],
    escobas: [],
    bankerPlayerId: null,
    totals: [],
    stoodPlayerIds: [],
    bustPlayerIds: [],
    revealedHands: [],
  };
}

function isClassicGame(gameId: Room['gameId']): boolean {
  return (
    gameId === 'brisca' ||
    gameId === 'escoba' ||
    gameId === 'sieteymedia' ||
    gameId === 'tute' ||
    gameId === 'cinquillo'
  );
}

/** Misma idea, con la forma de Mus (§12.12). El marcador de parejas ya
 * aparece a cero para que el lobby pueda pintarlo sin casos especiales. */
function buildMusLobbyCommon(room: Room): MusCommonView {
  return {
    roomCode: room.code,
    gameId: 'mus',
    config: room.config as MusCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null, // en Mus gana una pareja: siempre null (§12.12)
    rematchVotes: [],
    teams: [
      { index: 0, piedras: 0, amarrakos: 0, juegos: 0 },
      { index: 1, piedras: 0, amarrakos: 0, juegos: 0 },
    ],
    winnerTeamIndex: null,
    manoSeat: 0,
    postreSeat: 0,
    phase: 'reparto',
    lance: null,
    bet: null,
    musConsultingTeam: null,
    musSaid: [],
    paresDeclared: [],
    juegoDeclared: [],
    handResult: null,
  };
}

function buildMusicalLobbyCommon(room: Room): MusicalCommonView {
  return {
    roomCode: room.code,
    gameId: 'musical',
    config: room.config as MusicalCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    phase: 'setup',
    clipIndex: 0,
    clipSeconds: 2,
    clipStartedAt: null,
    currentTrack: null,
    buzzedPlayerId: null,
    blockedPlayerIds: [],
    guessCounts: {},
    roundResult: null,
  };
}

function buildPrecioJustoLobbyCommon(room: Room): PrecioJustoCommonView {
  return {
    roomCode: room.code,
    gameId: 'preciojusto',
    config: room.config as PrecioJustoCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    phase: 'input',
    price: {
      gameId: 'preciojusto',
      phase: 'input',
      product: {
        id: '',
        title: 'El producto aparecerá al empezar.',
        description: null,
        image: '',
        asin: null,
        detailPageUrl: null,
        category: 'hogar',
        brandModel: null,
        variant: '',
        marketplace: 'Ronda España',
        currency: 'EUR',
        seller: 'Referencia catalogada',
        conditions: 'IVA incluido · sin envío ni cupones',
        source: 'Catálogo curado de Ronda',
        capturedAt: '2026-08-01',
      },
      referencePriceCents: null,
      deadlineAt: null,
      submittedPlayerIds: [],
      guesses: null,
      scoreDeltas: null,
    },
  };
}

function buildRoadmapLobbyCommon(room: Room): RoadmapCommonView {
  const base = {
    roomCode: room.code,
    status: room.status === 'closed' ? ('gameEnd' as const) : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    phase: 'input' as const,
  };
  if (room.gameId === 'banderas') {
    return {
      ...base,
      gameId: 'banderas',
      config: room.config as Extract<RoadmapCommonView, { gameId: 'banderas' }>['config'],
      flags: {
        gameId: 'banderas',
        phase: 'input',
        questionId: '',
        image: '',
        entityName: null,
        entityType: null,
        region: 'mundo',
        difficulty: 'normal',
        options: [],
        explanation: null,
        correctOptionId: null,
        deadlineAt: null,
        submittedPlayerIds: [],
        answers: null,
        scoreDeltas: null,
      },
    };
  }
  if (room.gameId === 'cifras') {
    return {
      ...base,
      gameId: 'cifras',
      config: room.config as Extract<RoadmapCommonView, { gameId: 'cifras' }>['config'],
      cifras: {
        gameId: 'cifras',
        phase: 'input',
        questionId: '',
        kind: 'estimate',
        prompt: 'La pregunta aparecerá al empezar.',
        unit: '',
        definition: '',
        category: 'todo',
        direction: null,
        items: [],
        referenceValue: null,
        itemValues: null,
        source: null,
        updatedAt: null,
        deadlineAt: null,
        submittedPlayerIds: [],
        estimates: null,
        orders: null,
        choices: null,
        scoreDeltas: null,
      },
    };
  }
  if (room.gameId === 'quienloharia') {
    return {
      ...base,
      gameId: 'quienloharia',
      config: room.config as Extract<RoadmapCommonView, { gameId: 'quienloharia' }>['config'],
      who: {
        gameId: 'quienloharia',
        phase: 'input',
        questionId: '',
        prompt: 'La pregunta aparecerá al empezar.',
        pack: 'ligero',
        allowSelfVote: false,
        resultsVisible: false,
        deadlineAt: null,
        submittedPlayerIds: [],
        votes: null,
        voteCounts: null,
        scoreDeltas: null,
        summary: null,
      },
    };
  }
  return {
    ...base,
    gameId: 'completalafrase',
    config: room.config as Extract<RoadmapCommonView, { gameId: 'completalafrase' }>['config'],
    sentence: {
      gameId: 'completalafrase',
      phase: 'input',
      questionId: '',
      prompt: 'La frase aparecerá al empezar.',
      category: 'refran',
      author: null,
      source: null,
      hint: null,
      deadlineAt: null,
      canonicalAnswer: null,
      submittedPlayerIds: [],
      answers: null,
      scoreDeltas: null,
    },
  };
}

/** Vista pública mínima de lobby para los cuatro modos sociales. */
function buildPartyLobbyCommon(room: Room): PartyCommonView {
  const base = {
    roomCode: room.code,
    status: room.status === 'closed' ? ('gameEnd' as const) : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    winnerId: null,
    rematchVotes: [],
    phase: 'input' as const,
  };

  if (room.gameId === 'orden') {
    const config = room.config as Extract<PartyCommonView, { gameId: 'orden' }>['config'];
    return {
      ...base,
      gameId: 'orden',
      config,
      turnPlayerId: null,
      party: {
        gameId: 'orden',
        phase: 'input',
        round: 0,
        cardsPerPlayer: config.cardsPerPlayer,
        nextCardsPerPlayer: Math.min(config.cardsPerPlayer + 1, 10),
        deckCount: 100,
        highest: 0,
        played: [],
        failure: null,
      },
    };
  }
  if (room.gameId === 'colores') {
    const config = room.config as Extract<PartyCommonView, { gameId: 'colores' }>['config'];
    return {
      ...base,
      gameId: 'colores',
      config,
      turnPlayerId: null,
      party: {
        gameId: 'colores',
        phase: 'input',
        questionId: '',
        prompt: 'La pregunta aparecerá al empezar.',
        allowMultiple: false,
        answerCount: 1,
        deadlineAt: null,
        rollover: 0,
        submittedPlayerIds: [],
        correctColors: null,
        answers: null,
        scoreDeltas: null,
      },
    };
  }
  if (room.gameId === 'mayoria') {
    const config = room.config as Extract<PartyCommonView, { gameId: 'mayoria' }>['config'];
    return {
      ...base,
      gameId: 'mayoria',
      config,
      turnPlayerId: null,
      party: {
        gameId: 'mayoria',
        phase: 'input',
        questionId: '',
        prompt: 'La pregunta aparecerá al empezar.',
        submittedPlayerIds: [],
        answers: null,
        majorityAnswers: null,
        groups: null,
        scoreDeltas: null,
        pinkCowPlayerId: null,
      },
    };
  }
  if (room.gameId === 'matiz') {
    const config = room.config as Extract<PartyCommonView, { gameId: 'matiz' }>['config'];
    return {
      ...base,
      gameId: 'matiz',
      config,
      turnPlayerId: null,
      party: {
        gameId: 'matiz',
        phase: 'input',
        challengeId: '',
        title: 'El reto aparecerá al empezar.',
        subtitle: 'Elegid un color y confirmadlo.',
        submittedPlayerIds: [],
        targetHex: null,
        answers: null,
        scoreDeltas: null,
      },
    };
  }
  const config = room.config as Extract<PartyCommonView, { gameId: 'escala' }>['config'];
  const firstPlayerId = room.playersBySeat()[0]?.playerId ?? '';
  return {
    ...base,
    gameId: 'escala',
    config,
    turnPlayerId: firstPlayerId || null,
    party: {
      gameId: 'escala',
      phase: 'input',
      modo: config.modo,
      questionId: '',
      leftLabel: 'extremo A',
      rightLabel: 'extremo B',
      cluePlayerId: firstPlayerId,
      clueGroupIndex:
        room.playersBySeat().find((player) => player.playerId === firstPlayerId)?.groupIndex ??
        null,
      clue: null,
      target: null,
      deadlineAt: null,
      submittedPlayerIds: [],
      guesses: null,
      scoreDeltas: null,
      groupScoreDeltas: null,
      groupAverageDistances: null,
      groups:
        config.groupMode === 'groups'
          ? Array.from({ length: config.groupCount }, (_, index) => ({
              index,
              score: 0,
              playerIds: room
                .playersBySeat()
                .filter((player) => player.groupIndex === index)
                .map((player) => player.playerId),
            }))
          : null,
      winnerGroupIndex: null,
    },
  };
}

function buildRondaLobbyCommon(room: Room): RondaCommonView {
  return {
    roomCode: room.code,
    gameId: 'laronda',
    config: room.config as RondaCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    phase: 'ordering',
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    winnerIds: [],
    rematchVotes: [],
    direction: 1,
    orderingCardCount: 0,
    deckCount: 100,
    tapas: [
      { type: 'carne', blocked: false, topPriceCents: null, cards: [] },
      { type: 'pescado', blocked: false, topPriceCents: null, cards: [] },
      { type: 'vegetal', blocked: false, topPriceCents: null, cards: [] },
    ],
    wineCount: 0,
    wineCostCents: 0,
    publicCards: [],
    ordersClosed: false,
    billPreviewCents: 0,
    billRequesterId: null,
    billMode: null,
    billTargetId: null,
    billResponderId: null,
    passedPlayerIds: [],
    protectedPlayerIds: [],
    roundResult: null,
  };
}

function buildGranRondaLobbyCommon(room: Room): GranRondaCommonView {
  const question = GRAN_RONDA_MINIGAMES[0];
  if (!question) throw new Error('Falta contenido de La Gran Ronda');
  return {
    roomCode: room.code,
    gameId: 'granronda',
    config: room.config as GranRondaCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    phase: 'movement',
    board: GRAN_RONDA_BOARD.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    boardPlayers: room.playersBySeat().map((player) => ({
      playerId: player.playerId,
      position: 'salida',
      coins: 5,
      seals: 0,
      skipTurns: 0,
      powerups: { doubleRoll: 0, rivalPenalty: 0, goldDuel: 0 },
      lastRoll: null,
      lastSpaceId: null,
    })),
    stampSpaceId: 'plaza-copas',
    stampCost: 8,
    stampValue: 1,
    trapSpaceIds: GRAN_RONDA_TRAP_TARGETS.slice(0, 1),
    routeOptions: [],
    movement: null,
    resolution: null,
    lastInteraction: null,
    miniGame: {
      id: question.id,
      gameId: question.id,
      title: question.title,
      prompt: question.prompt,
      instructions: question.instructions,
      options: question.options.map((option) => ({ ...option })),
      submittedPlayerIds: [],
      completedPlayerIds: [],
      correctOptionId: null,
      answers: null,
      scoreDeltas: null,
      results: null,
      embeddedGame: null,
    },
  };
}

/** Vista de lobby para un jugador (sin mano, sin `me` privado relevante). */
function lobbyPlayerView(room: Room, playerId: string): PlayerView {
  if (
    room.gameId === 'banderas' ||
    room.gameId === 'cifras' ||
    room.gameId === 'quienloharia' ||
    room.gameId === 'completalafrase'
  ) {
    const common = buildRoadmapLobbyCommon(room);
    if (room.gameId === 'banderas') {
      const view: Extract<RoadmapPlayerView, { gameId: 'banderas' }> = {
        kind: 'player',
        ...(common as Extract<RoadmapCommonView, { gameId: 'banderas' }>),
        me: {
          playerId,
          selectedOptionId: null,
          submitted: false,
          availableActions: [],
        },
      };
      return view;
    }
    if (room.gameId === 'cifras') {
      const view: Extract<RoadmapPlayerView, { gameId: 'cifras' }> = {
        kind: 'player',
        ...(common as Extract<RoadmapCommonView, { gameId: 'cifras' }>),
        me: {
          playerId,
          submitted: false,
          selectedOrder: [],
          selectedChoiceId: null,
          availableActions: [],
        },
      };
      return view;
    }
    if (room.gameId === 'quienloharia') {
      const view: Extract<RoadmapPlayerView, { gameId: 'quienloharia' }> = {
        kind: 'player',
        ...(common as Extract<RoadmapCommonView, { gameId: 'quienloharia' }>),
        me: { playerId, selectedPlayerId: null, submitted: false, availableActions: [] },
      };
      return view;
    }
    const view: Extract<RoadmapPlayerView, { gameId: 'completalafrase' }> = {
      kind: 'player',
      ...(common as Extract<RoadmapCommonView, { gameId: 'completalafrase' }>),
      me: { playerId, submitted: false, hintUsed: false, availableActions: [] },
    };
    return view;
  }
  if (room.gameId === 'preciojusto') {
    const view: PrecioJustoPlayerView = {
      kind: 'player',
      ...buildPrecioJustoLobbyCommon(room),
      me: { playerId, submitted: false, availableActions: [] },
    };
    return view;
  }
  if (room.gameId === 'laronda') {
    const view: RondaPlayerView = {
      kind: 'player',
      ...buildRondaLobbyCommon(room),
      me: {
        playerId,
        hand: [],
        legalCardIds: [],
        legalTargetTypes: [],
        legalTargetPlayerIds: [],
        availableBillModes: [],
        availableActions: [],
      },
    };
    return view;
  }
  if (room.gameId === 'granronda') {
    const view: GranRondaPlayerView = {
      kind: 'player',
      ...buildGranRondaLobbyCommon(room),
      me: {
        playerId,
        position: 'salida',
        coins: 5,
        seals: 0,
        powerups: { doubleRoll: 0, rivalPenalty: 0, goldDuel: 0 },
        embeddedGame: null,
        miniGame: null,
        selectedOptionId: null,
        availableActions: [],
      },
    };
    return view;
  }
  if (
    room.gameId === 'orden' ||
    room.gameId === 'colores' ||
    room.gameId === 'mayoria' ||
    room.gameId === 'escala' ||
    room.gameId === 'matiz'
  ) {
    const view: PartyPlayerView = {
      kind: 'player',
      ...buildPartyLobbyCommon(room),
      me: {
        playerId,
        hand: [],
        submitted: false,
        scaleTarget: null,
        availableActions: [],
      },
    };
    return view;
  }
  if (room.gameId === 'mus') {
    // Su pareja sale de su asiento, igual que en `buildLobbyPlayers`: es la
    // misma fórmula que aplicará el motor al empezar (§12.2).
    const seat = room.playersBySeat().find((p) => p.playerId === playerId)?.seat ?? 0;
    const view: MusPlayerView = {
      kind: 'player',
      ...buildMusLobbyCommon(room),
      me: {
        playerId,
        hand: [],
        teamIndex: (seat % 2) as 0 | 1,
        pares: null,
        juego: { suma: 0, tiene: false },
        minEnvite: null,
        musConsultation: null,
        availableActions: [],
      },
    };
    return view;
  }
  if (room.gameId === 'musical') {
    const view: MusicalPlayerView = {
      kind: 'player',
      ...buildMusicalLobbyCommon(room),
      me: {
        playerId,
        hand: [],
        attempts: 0,
        availableActions: [],
        onlineClipStartedAt: null,
        onlineClipResolvedAt: null,
        onlineClipElapsedMs: null,
      },
    };
    return view;
  }
  if (room.gameId === 'pocha') {
    const view: PochaPlayerView = {
      kind: 'player',
      ...buildPochaLobbyCommon(room),
      me: { playerId, hand: [], legalCardIds: [], availableActions: [] },
    };
    return view;
  }
  if (isClassicGame(room.gameId)) {
    const view: ClassicPlayerView = {
      kind: 'player',
      ...buildClassicLobbyCommon(room),
      me: { playerId, hand: [], legalCardIds: [], total: null, availableActions: [] },
    };
    return view;
  }
  const view: ChinchonPlayerView = {
    kind: 'player',
    ...buildChinchonLobbyCommon(room),
    me: {
      playerId,
      hand: [],
      bestMelds: [],
      deadwood: 0,
      canClose: false,
      closableDiscards: [],
      lockedCardId: null,
      availableActions: [],
    },
  };
  return view;
}

function lobbyTableView(room: Room): TableView {
  if (
    room.gameId === 'banderas' ||
    room.gameId === 'cifras' ||
    room.gameId === 'quienloharia' ||
    room.gameId === 'completalafrase'
  ) {
    const view: RoadmapTableView = { kind: 'table', ...buildRoadmapLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'preciojusto') {
    const view: PrecioJustoTableView = { kind: 'table', ...buildPrecioJustoLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'laronda') {
    const view: RondaTableView = { kind: 'table', ...buildRondaLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'granronda') {
    const view: GranRondaTableView = { kind: 'table', ...buildGranRondaLobbyCommon(room) };
    return view;
  }
  if (
    room.gameId === 'orden' ||
    room.gameId === 'colores' ||
    room.gameId === 'mayoria' ||
    room.gameId === 'escala' ||
    room.gameId === 'matiz'
  ) {
    const view: PartyTableView = { kind: 'table', ...buildPartyLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'mus') {
    const view: MusTableView = { kind: 'table', ...buildMusLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'musical') {
    const view: MusicalTableView = { kind: 'table', ...buildMusicalLobbyCommon(room) };
    return view;
  }
  if (room.gameId === 'pocha') {
    const view: PochaTableView = { kind: 'table', ...buildPochaLobbyCommon(room) };
    return view;
  }
  if (isClassicGame(room.gameId)) {
    const view: ClassicTableView = { kind: 'table', ...buildClassicLobbyCommon(room) };
    return view;
  }
  const view: ChinchonTableView = { kind: 'table', ...buildChinchonLobbyCommon(room) };
  return view;
}

/**
 * Difunde el snapshot a todos los miembros de la sala.
 * - En lobby: vista mínima (sin estado de motor).
 * - En partida: PlayerView/TableView del motor, censuradas.
 */
export function broadcastRoom(io: TypedIoServer, room: Room): void {
  // Lobby o sin estado: vista mínima.
  if (!room.state) {
    const version = LOBBY_VERSION;
    for (const p of room.players.values()) {
      if (!p.socketId) continue;
      io.to(p.socketId).emit('state:view', {
        version,
        view: lobbyPlayerView(room, p.playerId),
      });
    }
    for (const socketId of room.screens) {
      io.to(socketId).emit('state:view', { version, view: lobbyTableView(room) });
    }
    return;
  }

  const module = GAMES[room.gameId];
  if (!module) return;

  for (const p of room.players.values()) {
    if (!p.socketId) continue;
    const view = module.getPlayerView(room.state, p.playerId);
    io.to(p.socketId).emit('state:view', { version: room.state.version, view });
  }

  for (const socketId of room.screens) {
    const view = module.getTableView(room.state);
    io.to(socketId).emit('state:view', { version: room.state.version, view });
  }
}

/** Difunde eventos cosméticos (animaciones) a todos los miembros. */
export function broadcastEvents(
  io: TypedIoServer,
  room: Room,
  events: GameEvent[],
  version: number,
): void {
  if (events.length === 0) return;
  const payload = { version, items: events };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('events', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('events', payload);
  }
}

/** Difunde un toast a todos. */
export function broadcastToast(
  io: TypedIoServer,
  room: Room,
  level: 'info' | 'warn',
  text: string,
): void {
  const payload = { level, text };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('toast', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('toast', payload);
  }
}

/**
 * Difunde una reacción a todos los miembros, incluida la pantalla central
 * (que es donde más gracia tiene) y el propio autor: así todos ven lo mismo
 * en el mismo momento y el emisor no tiene que pintar nada por su cuenta.
 */
export function broadcastReaction(io: TypedIoServer, room: Room, payload: ReactionPayload): void {
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('reaction', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('reaction', payload);
  }
}

/** Difunde el estado de conexión de los jugadores. */
export function broadcastConnection(io: TypedIoServer, room: Room): void {
  const payload = {
    players: room.playersBySeat().map((p) => ({
      playerId: p.playerId,
      connected: p.connected,
      isHost: p.isHost,
    })),
  };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('connection', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('connection', payload);
  }
}

/** Avisa a todos los miembros de que la sala se cerró. */
export function broadcastClosed(
  io: TypedIoServer,
  room: Room,
  reason: 'host_left' | 'empty' | 'expired',
): void {
  const payload = { reason };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('room:closed', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('room:closed', payload);
  }
}

// Reexport del tipo para que otros módulos no importen io.ts con side effects.
export type { IoServerType };
