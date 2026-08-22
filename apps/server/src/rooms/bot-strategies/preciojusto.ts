import type { GameAction, PrecioJustoPlayerView } from '@ronda/protocol';

/** Estimación deliberadamente imperfecta: el bot no recibe el precio objetivo. */
export function decidePrecioJustoAction(
  view: PrecioJustoPlayerView,
): Extract<GameAction, { type: 'submitPrice' | 'finishPrice' }> | null {
  if (view.phase !== 'input') return null;
  if (view.me.availableActions.includes('submitPrice')) {
    const category = view.price.product.category;
    const guessByCategory: Record<string, number> = {
      hogar: 3200,
      tecnologia: 2800,
      ocio: 2500,
      deporte: 3600,
      accesorios: 4000,
      curiosos: 1900,
      baratos: 2100,
      'precio-medio': 4500,
    };
    return { type: 'submitPrice', priceCents: guessByCategory[category] ?? 3000 };
  }
  if (view.me.availableActions.includes('finishPrice')) return { type: 'finishPrice' };
  return null;
}
