// Reducer puro de Musical. El reloj del audio vive en los clientes; el
// servidor solo arbitra acciones y conserva la respuesta secreta.

import type { CreateInitialStateInput } from '../../core/types.ts';
import type {
  GameAction,
  GameEvent,
  MusicalConfig,
  MusicalTrack,
  PlayerId,
  Result,
} from '@ronda/protocol';
import { err, ok } from '@ronda/protocol';
import {
  activePlayers,
  findPlayer,
  musicalConfigForGame,
  type MusicalGuess,
  type MusicalRoundResultState,
  type MusicalState,
} from './state.ts';

/** Se escuchan fragmentos cada vez más largos, siempre desde el comienzo. */
export const MUSICAL_CLIP_STEPS = [2, 5, 10, 20] as const;

export type MusicalActionResult = Result<{ state: MusicalState; events: GameEvent[] }>;

export function createInitialState(
  input: CreateInitialStateInput & {
    roomCode?: string;
    players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[];
  },
): MusicalState {
  const config = musicalConfigForGame(input.config);
  return {
    version: 0,
    status: 'playing',
    phase: 'setup',
    config,
    gameId: 'musical',
    roomCode: input.roomCode ?? '',
    round: 1,
    turnSeat: null,
    players: [...input.players]
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        playerId: player.playerId,
        nick: player.nick,
        seat: player.seat,
        isBot: player.isBot ?? false,
        score: 0,
        left: false,
        hand: [],
        onlineClipStartedAt: null,
        onlineClipResolvedAt: null,
        onlineClipElapsedMs: null,
      })),
    playedTrackIds: [],
    currentTrack: null,
    clipStartedAt: null,
    buzzedPlayerId: null,
    blockedPlayerIds: [],
    clipIndex: 0,
    guesses: {},
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
  };
}

export function applyAction(
  state: MusicalState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): MusicalActionResult {
  switch (action.type) {
    case 'musicSelectTrack':
      return selectTrack(state, playerId, action.track);
    case 'musicStartClip':
      return startClip(state, playerId, now);
    case 'musicResolveClip':
      return resolveClip(state, playerId, now);
    case 'musicBuzz':
      return buzz(state, playerId);
    case 'musicSubmitGuess':
      return submitGuess(state, playerId, action.artist, action.title, action.year);
    case 'musicNextClip':
      return nextClip(state, playerId);
    case 'musicNextRound':
      return nextRound(state, playerId);
    default:
      return err('INVALID_ACTION');
  }
}

function selectTrack(
  state: MusicalState,
  playerId: PlayerId,
  track: MusicalTrack,
): MusicalActionResult {
  if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'setup') {
    return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
  }
  if (!track.previewUrl || !track.title.trim() || !track.artist.trim()) {
    return err('INVALID_ACTION');
  }
  if ((state.playedTrackIds ?? []).includes(track.id)) return err('INVALID_ACTION');

  const next = bump(state);
  next.playedTrackIds = [...(state.playedTrackIds ?? []), track.id];
  next.currentTrack = cloneTrack(track);
  next.clipStartedAt = null;
  next.buzzedPlayerId = null;
  next.blockedPlayerIds = [];
  next.clipIndex = 0;
  next.guesses = {};
  next.roundResult = null;
  resetOnlineClocks(next);
  next.phase = 'playing';
  return ok({
    state: next,
    events: [{ t: 'musicTrackSelected', round: next.round }],
  });
}

