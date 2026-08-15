import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Pile } from '../components/cards/Pile';

vi.mock('../components/cards/PlayingCard', () => ({
  PlayingCard: ({ cardId }: { cardId: string }) =>
    createElement('span', { 'data-card-face': cardId }),
}));

describe('Pile con layout de descarte', () => {
  it('muestra únicamente la carta superior y la inmediatamente anterior', () => {
    const markup = renderToStaticMarkup(
      createElement(Pile, {
        cards: ['oros-1', 'copas-2', 'espadas-3'],
        size: 'md',
        layout: 'discard',
      }),
    );

    expect(markup).not.toContain('data-pile-card="oros-1"');
    expect(markup).toContain('data-pile-card="copas-2"');
    expect(markup).toContain('data-pile-position="under"');
    expect(markup).toContain('data-discard-peek="copas-2"');
    expect(markup).toContain('data-pile-card="espadas-3"');
    expect(markup).toContain('data-pile-position="top"');
    expect(markup).not.toContain('data-discard-peek="espadas-3"');
    expect(markup).toContain('translateX(24px)');
  });

  it('mantiene la carta superior en su sitio cuando solo queda una', () => {
    const markup = renderToStaticMarkup(
      createElement(Pile, { cards: ['bastos-7'], size: 'md', layout: 'discard' }),
    );

    expect(markup).toContain('data-pile-card="bastos-7"');
    expect(markup).toContain('data-pile-position="top"');
    expect(markup).toContain('translateX(24px)');
  });
});
