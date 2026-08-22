import { describe, it, expect } from 'vitest';
import {
  ChinchonConfigSchema,
  GameConfigSchema,
  MatizConfigSchema,
  PochaConfigSchema,
  MusConfigSchema,
  LaRondaConfigSchema,
  DEFAULT_CONFIG,
  DEFAULT_COLORES_CONFIG,
  DEFAULT_LA_RONDA_CONFIG,
  ColoresConfigSchema,
  DEFAULT_ESCALA_CONFIG,
  EscalaConfigSchema,
} from './config.ts';

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
      closeThreshold: 5,
      dryCloseBonus: -10,
      eliminationScore: 100,
      chinchonEndsGame: true,
      forbidDiscardDrawnCard: true,
      turnTimeSeconds: 60,
      soundEnabled: true,
    });
  });

  it('rechaza handSize distinto de 7 (campo congelado, estricto)', () => {
    expect(() => GameConfigSchema.parse({ gameId: 'chinchon', handSize: 8 })).toThrow();
  });

  it('rechaza closeThreshold fuera del conjunto cerrado', () => {
    expect(() => GameConfigSchema.parse({ gameId: 'chinchon', closeThreshold: 7 })).toThrow();
  });

  it('acepta los tiempos predefinidos por turno y rechaza otros', () => {
    for (const seconds of [0, 10, 20, 30, 60]) {
      expect(ChinchonConfigSchema.parse({ turnTimeSeconds: seconds }).turnTimeSeconds).toBe(
        seconds,
      );
    }
    expect(() => ChinchonConfigSchema.parse({ turnTimeSeconds: 45 })).toThrow();
  });

  it('acepta una config personalizada válida', () => {
    // ChinchonConfigSchema (no el GameConfigSchema ensanchado, P22): el test
    // comprueba campos exclusivos de Chinchón, así que se tipa directamente
    // con el esquema del juego en vez de forzar un narrowing de la unión.
    const custom = ChinchonConfigSchema.parse({
      gameId: 'chinchon',
      maxPlayers: 2,
      eliminationScore: 50,
    });
    expect(custom.maxPlayers).toBe(2);
    expect(custom.eliminationScore).toBe(50);
    // y respeta los defaults de lo no indicado
    expect(custom.handSize).toBe(7);
    expect(custom.chinchonEndsGame).toBe(true);
  });

  it('acepta partidas de Pocha para dos personas', () => {
    expect(PochaConfigSchema.parse({ maxPlayers: 2 }).maxPlayers).toBe(2);
  });

  it('Mus distingue mesa presencial y partida online', () => {
    expect(MusConfigSchema.parse({}).modo).toBe('presencial');
    expect(MusConfigSchema.parse({}).ochoReyes).toBe(false);
    expect(MusConfigSchema.parse({ modo: 'online' }).modo).toBe('online');
    expect(() => MusConfigSchema.parse({ modo: 'hibrido' })).toThrow();
  });

  it('configura La Ronda para mesas de 3 a 8 personas', () => {
    expect(GameConfigSchema.parse({ gameId: 'laronda' })).toEqual(DEFAULT_LA_RONDA_CONFIG);
    expect(LaRondaConfigSchema.parse({ maxPlayers: 3 }).maxPlayers).toBe(3);
    expect(LaRondaConfigSchema.parse({ maxPlayers: 8 }).maxPlayers).toBe(8);
    expect(() => LaRondaConfigSchema.parse({ maxPlayers: 2 })).toThrow();
  });

  it('configura el tema de Colores y usa todo el banco por defecto', () => {
    expect(DEFAULT_COLORES_CONFIG.topic).toBe('todo');
    expect(DEFAULT_COLORES_CONFIG.rounds).toBe(20);
    expect(DEFAULT_COLORES_CONFIG.pointsToWin).toBe(10);
    expect(ColoresConfigSchema.parse({ topic: 'banderas' }).topic).toBe('banderas');
    expect(() => ColoresConfigSchema.parse({ topic: 'faciles' })).toThrow();
  });

  it('configura los modos, el tiempo y los equipos de Escala', () => {
    expect(DEFAULT_ESCALA_CONFIG.modo).toBe('presencial');
    expect(DEFAULT_ESCALA_CONFIG.answerTimeSeconds).toBe(30);
    expect(DEFAULT_ESCALA_CONFIG.groupMode).toBe('individual');
    expect(DEFAULT_ESCALA_CONFIG.groupCount).toBe(2);
    expect(
      EscalaConfigSchema.parse({
        modo: 'online',
        answerTimeSeconds: 60,
        groupMode: 'groups',
        groupCount: 3,
      }),
    ).toMatchObject({
      modo: 'online',
      answerTimeSeconds: 60,
      groupMode: 'groups',
      groupCount: 3,
    });
  });

  it('permite limitar los retos de Matiz y mantiene el catálogo completo por defecto', () => {
    expect(MatizConfigSchema.parse({}).challengeIds).toEqual([]);
    expect(
      MatizConfigSchema.parse({ challengeIds: ['popeye-camiseta', 'logo-extra-windows'] })
        .challengeIds,
    ).toEqual(['popeye-camiseta', 'logo-extra-windows']);
  });
});
