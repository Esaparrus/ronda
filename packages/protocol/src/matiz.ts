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
    id: 'pikachu-piel',
    title: 'Pikachu',
    subtitle: 'Pon el color de su piel',
    targetHex: '#fdd43c',
  },
  {
    id: 'homer-piel',
    title: 'Homer Simpson',
    subtitle: 'Pon el color de su piel',
    targetHex: '#ffcd18',
  },
  {
    id: 'bart-piel',
    title: 'Bart Simpson',
    subtitle: 'Pon el color de su piel',
    targetHex: '#f6d528',
  },
  {
    id: 'bob-cuerpo',
    title: 'Bob Esponja',
    subtitle: 'Pon el color de su cuerpo',
    targetHex: '#fef454',
  },
  {
    id: 'bulbasaur-piel',
    title: 'Bulbasaur',
    subtitle: 'Pon el color de su piel',
    targetHex: '#609f80',
  },
  {
    id: 'charmander-cuerpo',
    title: 'Charmander',
    subtitle: 'Pon el color de su cuerpo',
    targetHex: '#ed8239',
  },
  {
    id: 'squirtle-cuerpo',
    title: 'Squirtle',
    subtitle: 'Pon el color de su cuerpo',
    targetHex: '#70a8ba',
  },
  {
    id: 'eevee-pelo',
    title: 'Eevee',
    subtitle: 'Pon el color de su pelo',
    targetHex: '#c38d65',
  },
  {
    id: 'psyduck-cuerpo',
    title: 'Psyduck',
    subtitle: 'Pon el color de su cuerpo',
    targetHex: '#eebc41',
  },
] as const;

export type MatizChallengeId = (typeof MATIZ_CHALLENGES)[number]['id'];

export function matizChallengeById(id: string) {
  return MATIZ_CHALLENGES.find((challenge) => challenge.id === id) ?? MATIZ_CHALLENGES[0];
}
