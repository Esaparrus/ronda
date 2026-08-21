/** Retos incluidos en el catálogo de Matiz.
 *
 * El color correcto vive en el contrato compartido para que el motor pueda
 * puntuar de forma determinista. La interfaz no lo muestra hasta revelar la
 * ronda; añadir nuevos dibujos consiste en ampliar esta lista y su asset web.
 */
export const MATIZ_CHALLENGES = [
  {
    id: 'popeye-camiseta',
    title: 'Popeye',
    subtitle: 'Pon el color del cuello de Popeye',
    targetHex: '#ed4754',
  },
  {
    id: 'humpty-pantalon',
    title: 'Humpty Dumpty',
    subtitle: 'Pon el color de su pantalón',
    targetHex: '#c94b12',
  },
  {
    id: 'zhenya-vestido',
    title: 'Zhenya',
    subtitle: 'Pon el color de su vestido',
    targetHex: '#c02f25',
  },
  {
    id: 'porky-tambor',
    title: 'Porky',
    subtitle: 'Pon el color del tambor',
    targetHex: '#a0a59a',
  },
  {
    id: 'hunky-hocico',
    title: 'Hunky & Spunky',
    subtitle: 'Pon el color del hocico',
    targetHex: '#c47e68',
  },
  {
    id: 'robot-retro',
    title: 'Robot retro',
    subtitle: 'Pon el color de la visera',
    targetHex: '#5ad5e6',
  },
  {
    id: 'gato-astral',
    title: 'Gato astral',
    subtitle: 'Pon el color del collar',
    targetHex: '#f2c94c',
  },
  {
    id: 'monstruo-pizza',
    title: 'Monstruo pizza',
    subtitle: 'Pon el color de la barriga',
    targetHex: '#ff6d6d',
  },
  {
    id: 'cohete-color',
    title: 'Cohete color',
    subtitle: 'Pon el color de la ventanilla',
    targetHex: '#67d8e4',
  },
  {
    id: 'logo-rayo',
    title: 'Logo Rayo',
    subtitle: 'Pon el color de la franja',
    targetHex: '#fff0b2',
  },
] as const;

export type MatizChallengeId = (typeof MATIZ_CHALLENGES)[number]['id'];

export function matizChallengeById(id: string) {
  return MATIZ_CHALLENGES.find((challenge) => challenge.id === id) ?? MATIZ_CHALLENGES[0];
}
