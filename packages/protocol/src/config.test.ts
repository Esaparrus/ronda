import { describe, it, expect } from 'vitest';
import { GameConfigSchema, DEFAULT_CONFIG } from './config.ts';

describe('GameConfigSchema', () => {
  it('parse({ gameId }) devuelve exactamente DEFAULT_CONFIG', () => {
    const parsed = GameConfigSchema.parse({ gameId: 'chinchon' });
    expect(parsed).toEqual(DEFAULT_CONFIG);
  });

  it('parse({}) también aplica todos los defaults (gameId incluido)', () => {
    const parsed = GameConfigSchema.parse({});
    expect(parsed).toEqual(DEFAULT_CONFIG);
    expect(parsed.gameId).toBe('chinchon');
  });

  it('respeta los valores por defecto del contrato §2.7', () => {
    expect(DEFAULT_CONFIG).toEqual({
      gameId: 'chinchon',
      maxPlayers: 4,
      handSize: 7,
      jokers: 2,
      closeThreshold: 5,
      dryCloseBonus: -10,
      eliminationScore: 100,
      chinchonEndsGame: true,
      jokerPoints: 25,
      maxJokersPerMeld: 1,
      forbidDiscardDrawnCard: true,
      soundEnabled: true,
    });
  });

  it('rechaza handSize distinto de 7 (campo congelado, estricto)', () => {
    expect(() => GameConfigSchema.parse({ gameId: 'chinchon', handSize: 8 })).toThrow();
  });

  it('rechaza closeThreshold fuera del conjunto cerrado', () => {
    expect(() =>
      GameConfigSchema.parse({ gameId: 'chinchon', closeThreshold: 7 }),
    ).toThrow();
  });

  it('acepta una config personalizada válida', () => {
    const custom = GameConfigSchema.parse({
      gameId: 'chinchon',
      maxPlayers: 2,
      jokers: 0,
      eliminationScore: 50,
    });
    expect(custom.maxPlayers).toBe(2);
    expect(custom.jokers).toBe(0);
    expect(custom.eliminationScore).toBe(50);
    // y respeta los defaults de lo no indicado
    expect(custom.handSize).toBe(7);
    expect(custom.chinchonEndsGame).toBe(true);
  });
});
