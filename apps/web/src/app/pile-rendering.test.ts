import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Pile } from '../components/cards/Pile';

vi.mock('../components/cards/PlayingCard', () => ({
  PlayingCard: ({ cardId }: { cardId: string }) =>
    createElement('span', { 'data-card-face': cardId }),
}));

function cardTransform(markup: string, cardId: string): string {
  const element = markup.match(new RegExp(`data-pile-card="${cardId}"[^>]*style="([^"]+)"`));
  const transform = element?.[1]?.match(/transform:([^;]+)/)?.[1];
  if (!transform) throw new Error(`No se encontró el transform de ${cardId}`);
  return transform;
}

describe('Pile con layout de descarte', () => {
  it('muestra la superior y hasta dos cartas debajo', () => {
    const markup = renderToStaticMarkup(
      createElement(Pile, {
        cards: ['oros-1', 'copas-2', 'espadas-3', 'bastos-4'],
        size: 'md',
        layout: 'discard',
        totalCount: 4,
      }),
    );

    expect(markup).not.toContain('data-pile-card="oros-1"');
    expect(markup).toContain('data-pile-card="copas-2"');
    expect(markup).toContain('data-discard-peek="copas-2"');
    expect(markup).toContain('data-pile-card="espadas-3"');
    expect(markup).toContain('data-discard-peek="espadas-3"');
    expect(markup).toContain('data-pile-card="bastos-4"');
    expect(markup).toContain('data-pile-position="top"');
    expect(markup).not.toContain('data-discard-peek="bastos-4"');
  });

  it('conserva la postura exacta de las cartas que quedan al robar la superior', () => {
    const beforeDraw = renderToStaticMarkup(
      createElement(Pile, {
        cards: ['oros-1', 'copas-2', 'espadas-3'],
        size: 'md',
        layout: 'discard',
        totalCount: 8,
      }),
    );
    const afterDraw = renderToStaticMarkup(
      createElement(Pile, {
        cards: ['bastos-4', 'oros-1', 'copas-2'],
        size: 'md',
        layout: 'discard',
        totalCount: 7,
      }),
    );

    expect(beforeDraw).toContain('data-pile-card="oros-1"');
    expect(beforeDraw).toContain('data-discard-index="5"');
    expect(beforeDraw).toContain('data-discard-index="6"');
    expect(cardTransform(afterDraw, 'oros-1')).toBe(cardTransform(beforeDraw, 'oros-1'));
    expect(cardTransform(afterDraw, 'copas-2')).toBe(cardTransform(beforeDraw, 'copas-2'));
  });
});