function startClip(state: MusicalState, playerId: PlayerId, now: number): MusicalActionResult {
  if (state.config.audioMode === 'online') {
    if (state.status !== 'playing' || state.phase !== 'playing' || !state.currentTrack) {
      return err('INVALID_ACTION');
    }
    const player = findPlayer(state, playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    if (player.left) return err('PLAYER_ELIMINATED');
    if (player.onlineClipStartedAt !== null) return err('INVALID_ACTION');

    const next = bump(state);
    const nextPlayer = findPlayer(next, playerId);
    if (!nextPlayer) return err('PLAYER_NOT_IN_ROOM');
    nextPlayer.onlineClipStartedAt = now;
    return ok({ state: next, events: [] });
  }

  if (
    !isHost(state, playerId) ||
    state.status !== 'playing' ||
    state.phase !== 'playing' ||
    !state.currentTrack ||
    state.clipStartedAt !== null
  ) {
    return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
  }

  const next = bump(state);
  next.clipStartedAt = now;
  return ok({ state: next, events: [] });
}

function resolveClip(state: MusicalState, playerId: PlayerId, now: number): MusicalActionResult {
  if (
    state.config.audioMode !== 'online' ||
    state.status !== 'playing' ||
    state.phase !== 'playing' ||
    !state.currentTrack
  ) {
    return err('INVALID_ACTION');
  }
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (player.onlineClipStartedAt === null || player.onlineClipResolvedAt !== null) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const nextPlayer = findPlayer(next, playerId);
  if (!nextPlayer || nextPlayer.onlineClipStartedAt === null) return err('INVALID_ACTION');
  nextPlayer.onlineClipResolvedAt = now;
  nextPlayer.onlineClipElapsedMs = Math.max(0, now - nextPlayer.onlineClipStartedAt);
  return ok({ state: next, events: [] });
}

function buzz(state: MusicalState, playerId: PlayerId): MusicalActionResult {
  if (
    state.status !== 'playing' ||
    state.phase !== 'playing' ||
    state.config.mode !== 'velocidad' ||
    !state.currentTrack ||
    state.clipStartedAt === null ||
    state.buzzedPlayerId !== null
  ) {
    return err('INVALID_ACTION');
  }
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.blockedPlayerIds.includes(playerId)) return err('INVALID_ACTION');

  const next = bump(state);
  next.buzzedPlayerId = playerId;
  return ok({
    state: next,
    events: [{ t: 'musicBuzzed', playerId }],
  });
}

function submitGuess(
  state: MusicalState,
  playerId: PlayerId,
  artist: string,
  title: string,
  year: number | null,
): MusicalActionResult {
  if (state.status !== 'playing' || state.phase !== 'playing' || !state.currentTrack) {
    return err('INVALID_ACTION');
  }
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.blockedPlayerIds.includes(playerId)) return err('INVALID_ACTION');
  if (state.config.audioMode === 'online') {
    if (player.onlineClipResolvedAt === null || player.onlineClipElapsedMs === null) {
      return err('INVALID_ACTION');
    }
  } else if (
    state.clipStartedAt === null ||
    (state.config.mode === 'velocidad' && state.buzzedPlayerId !== playerId)
  ) {
    return err('INVALID_ACTION');
  }

  const guess: MusicalGuess = {
    artist: artist.trim(),
    title: title.trim(),
    year,
    correct: false,
  };
  if (!isGuessComplete(state.config.answerMode, guess)) return err('INVALID_ACTION');

  const next = bump(state);
  const nextTrack = next.currentTrack;
  if (!nextTrack) return err('INVALID_ACTION');
  guess.correct = isCorrectGuess(guess, nextTrack, next.config.answerMode);
  const guesses = next.guesses[playerId] ?? [];
  next.guesses[playerId] = [...guesses, guess];
  const events: GameEvent[] = [{ t: 'musicGuessSubmitted', playerId }];

  if (guess.correct && next.config.audioMode === 'online') {
    // En online no gana quien consigue enviar antes el formulario, sino el
    // acierto con menor tiempo de escucha. Esperamos a las respuestas de las
    // personas que ya han entrado en la carrera para poder compararlas.
    if (allOnlineParticipantsHaveGuessed(next)) {
      finishOnlineRound(next, events);
    }
  } else if (guess.correct) {
    const points = pointsForClip(next.clipIndex);
    const nextPlayer = findPlayer(next, playerId);
    if (!nextPlayer) return err('PLAYER_NOT_IN_ROOM');
    nextPlayer.score += points;
    next.buzzedPlayerId = null;
    next.phase = 'reveal';
    next.roundResult = buildRoundResult(next, playerId, points);
    if (next.round >= next.config.rounds) {
      next.status = 'gameEnd';
      next.winnerId = decideWinner(next);
      if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
    }
  } else if (next.config.audioMode === 'online' || next.config.mode === 'velocidad') {
    // Un fallo elimina al jugador de esta canción. En presencial el pulsador
    // queda libre para que otra persona pueda intentarlo; en online ya no
    // vuelve a abrirse el formulario de este jugador.
    if (!next.blockedPlayerIds.includes(playerId)) {
      next.blockedPlayerIds.push(playerId);
    }
    if (next.config.audioMode !== 'online') next.buzzedPlayerId = null;
  }

  return ok({ state: next, events });
}

