// Acciones de juego. Contrato §2.6.
import { z } from 'zod';
import type { CardId } from './ids.ts';

const cardIdField = z.string();

/** Metadata que el anfitrión selecciona en iTunes para una ronda musical. */
export const MusicalTrackSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100).nullable(),
  previewUrl: z.string().url().max(600),
  artworkUrl: z.string().url().max(600).nullable(),
  storeUrl: z.string().url().max(600),
});

export type MusicalTrack = z.infer<typeof MusicalTrackSchema>;

const musicalGuessField = z.string().trim().max(120);

/** Frases cerradas de la consulta privada de pareja en el Mus online. */
export const MusPartnerSignalSchema = z.enum([
  'porMiMus',
  'prefieroCortar',
  'tePuedoAyudar',
  'voyFlojo',
  'decideTu',
]);

export type MusPartnerSignal = z.infer<typeof MusPartnerSignalSchema>;

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
  // --- Clásicos de baraja española ---------------------------------------
  // Escoba juega una carta y, opcionalmente, recoge un subconjunto de la
  // mesa. Siete y media reutiliza `drawDeck`; Cinquillo necesita poder pasar.
  z.object({
    type: z.literal('playCapture'),
    cardId: cardIdField,
    captureIds: z.array(cardIdField),
  }),
  z.object({ type: z.literal('stand') }),
  z.object({ type: z.literal('pass') }),
  // --- Mus (§12.12, P27/P28). De las acciones de arriba solo `nextRound` se
  // reutiliza (confirmar el fin de mano); el resto es vocabulario de Chinchón
  // o de Pocha y `applyAction` de Mus no las acepta. ---
  z.object({ type: z.literal('mus') }),
  z.object({ type: z.literal('noMus') }),
  z.object({ type: z.literal('musSignal'), signal: MusPartnerSignalSchema }),
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
  z.object({ type: z.literal('repartir') }),
  // --- Modos sociales -------------------------------------------------------
  // `playNumber` no tiene turno: la primera acción que acepta el servidor
  // gana la carrera. `expectedVersion` ya hace de árbitro de simultaneidad.
  z.object({ type: z.literal('playNumber'), value: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal('setOrderCards'), count: z.number().int().min(1).max(10) }),
  z.object({ type: z.literal('endOrder') }),
  z.object({
    type: z.literal('submitColors'),
    colors: z.array(z.string().min(1).max(24)).min(1).max(4),
  }),
  /** Acción interna del reloj del servidor; antes del plazo el motor la rechaza. */
  z.object({ type: z.literal('finishColors') }),
  z.object({ type: z.literal('submitMajority'), answer: z.string().min(1).max(80) }),
  z.object({ type: z.literal('submitScale'), value: z.number().int().min(0).max(100) }),
  // --- Musical -------------------------------------------------------------
  // La URL de preview es pública para que cada móvil pueda reproducir el
  // fragmento, pero el servidor nunca envía la respuesta fuera de la
  // revelación de la ronda.
  z.object({ type: z.literal('musicSelectTrack'), track: MusicalTrackSchema }),
  z.object({ type: z.literal('musicBuzz') }),
  z.object({
    type: z.literal('musicSubmitGuess'),
    artist: musicalGuessField,
    title: musicalGuessField,
    year: z.number().int().min(1900).max(2100).nullable(),
  }),
  z.object({ type: z.literal('musicNextClip') }),
  z.object({ type: z.literal('musicNextRound') }),
  // --- La Ronda ------------------------------------------------------------
  z.object({
    type: z.literal('playRondaCard'),
    cardId: cardIdField,
    targetType: z
      .union([z.literal('carne'), z.literal('pescado'), z.literal('vegetal')])
      .optional(),
    premiumCardId: cardIdField.optional(),
  }),
  z.object({ type: z.literal('askRondaBill') }),
  z.object({ type: z.literal('skipRondaTurn') }),
  z.object({
    type: z.literal('chooseRondaBillMode'),
    mode: z.union([z.literal('solo'), z.literal('half'), z.literal('group')]),
    cardId: cardIdField.optional(),
    targetPlayerId: z.string().optional(),
  }),
  z.object({ type: z.literal('playRondaTip'), cardId: cardIdField }),
  z.object({ type: z.literal('passRondaBill') }),
  z.object({ type: z.literal('confirmRondaDiscards'), cardIds: z.array(cardIdField).max(10) }),
]);

export type GameAction = z.infer<typeof GameActionSchema>;

/** Sub-tipo de acción con carta asociada (utilidad). */
export type CardAction = Extract<GameAction, { cardId: CardId }>;
