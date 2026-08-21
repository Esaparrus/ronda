/** Retos incluidos en el MVP de Matiz.
 *
 * El color correcto vive en el contrato compartido para que el motor pueda
 * puntuar de forma determinista. La interfaz no lo muestra hasta revelar la
 * ronda; añadir nuevos dibujos consiste en ampliar esta lista y su asset web.
 */
export const MATIZ_CHALLENGES = [
  {
    id: 'popeye-camiseta',
    title: 'Popeye',
    subtitle: 'Devuelve el rojo de su camiseta',
    targetHex: '#ef4b52',
  },
  {
    id: 'felix-silueta',
    title: 'Félix el Gato',
    subtitle: 'Completa el negro de su silueta',
    targetHex: '#111111',
  },
  {
    id: 'krazy-ladrillo',
    title: 'Krazy Kat',
    subtitle: 'Acierta con el color del ladrillo',
    targetHex: '#d9653f',
  },
  {
    id: 'little-nemo-carrete',
    title: 'Little Nemo',
    subtitle: 'Devuelve el amarillo del carrete',
    targetHex: '#edc64a',
  },
  {
    id: 'sol-de-verano',
    title: 'El cartero solar',
    subtitle: 'Devuelve el color de su visera',
    targetHex: '#f4c542',
  },
  {
    id: 'gato-luna',
    title: 'La gata de la luna',
    subtitle: 'Completa el color de su jersey',
    targetHex: '#de6b4e',
  },
  {
    id: 'monstruo-fruta',
    title: 'El monstruo de fruta',
    subtitle: 'Acierta con el color de su barriga',
    targetHex: '#62b866',
  },
] as const;

export type MatizChallengeId = (typeof MATIZ_CHALLENGES)[number]['id'];

export function matizChallengeById(id: string) {
  return MATIZ_CHALLENGES.find((challenge) => challenge.id === id) ?? MATIZ_CHALLENGES[0];
}
