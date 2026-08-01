import { describe, it, expect } from 'vitest';
import { ChinchonConfigSchema, GameConfigSchema, DEFAULT_CONFIG } from './config.ts';

describe('GameConfigSchema', () => {
  it('parse({ gameId }) devuelve exactamente DEFAULT_CONFIG', () => {
    const parsed = GameConfigSchema.parse({ gameId: 'chinchon' });
    expect(parsed).toEqual(DEFAULT_CONFIG);
  });

  it('ChinchonConfigSchema.parse({}) aplica todos los defaults (gameId incluido)', () => {
    // GameConfigSchema es ahora una unión discriminada (§10.2, P22): zod
    // necesita conocer `gameId` para saber qué miembro aplicar, así que ya
    // no puede rellenar el propio discriminante por defecto a partir de un
    // objeto vacío -- eso solo tiene sentido en el esquema concreto de cada
    // juego, que es justo lo que este test comprueba ahora.
    const parsed = ChinchonConfigSchema.parse({});
    expect(parsed).toEqual(DEFAULT_CONFIG);
    expect(parsed.gameId).toBe('chinchon');
  });

  it('GameConfigSchema.parse({}) (sin gameId) falla: no puede elegir el miembro de la unión', () => {
    expect(() => GameConfigSchema.parse({})).toThrow();
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
    expect(() => GameConfigSchema.parse({ gameId: 'chinchon', closeThreshold: 7 })).toThrow();
  });

  it('acepta una config personalizada válida', () => {
    // ChinchonConfigSchema (no el GameConfigSchema ensanchado, P22): el test
    // comprueba campos exclusivos de Chinchón, así que se tipa directamente
    // con el esquema del juego en vez de forzar un narrowing de la unión.
    const custom = ChinchonConfigSchema.parse({
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