function nextClip(state: MusicalState, playerId: PlayerId): MusicalActionResult {
  if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'playing') {
    return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
  }
  if (!state.currentTrack) return err('INVALID_ACTION');
  if (state.config.audioMode !== 'online' && state.clipStartedAt === null) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  next.clipStartedAt = null;
  next.buzzedPlayerId = null;
  if (next.config.audioMode === 'online') {
    const events: GameEvent[] = [{ t: 'musicClipAdvanced', clipIndex: next.clipIndex }];
    finishOnlineRound(next, events);
    return ok({
      state: next,
      events,
    });
  }
  if (next.config.mode === 'velocidad') {
    next.phase = 'reveal';
    next.roundResult = buildRoundResult(next, null, 0);
    const events: GameEvent[] = [{ t: 'musicClipAdvanced', clipIndex: next.clipIndex }];
    if (next.round >= next.config.rounds) {
      next.status = 'gameEnd';
      next.winnerId = decideWinner(next);
      if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
    }
    return ok({ state: next, events });
  }
  if (next.clipIndex < MUSICAL_CLIP_STEPS.length - 1) {
    next.clipIndex += 1;
    return ok({
      state: next,
      events: [{ t: 'musicClipAdvanced', clipIndex: next.clipIndex }],
    });
  }

  next.phase = 'reveal';
  next.roundResult = buildRoundResult(next, null, 0);
  const events: GameEvent[] = [{ t: 'musicClipAdvanced', clipIndex: next.clipIndex }];
  if (next.round >= next.config.rounds) {
    next.status = 'gameEnd';
    next.winnerId = decideWinner(next);
    if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
  }
  return ok({ state: next, events });
}

function nextRound(state: MusicalState, playerId: PlayerId): MusicalActionResult {
  if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'reveal') {
    return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
  }
  if (state.round >= state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  next.round += 1;
  next.phase = 'setup';
  next.currentTrack = null;
  next.clipStartedAt = null;
  next.buzzedPlayerId = null;
  next.blockedPlayerIds = [];
  next.clipIndex = 0;
  next.guesses = {};
  next.roundResult = null;
  resetOnlineClocks(next);
  next.rematchVotes = [];
  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

function buildRoundResult(
  state: MusicalState,
  winnerId: PlayerId | null,
  points: number,
): MusicalRoundResultState {
  return {
    track: cloneTrack(state.currentTrack as MusicalTrack),
    winnerId,
    points,
    guesses: cloneGuesses(state.guesses),
    responseTimes: Object.fromEntries(
      state.players.map((player) => [player.playerId, player.onlineClipElapsedMs]),
    ) as Record<PlayerId, number | null>,
  };
}

function resetOnlineClocks(state: MusicalState): void {
  for (const player of state.players) {
    player.onlineClipStartedAt = null;
    player.onlineClipResolvedAt = null;
    player.onlineClipElapsedMs = null;
  }
}

function allOnlineParticipantsHaveGuessed(state: MusicalState): boolean {
  const participants = activePlayers(state).filter(
    (player) => player.onlineClipStartedAt !== null,
  );
  return (
    participants.length > 0 &&
    participants.every((player) => (state.guesses[player.playerId]?.length ?? 0) > 0)
  );
}

function finishOnlineRound(state: MusicalState, events: GameEvent[]): void {
  const winnerId = onlineWinnerId(state);
  const points = winnerId === null ? 0 : pointsForClip(state.clipIndex);
  if (winnerId !== null) {
    const winner = findPlayer(state, winnerId);
    if (winner) winner.score += points;
  }
  state.phase = 'reveal';
  state.buzzedPlayerId = null;
  state.roundResult = buildRoundResult(state, winnerId, points);
  if (state.round >= state.config.rounds) {
    state.status = 'gameEnd';
    state.winnerId = decideWinner(state);
    if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
  }
}

function onlineWinnerId(state: MusicalState): PlayerId | null {
  const candidates = activePlayers(state)
    .filter((player) => player.onlineClipElapsedMs !== null)
    .filter((player) => (state.guesses[player.playerId] ?? []).some((guess) => guess.correct))
    .sort(
      (left, right) =>
        (left.onlineClipElapsedMs ?? Number.POSITIVE_INFINITY) -
        (right.onlineClipElapsedMs ?? Number.POSITIVE_INFINITY),
    );
  return candidates[0]?.playerId ?? null;
}

function pointsForClip(clipIndex: number): number {
  return Math.max(1, 5 - clipIndex);
}

function isHost(state: MusicalState, playerId: PlayerId): boolean {
  const player = findPlayer(state, playerId);
  return player?.seat === 0 && !player.left;
}

function isCorrectGuess(
  guess: MusicalGuess,
  track: MusicalTrack,
  answerMode: MusicalState['config']['answerMode'],
): boolean {
  const titleMatches = normalizedMatch(guess.title, track.title);
  const artistMatches = answerMode === 'title' || normalizedMatch(guess.artist, track.artist);
  const yearMatches =
    answerMode !== 'artist_title_year' || (track.year !== null && guess.year === track.year);
  return titleMatches && artistMatches && yearMatches;
}

function isGuessComplete(
  answerMode: MusicalState['config']['answerMode'],
  guess: Pick<MusicalGuess, 'artist' | 'title' | 'year'>,
): boolean {
  const hasTitle = Boolean(guess.title.trim());
  const hasArtist = answerMode === 'title' || Boolean(guess.artist.trim());
  const hasYear = answerMode !== 'artist_title_year' || guess.year !== null;
  return hasTitle && hasArtist && hasYear;
}

function normalizedMatch(value: string, expected: string): boolean {
  const a = normalizeText(value);
  const b = normalizeText(expected);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a) || isCloseTypo(a, b);
}

