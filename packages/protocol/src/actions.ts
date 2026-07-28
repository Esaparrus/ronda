// Acciones de juego. Contrato §2.6.
import { z } from 'zod';
import type { CardId } from './ids.ts';

const cardIdField = z.string();

/**
 * Acción de juego. El tipo se deriva del esquema para que no puedan divergir.
 *
 * Notas del contrato:
 *   - `sortHand` no consume turno, no cambia la versión pública y solo la puede
 *     ejecutar el dueño de la mano.
 *   - `close` descarta esa carta y cierra.
 */
export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('drawDeck') }),
  z.object({ type: z.literal('drawDiscard') }),
  z.object({ type: z.literal('discard'), cardId: cardIdField }),
  z.object({ type: z.literal('close'), cardId: cardIdField }),
  z.object({ type: z.literal('sortHand'), order: z.array(cardIdField) }),
  z.object({ type: z.literal('nextRound') }),
]);

export type GameAction = z.infer<typeof GameActionSchema>;

/** Sub-tipo de acción con carta asociada (utilidad). */
export type CardAction = Extract<GameAction, { cardId: CardId }>;
