import { describe, expect, it } from 'vitest';
import { DEFAULT_LA_RONDA_CONFIG } from './config.ts';
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
