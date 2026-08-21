// Tokens de color en JS. Contrato §8.1.
//
// Casi todo el color de la interfaz pasa por clases de Tailwind (bg-tinta,
// text-hueso...), generadas desde los custom properties de
// src/styles/globals.css. Pero un puñado de sitios NO aceptan una clase CSS y
// exigen un valor literal (p.ej. `viewport.themeColor` en layout.tsx, o un
// futuro <canvas>). Para esos casos, este fichero es la única fuente
// permitida de un literal #rrggbb: el resto de src/app y src/components tiene
// prohibido escribir uno a mano (lo hace cumplir una regla de ESLint).
//
// Debe reflejar EXACTAMENTE los valores de globals.css. Si cambian ahí,
// cambian aquí.
export const COLOR_TOKENS = {
  tinta: '#F2F4F8',
  veta: '#E8EDF5',
  mesa: '#FFFFFF',
  linea: '#D7DCE5',
  hueso: '#16181D',
  humo: '#697386',
  brasa: '#FF3B30',
  oro: '#007AFF',
  teja: '#FF6B61',
  azul: '#5AC8FA',
  verde: '#34C759',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;

/** Paleta propia de la cara/dorso de la carta (RondaCard). Ver globals.css. */
export const CARD_COLOR_TOKENS = {
  ink: '#1B1D2A',
  face: '#FBF1DA',
  oros: '#E3A93B',
  copas: '#E14B3B',
  espadas: '#3E7BC4',
  bastos: '#3C9068',
  backGold: '#F2C25A',
  backA: '#2B2140',
  backB: '#372A52',
} as const;

export type CardColorToken = keyof typeof CARD_COLOR_TOKENS;
