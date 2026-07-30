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
  tinta: '#14161F',
  mesa: '#1E2130',
  linea: '#2E3346',
  hueso: '#EDE6D8',
  humo: '#9AA0B5',
  brasa: '#D4462F',
  oro: '#C79A3B',
  azul: '#3E6EA8',
  verde: '#2F6F5E',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;
