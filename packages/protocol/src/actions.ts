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
  // --- Pocha (§10.4, P21/P22). De las 6 acciones de arriba, solo
  // `nextRound` se reutiliza en Pocha; el resto no tienen sentido (no hay
  // mazo ni descarte individual) y `GameModule.applyAction` de Pocha
  // simplemente no las acepta. ---
  z.object({ type: z.literal('bid'), amount: z.number().int() }),
  z.object({ type: z.literal('playCard'), cardId: cardIdField }),
  // --- Mus (§12.12, P27/P28). De las acciones de arriba solo `nextRound` se
  // reutiliza (confirmar el fin de mano); el resto es vocabulario de Chinchón
  // o de Pocha y `applyAction` de Mus no las acepta. ---
  z.object({ type: z.literal('mus') }),
  z.object({ type: z.literal('noMus') }),
  z.object({ type: z.literal('descartar'), cardIds: z.array(cardIdField) }),
  // GAP DE §12.12 (encontrado en P28): la lista de acciones nuevas del
  // contrato omite `paso`, pero §12.7 lo describe como la primera fila de la
  // tabla de envites y sin él no se puede ceder la palabra. Se añade aquí y
  // se declara explícitamente en vez de colarlo en silencio, igual que P22
  // hizo con el gap de vistas de §10.
  z.object({ type: z.literal('paso') }),
  z.object({ type: z.literal('envidar'), piedras: z.number().int() }),
  z.object({ type: z.literal('querer') }),
  z.object({ type: z.literal('noQuerer') }),
  z.object({ type: z.literal('ordago') }),
  z.object({ type: z.literal('declararPares'), tiene: z.boolean() }),
  z.object({ type: z.literal('declararJuego'), tiene: z.boolean() }),
]);

export type GameAction = z.infer<typeof GameActionSchema>;

/** Sub-tipo de acción con carta asociada (utilidad). */
export type CardAction = Extract<GameAction, { cardId: CardId }>;
