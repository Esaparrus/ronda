import { RANKS, SUITS, type CardId, type Suit } from '@ronda/protocol';

export type CardPreviewMode = 'single' | 'multiple';

export const MAX_CARD_PREVIEW_SELECTION = 4;

export const SUIT_LABELS: Readonly<Record<Suit, string>> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
};

export const CARD_PREVIEW_GROUPS = SUITS.map((suit) => ({
  suit,
  label: SUIT_LABELS[suit],
  cards: RANKS.map((rank) => `${suit}-${rank}` as CardId),
}));

export const ALL_CARD_IDS = CARD_PREVIEW_GROUPS.flatMap((group) => group.cards);

export const DEFAULT_CARD_PREVIEW: readonly CardId[] = [
  'oros-1',
  'copas-10',
  'espadas-11',
  'bastos-12',
];

export function updateCardPreviewSelection(
  current: readonly CardId[],
  cardId: CardId,
  mode: CardPreviewMode,
): CardId[] {
  if (mode === 'single') return [cardId];

  if (current.includes(cardId)) {
    return current.length === 1 ? [...current] : current.filter((selected) => selected !== cardId);
  }

  if (current.length >= MAX_CARD_PREVIEW_SELECTION) return [...current];
  return [...current, cardId];
}
