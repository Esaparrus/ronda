import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RANKS, SUITS } from '@ronda/protocol';
import { StylizedCardFace } from '../components/cards/StylizedCardFace';

type GeneratedStyle = 'minimal' | 'pixel';

function renderDeck(style: GeneratedStyle): string {
  return renderToStaticMarkup(
    createElement(
      'div',
      null,
      SUITS.flatMap((suit) =>
        RANKS.map((rank) =>
          createElement(
            'svg',
            { key: `${suit}-${rank}`, role: 'img' },
            createElement(StylizedCardFace, { suit, rank, variant: style }),
          ),
        ),
      ),
    ),
  );
}

describe('generated card decks', () => {
  it.each([
    ['minimal', 'geometricPrecision'],
    ['pixel', 'crispEdges'],
  ] as const)('renders all 40 cards in %s', (style, shapeRendering) => {
    const markup = renderDeck(style);

    expect(markup.match(/role="img"/g)).toHaveLength(40);
    expect(markup).not.toContain('<image');
    expect(markup).toContain(`shape-rendering="${shapeRendering}"`);
  });
});
