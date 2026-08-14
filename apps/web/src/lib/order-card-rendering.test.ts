import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NumberCardFace } from '../components/cards/NumberCardFace';

describe('Orden card artwork', () => {
  it('renders the complete 1-100 deck with its generated artwork', () => {
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        Array.from({ length: 100 }, (_, index) => {
          const value = index + 1;
          return createElement(NumberCardFace, { key: value, value });
        }),
      ),
    );

    expect(markup.match(/class="number-card-art"/g)).toHaveLength(100);
    for (let value = 1; value <= 100; value += 1) {
      expect(markup).toContain(`src="/cards/orden/${value}.webp"`);
      expect(markup).toContain(`aria-label="Carta ${value}"`);
    }
  });
});
