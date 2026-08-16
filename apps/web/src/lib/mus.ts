export const PIEDRAS_POR_AMARRAKO = 5;
export const MUS_META_PIEDRAS = 40;

export type MusEnviteChoice = number | 'ordago';

export interface MusAmountDisplay {
  primary: string;
  secondary: string | null;
}

/**
 * Pasos compactos del selector de envite: piedras sueltas hasta el primer
 * amarrako, amarrakos completos después y órdago al final. Si un reenvido
 * tiene un mínimo intermedio, ese mínimo se conserva como primer paso.
 */
export function musEnviteChoices(minEnvite: number): MusEnviteChoice[] {
  const minimum = Math.max(2, Math.ceil(minEnvite));
  const choices: MusEnviteChoice[] = [];

  if (minimum <= MUS_META_PIEDRAS) {
    choices.push(minimum);

    let last = minimum;
    if (minimum < PIEDRAS_POR_AMARRAKO) {
      for (let amount = minimum + 1; amount <= PIEDRAS_POR_AMARRAKO; amount += 1) {
        choices.push(amount);
      }
      last = PIEDRAS_POR_AMARRAKO;
    }

    for (
      let amount = Math.ceil((last + 1) / PIEDRAS_POR_AMARRAKO) * PIEDRAS_POR_AMARRAKO;
      amount <= MUS_META_PIEDRAS;
      amount += PIEDRAS_POR_AMARRAKO
    ) {
      choices.push(amount);
    }
  }

  choices.push('ordago');
  return choices;
}

/** Etiqueta principal del contador y su equivalencia exacta en piedras. */
export function formatMusStepperAmount(amount: number): MusAmountDisplay {
  if (amount < PIEDRAS_POR_AMARRAKO) {
    return {
      primary: `${amount} ${amount === 1 ? 'piedra' : 'piedras'}`,
      secondary: null,
    };
  }

  const amarrakos = Math.floor(amount / PIEDRAS_POR_AMARRAKO);
  const looseStones = amount % PIEDRAS_POR_AMARRAKO;
  const amarrakoLabel = `${amarrakos} ${amarrakos === 1 ? 'amarrako' : 'amarrakos'}`;

  return {
    primary: looseStones === 0 ? amarrakoLabel : `${amarrakoLabel} + ${looseStones}`,
    secondary: `${amount} piedras`,
  };
}

/** Expresa el tanteo en piedras y, cuando encaja, también en amarrakos. */
export function formatMusAmount(amount: number): string {
  if (amount % PIEDRAS_POR_AMARRAKO !== 0) {
    return `${amount} ${amount === 1 ? 'piedra' : 'piedras'}`;
  }
  const amarrakos = amount / PIEDRAS_POR_AMARRAKO;
  return `${amount} piedras · ${amarrakos} ${amarrakos === 1 ? 'amarrako' : 'amarrakos'}`;
}
