// Puntos de una carta suelta (deadwood), contrato §5.5: rangos 1..7 → su
// valor, figuras (10, 11, 12) → 10.
//
// P31: era una copia de la fórmula porque `cardPoints` de @ronda/protocol
// pedía un `GameConfig` entero solo para saber cuánto valía el comodín. Sin
// comodines la firma es `cardPoints(card)`, así que aquí solo queda el
// envoltorio que tolera un id inválido devolviendo 0 en vez de reventar el
// render. Compartido entre Hand.tsx (P14) y RevealedHand.tsx (P16).
import { cardPoints, parseCardId, type CardId } from '@ronda/protocol';

export function pointsFor(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  return cardPoints(parsed.value);
}
