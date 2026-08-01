// Eventos cosméticos del juego. Contrato §2.4.
//
// GameEvent es COSMÉTICO: nunca contiene información privada de terceros y la
// interfaz debe funcionar sin él (solo sirve para animaciones).
import { z } from 'zod';
import type { CardId, PlayerId } from './ids.ts';

const roundScoredRow = z.object({
  playerId: z.string(),
  delta: z.number().int(),
  total: z.number().int(),
});

export const GameEventSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('dealt'), round: z.number().int() }),
  z.object({ t: z.literal('drewDeck'), playerId: z.string() }),
  // Al robar del descarte, la carta robada es pública (estaba boca arriba).
  z.object({ t: z.literal('drewDiscard'), playerId: z.string(), cardId: z.string() }),
  // La carta descartada pasa a ser la nueva cima pública del descarte.
  z.object({ t: z.literal('discarded'), playerId: z.string(), cardId: z.string() }),
  z.object({ t: z.literal('closed'), playerId: z.string() }),
  z.object({ t: z.literal('chinchon'), playerId: z.string() }),
  z.object({ t: z.literal('deckReshuffled') }),
  z.object({ t: z.literal('roundScored'), scores: z.array(roundScoredRow) }),
  z.object({ t: z.literal('eliminated'), playerId: z.string() }),
  z.object({ t: z.literal('gameOver'), winnerId: z.string() }),
  // --- Pocha (§10.3, P21/P22). `roundScored` y `gameOver` (arriba) se
  // reutilizan tal cual para Pocha; estos cuatro son exclusivos suyos. ---
  z.object({ t: z.literal('trumpRevealed'), cardId: z.string() }),
  z.object({ t: z.literal('bid'), playerId: z.string(), amount: z.number().int() }),
  z.object({ t: z.literal('cardPlayed'), playerId: z.string(), cardId: z.string() }),
  z.object({ t: z.literal('trickWon'), playerId: z.string(), cards: z.array(z.string()) }),
]);

export type GameEvent = z.infer<typeof GameEventSchema>;

/** Alias narrativo: el id del jugador que origina el evento, si aplica. */
export type EventPlayerId = PlayerId;
/** Alias narrativo: el id de carta que aparece en el evento, si aplica. */
export type EventCardId = CardId;
