import { describe, expect, it } from 'vitest';
import { REACTION_IDS, ReactionIdSchema, isReactionId } from './reactions.ts';
import { clientPayloadSchemas } from './socket.ts';

describe('reacciones', () => {
  it('son exactamente cuatro y sin repetidos (roadmap: "4 emojis, sin chat libre")', () => {
    expect(REACTION_IDS).toHaveLength(4);
    expect(new Set(REACTION_IDS).size).toBe(4);
  });

  it('acepta los cuatro identificadores y rechaza cualquier otro', () => {
    for (const id of REACTION_IDS) {
      expect(ReactionIdSchema.safeParse(id).success).toBe(true);
    }
    expect(ReactionIdSchema.safeParse('insulto').success).toBe(false);
    expect(isReactionId('aplauso')).toBe(true);
    expect(isReactionId('👏')).toBe(false);
  });

  it('el payload de reaction:send no admite texto libre', () => {
    const schema = clientPayloadSchemas['reaction:send'];
    expect(schema.safeParse({ reaction: 'risa' }).success).toBe(true);
    // Un mensaje de chat disfrazado de reacción no pasa el esquema.
    expect(schema.safeParse({ reaction: 'hola a todos' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('room:stats no lleva payload', () => {
    const schema = clientPayloadSchemas['room:stats'];
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ roomCode: 'ABCD' }).success).toBe(false);
  });
});
