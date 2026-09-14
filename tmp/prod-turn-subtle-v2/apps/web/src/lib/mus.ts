export const PIEDRAS_POR_AMARRAKO = 5;

/** Cantidades cómodas para un envite sin impedir escribir cualquier entero. */
export function musQuickAmounts(minEnvite: number): number[] {
  const candidates = [minEnvite, minEnvite + 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40];
  return [...new Set(candidates)].filter((amount) => amount >= minEnvite).sort((a, b) => a - b);
}

/** Expresa el tanteo en piedras y, cuando encaja, también en amarrakos. */
export function formatMusAmount(amount: number): string {
  if (amount % PIEDRAS_POR_AMARRAKO !== 0) {
    return `${amount} ${amount === 1 ? 'piedra' : 'piedras'}`;
  }
  const amarrakos = amount / PIEDRAS_POR_AMARRAKO;
  return `${amount} piedras · ${amarrakos} ${amarrakos === 1 ? 'amarrako' : 'amarrakos'}`;
}
