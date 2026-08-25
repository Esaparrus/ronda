// Vistas censuradas de Musical. La respuesta completa no aparece hasta que
// la ronda entra en `reveal`.

import type {
  MusicalCommonView,
  MusicalGuessReveal,
  MusicalPlayerView,
  MusicalPlayerViewMe,
  MusicalTableView,
  MusicalTrackPublic,
  PlayerId,
  PublicPlayer,
} from '@ronda/protocol';
import { MUSICAL_CLIP_STEPS } from './reducer.ts';
import { findPlayer, type MusicalState } from './state.ts';

function colorIndex(seat: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (seat % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function buildPublicPlayers(state: MusicalState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    isBot: player.isBot,
    colorIndex: colorIndex(player.seat),
    score: player.score,
    handCount: 0,
    connected: true,
    isHost: player.seat === 0,
    eliminated: player.left,
    teamIndex: null,
  }));
}

function publicTrack(state: MusicalState): MusicalTrackPublic | null {
  if (!state.currentTrack) return null;
  return {
    id: state.currentTrack.id,
    previewUrl: state.currentTrack.previewUrl,
  };
}

function roundResult(state: MusicalState): MusicalCommonView['roundResult'] {
  if (!state.roundResult) return null;
  return {
    title: state.roundResult.track.title,
    artist: state.roundResult.track.artist,
    year: state.roundResult.track.year,
    artworkUrl: state.roundResult.track.artworkUrl,
    storeUrl: state.roundResult.track.storeUrl,
    winnerId: state.roundResult.winnerId,
    points: state.roundResult.points,
    guesses: Object.fromEntries(
      Object.entries(state.roundResult.guesses).map(([playerId, guesses]) => [
        playerId,
        guesses.map((guess): MusicalGuessReveal => ({
          artist: guess.artist,
          title: guess.title,
          year: guess.year,
          correct: guess.correct,
        })),
      ]),
    ) as Record<PlayerId, MusicalGuessReveal[]>,
    responseTimes: { ...state.roundResult.responseTimes },
  };
}

function common(state: MusicalState): MusicalCommonView {
  return {
    roomCode: state.roomCode,
    status: state.status,
    round: state.round,
    players: buildPublicPlayers(state),
    turnPlayerId: null,
    winnerId: state.winnerId,
    rematchVotes: [...state.rematchVotes],
    gameId: 'musical',
    config: state.config,
    phase: state.phase,
    clipIndex: state.clipIndex,
    clipSeconds: MUSICAL_CLIP_STEPS[state.clipIndex] ?? MUSICAL_CLIP_STEPS[0],
    clipStartedAt: state.clipStartedAt,
    currentTrack: publicTrack(state),
    buzzedPlayerId: state.buzzedPlayerId,
    blockedPlayerIds: [...state.blockedPlayerIds],
    guessCounts: Object.fromEntries(
      state.players.map((player) => [player.playerId, state.guesses[player.playerId]?.length ?? 0]),
    ) as Record<PlayerId, number>,
    roundResult: roundResult(state),
  };
}

function buildMe(state: MusicalState, playerId: PlayerId): MusicalPlayerViewMe {
  const player = findPlayer(state, playerId);
  if (!player) {
    return {
      playerId,
      hand: [],
      attempts: 0,
      availableActions: [],
      onlineClipStartedAt: null,
      onlineClipResolvedAt: null,
      onlineClipElapsedMs: null,
      revealedAnswer: null,
    };
  }

  const availableActions: MusicalPlayerViewMe['availableActions'] = [];
  if (state.status === 'playing' && state.phase === 'setup' && player.seat === 0) {
    availableActions.push('musicSelectTrack');
  }
  if (state.status === 'playing' && state.phase === 'playing' && !player.left) {
    const blocked = state.blockedPlayerIds.includes(playerId);
    const hasCorrectGuess = (state.guesses[playerId] ?? []).some((guess) => guess.correct);
    if (state.config.audioMode === 'online') {
      if (!blocked && !hasCorrectGuess) {
        if (player.onlineClipStartedAt === null) {
          availableActions.push('musicStartClip');
        } else if (player.onlineClipResolvedAt === null) {
          availableActions.push('musicResolveClip');
        } else {
          availableActions.push('musicSubmitGuess');
          availableActions.push('musicGiveUp');
        }
      }
    } else {
      if (!blocked) {
        if (player.seat === 0 && state.clipStartedAt === null) {
          availableActions.push('musicStartClip');
        }
        if (state.clipStartedAt !== null && state.config.mode === 'simultaneo') {
          availableActions.push('musicSubmitGuess');
        } else if (state.clipStartedAt !== null && state.buzzedPlayerId === null) {
          availableActions.push('musicBuzz');
        } else if (state.clipStartedAt !== null && state.buzzedPlayerId === playerId) {
          availableActions.push('musicSubmitGuess');
        }
      }
      if (
        player.seat === 0 &&
        state.clipStartedAt !== null &&
        !(state.config.mode === 'velocidad' && state.buzzedPlayerId !== null)
      ) {
        availableActions.push('musicNextClip');
      }
    }
  }
  if (state.status === 'playing' && state.phase === 'reveal' && player.seat === 0) {
    availableActions.push('musicNextRound');
  }

  return {
    playerId,
    hand: [],
    attempts: state.guesses[playerId]?.length ?? 0,
    availableActions,
    onlineClipStartedAt: player.onlineClipStartedAt,
    onlineClipResolvedAt: player.onlineClipResolvedAt,
    onlineClipElapsedMs: player.onlineClipElapsedMs,
    revealedAnswer:
      (state.gaveUpPlayerIds ?? []).includes(playerId) && state.currentTrack
        ? {
            title: state.currentTrack.title,
            artist: state.currentTrack.artist,
            year: state.currentTrack.year,
          }
        : null,
  };
}

export function getPlayerView(state: MusicalState, playerId: PlayerId): MusicalPlayerView {
  return { kind: 'player', ...common(state), me: buildMe(state, playerId) };
}

export function getTableView(state: MusicalState): MusicalTableView {
  return { kind: 'table', ...common(state) };
}
