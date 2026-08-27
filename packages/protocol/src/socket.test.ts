import { describe, expect, it } from 'vitest';
import { DEFAULT_LA_RONDA_CONFIG, DEFAULT_MATIZ_CONFIG } from './config.ts';
import { clientPayloadSchemas } from './socket.ts';

describe('esquemas de socket de La Ronda', () => {
  it('acepta crear una sala de La Ronda', () => {
    const result = clientPayloadSchemas['room:create'].safeParse({
      gameId: 'laronda',
      config: DEFAULT_LA_RONDA_CONFIG,
      nick: 'Unai',
    });

    expect(result.success).toBe(true);
  });

  it('acepta actualizar la configuración de La Ronda', () => {
    const result = clientPayloadSchemas['room:config'].safeParse({
      patch: { gameId: 'laronda', maxPlayers: 3 },
    });

    expect(result.success).toBe(true);
  });
});

describe('esquemas de socket de Matiz', () => {
  it('acepta crear una sala de Matiz', () => {
    const result = clientPayloadSchemas['room:create'].safeParse({
      gameId: 'matiz',
      config: DEFAULT_MATIZ_CONFIG,
      nick: 'Unai',
    });

    expect(result.success).toBe(true);
  });

  it('acepta actualizar la configuración de Matiz', () => {
    const result = clientPayloadSchemas['room:config'].safeParse({
      patch: { gameId: 'matiz', rounds: 7, challengeIds: ['homer-piel'] },
    });

    expect(result.success).toBe(true);
  });
});

describe('fichas de jugador', () => {
  it('acepta objetos del catálogo y rechaza caras o texto libre', () => {
    expect(
      clientPayloadSchemas['room:join'].safeParse({
        roomCode: 'ABCD',
        nick: 'Unai',
        tokenIcon: '🧭',
      }).success,
    ).toBe(true);

    expect(
      clientPayloadSchemas['room:join'].safeParse({
        roomCode: 'ABCD',
        nick: 'Unai',
        tokenIcon: '😀',
      }).success,
    ).toBe(false);
  });
});

describe('acciones de consulta de Mus', () => {
  it('acepta únicamente las frases privadas cerradas', () => {
    const base = { clientActionId: 'mus-signal-1', expectedVersion: 3 };
    expect(
      clientPayloadSchemas['game:action'].safeParse({
        ...base,
        action: { type: 'musSignal', signal: 'tePuedoAyudar' },
      }).success,
    ).toBe(true);
    expect(
      clientPayloadSchemas['game:action'].safeParse({
        ...base,
        action: { type: 'musSignal', signal: 'tengo tres reyes' },
      }).success,
    ).toBe(false);
  });

  it('rechaza las antiguas declaraciones manuales de pares y juego', () => {
    const base = { clientActionId: 'mus-declaration-1', expectedVersion: 3 };

    for (const type of ['declararPares', 'declararJuego']) {
      expect(
        clientPayloadSchemas['game:action'].safeParse({
          ...base,
          action: { type, tiene: true },
        }).success,
      ).toBe(false);
    }
  });
});
