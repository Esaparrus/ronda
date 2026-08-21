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

/** Valores que necesitan un literal porque Matiz pinta muestras dinámicas. */
export const MATIZ_COLOR_TOKENS = {
  neutral: '#8D929E',
  placeholder: '#D8D5CD',
} as const;

/** Colores técnicos usados por el preparador y las máscaras de Matiz. */
export const MATIZ_TOOL_TOKENS = {
  maskWhite: '#FFFFFF',
  chromaKey: '#00FF00',
} as const;

export const MATIZ_HUE_GRADIENT =
  'linear-gradient(90deg,#EF4444 0%,#F59E0B 17%,#EAB308 33%,#22C55E 50%,#06B6D4 67%,#3B82F6 83%,#EF4444 100%)';

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