function isCloseTypo(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  const limit = Math.max(a.length, b.length) >= 9 ? 2 : 1;
  return levenshteinDistance(a, b) <= limit;
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column] ?? 0;
      const left = previous[column - 1] ?? 0;
      previous[column] = Math.min(
        above + 1,
        left + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length] ?? 0;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decideWinner(state: MusicalState): PlayerId | null {
  return (
    [...activePlayers(state)].sort((a, b) => b.score - a.score || a.seat - b.seat)[0]?.playerId ??
    null
  );
}

function bump(state: MusicalState): MusicalState {
  return {
    ...state,
    version: state.version + 1,
    players: state.players.map((player) => ({ ...player })),
    playedTrackIds: [...(state.playedTrackIds ?? [])],
    currentTrack: state.currentTrack ? cloneTrack(state.currentTrack) : null,
    clipStartedAt: state.clipStartedAt,
    buzzedPlayerId: state.buzzedPlayerId,
    blockedPlayerIds: [...state.blockedPlayerIds],
    guesses: cloneGuesses(state.guesses),
    roundResult: state.roundResult
      ? {
          ...state.roundResult,
          track: cloneTrack(state.roundResult.track),
          guesses: cloneGuesses(state.roundResult.guesses),
          responseTimes: { ...state.roundResult.responseTimes },
        }
      : null,
    rematchVotes: [...state.rematchVotes],
  };
}

function cloneTrack(track: MusicalTrack): MusicalTrack {
  return { ...track };
}

function cloneGuesses(guesses: Record<PlayerId, MusicalGuess[]>): Record<PlayerId, MusicalGuess[]> {
  return Object.fromEntries(
    Object.entries(guesses).map(([id, items]) => [id, items.map((guess) => ({ ...guess }))]),
  ) as Record<PlayerId, MusicalGuess[]>;
}

/** Permite a tests y al modo solo reutilizar la misma comparación. */
export function musicalGuessIsCorrect(
  guess: Pick<MusicalGuess, 'artist' | 'title' | 'year'>,
  track: MusicalTrack,
  answerMode: MusicalState['config']['answerMode'] = 'artist_title',
): boolean {
  return isCorrectGuess({ ...guess, correct: false }, track, answerMode);
}

export function musicalPointsForClip(clipIndex: number): number {
  return pointsForClip(clipIndex);
}

export type { MusicalConfig };
