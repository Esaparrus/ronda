import { describe, expect, it } from 'vitest';
import { GAMES, type GameModule } from '@ronda/engine';
import {
  DEFAULT_BRISCA_CONFIG,
  DEFAULT_CINQUILLO_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_ESCOBA_CONFIG,
  DEFAULT_LA_RONDA_CONFIG,
  DEFAULT_MUS_CONFIG,
  DEFAULT_POCHA_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  DEFAULT_TUTE_CONFIG,
  type GameAction,
  type GameConfig,
  type GameId,
  type PlayerView,
} from '@ronda/protocol';
import {
  decideChinchonAction,
  decideClassicAction,
  decideMusAction,
  decidePochaAction,
  decideRondaAction,
} from './bot-policy.ts';
import type { EngineState } from './room.ts';

function decide(view: PlayerView): GameAction | null {
  if (view.gameId === 'chinchon') return decideChinchonAction(view);
  if (view.gameId === 'pocha') return decidePochaAction(view);
  if (view.gameId === 'mus') return decideMusAction(view);
  if (view.gameId === 'laronda') return decideRondaAction(view);
  if (
    view.gameId === 'brisca' ||
    view.gameId === 'escoba' ||
    view.gameId === 'sieteymedia' ||
    view.gameId === 'tute' ||
    view.gameId === 'cinquillo'
  ) {
    return decideClassicAction(view);
  }
  return null;
}

const CASES: { gameId: GameId; config: GameConfig; players: number }[] = [
  { gameId: 'chinchon', config: { ...DEFAULT_CONFIG, maxPlayers: 2 }, players: 2 },
  { gameId: 'pocha', config: { ...DEFAULT_POCHA_CONFIG, maxPlayers: 3 }, players: 3 },
  { gameId: 'mus', config: DEFAULT_MUS_CONFIG, players: 4 },
  { gameId: 'brisca', config: { ...DEFAULT_BRISCA_CONFIG, maxPlayers: 2 }, players: 2 },
  { gameId: 'escoba', config: { ...DEFAULT_ESCOBA_CONFIG, maxPlayers: 2 }, players: 2 },
  {
    gameId: 'sieteymedia',
    config: { ...DEFAULT_SIETE_Y_MEDIA_CONFIG, maxPlayers: 3 },
    players: 3,
  },
  { gameId: 'tute', config: DEFAULT_TUTE_CONFIG, players: 2 },
  {
    gameId: 'cinquillo',
    config: { ...DEFAULT_CINQUILLO_CONFIG, maxPlayers: 3 },
    players: 3,
  },
  {
    gameId: 'laronda',
    config: { ...DEFAULT_LA_RONDA_CONFIG, maxPlayers: 3 },
    players: 3,
  },
];

describe('partidas completas con estrategias competitivas', () => {
  for (const item of CASES) {
    it(`${item.gameId}: todas las decisiones son legales y la partida termina`, () => {
      const registered = GAMES[item.gameId];
      if (!registered) throw new Error(`sin módulo ${item.gameId}`);
      const module = registered as GameModule<EngineState, GameAction>;
      const players = Array.from({ length: item.players }, (_, seat) => ({
        playerId: `p${seat}`,
        nick: `P${seat}`,
        seat,
      }));
      let state = module.createInitialState({
        config: item.config,
        players,
        seed: `integration:${item.gameId}`,
      });

      let actionCount = 0;
      while (state.status !== 'gameEnd' && actionCount < 3_000) {
        if (state.status === 'roundEnd') {
          for (const player of players) {
            const next = module.applyAction(
              state,
              player.playerId,
              { type: 'nextRound' },
              actionCount,
            );
            if (next.ok) state = next.value.state;
            if (state.status !== 'roundEnd') break;
          }
          actionCount += 1;
          continue;
        }

        const playerId = state.turnSeat === null ? null : players[state.turnSeat]?.playerId;
        if (!playerId) throw new Error(`${item.gameId}: estado sin jugador de turno`);
        const view = module.getPlayerView(state, playerId);
        if (view.kind !== 'player') throw new Error(`${item.gameId}: vista incorrecta`);
        const action = decide(view);
        if (!action) throw new Error(`${item.gameId}: estrategia sin acción`);
        const next = module.applyAction(state, playerId, action, actionCount);
        if (!next.ok) throw new Error(`${item.gameId}: ${action.type} produjo ${next.code}`);
        state = next.value.state;
        actionCount += 1;
      }

      expect(state.status).toBe('gameEnd');
      expect(actionCount).toBeLessThan(3_000);
    });
  }
});
