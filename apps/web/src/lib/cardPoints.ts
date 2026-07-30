// Puntos de una carta suelta (deadwood), contrato §5.5: rangos 1..9 → su
// valor, 10/11/12 → 10, comodín → jokerPoints de la config.
//
// No se llama a `cardPoints` de @ronda/protocol directamente porque su
// firma pide un `GameConfig` completo y aquí solo hace falta el único
// campo relevante (`jokerPoints`); replicar la fórmula (idéntica y
// trivial) evita fabricar un GameConfig falso solo para satisfacer el
// tipo. Compartido entre Hand.tsx (P14) y RevealedHand.tsx (P16) para no
// triplicar la misma función pequeña y pura.
import { parseCardId, type CardId } from '@ronda/protocol';

export function pointsFor(cardId: CardId, jokerPoints: number): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  const card = parsed.value;
  if (card.isJoker) return jokerPoints;
  if (card.rank === null) return 0;
  return card.rank <= 9 ? card.rank : 10;
}
