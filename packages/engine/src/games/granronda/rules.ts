import type { GranRondaBoardSpace, GranRondaSpaceType } from '@ronda/protocol';

export const GRAN_RONDA_START_COINS = 5;
export const GRAN_RONDA_STAMP_COST = 8;

/** Tablero inicial: una ruta circular con dos decisiones reales de camino. */
export const GRAN_RONDA_BOARD: readonly GranRondaBoardSpace[] = [
  { id: 'salida', index: 0, label: 'Salida', type: 'start', nextIds: ['plaza-oros'], x: 14, y: 84 },
  {
    id: 'plaza-oros',
    index: 1,
    label: 'Plaza de Oros',
    type: 'oros',
    nextIds: ['paseo-azul', 'senda-bastos'],
    x: 25,
    y: 84,
  },
  { id: 'paseo-azul', index: 2, label: 'Paseo Azul', type: 'atajo', nextIds: ['paseo-3'], x: 37, y: 84 },
  { id: 'senda-bastos', index: 3, label: 'Senda de Bastos', type: 'perdida', nextIds: ['paseo-3'], x: 25, y: 71 },
  { id: 'paseo-3', index: 4, label: 'Cruce de Copas', type: 'evento', nextIds: ['plaza-copas'], x: 37, y: 64 },
  { id: 'plaza-copas', index: 5, label: 'Plaza de Copas', type: 'sello', nextIds: ['paseo-5'], x: 49, y: 64 },
  { id: 'paseo-5', index: 6, label: 'Paseo del Sol', type: 'oros', nextIds: ['bifurcacion'], x: 61, y: 64 },
  {
    id: 'bifurcacion',
    index: 7,
    label: 'Bifurcación',
    type: 'evento',
    nextIds: ['senda-oro', 'senda-riesgo'],
    x: 73,
    y: 64,
  },
  { id: 'senda-oro', index: 8, label: 'Senda Dorada', type: 'oros', nextIds: ['union'], x: 83, y: 53 },
  { id: 'senda-riesgo', index: 9, label: 'Senda de Riesgo', type: 'perdida', nextIds: ['union'], x: 83, y: 75 },
  { id: 'union', index: 10, label: 'Puente Común', type: 'sello', nextIds: ['paseo-10'], x: 91, y: 64 },
  { id: 'paseo-10', index: 11, label: 'Mirador', type: 'evento', nextIds: ['plaza-espadas'], x: 91, y: 50 },
  { id: 'plaza-espadas', index: 12, label: 'Plaza de Espadas', type: 'oros', nextIds: ['atajo-1'], x: 81, y: 42 },
  { id: 'atajo-1', index: 13, label: 'Atajo de la Fuente', type: 'atajo', nextIds: ['atajo-2'], x: 69, y: 42 },
  { id: 'atajo-2', index: 14, label: 'Fuente del Sello', type: 'sello', nextIds: ['paseo-15'], x: 57, y: 42 },
  { id: 'paseo-15', index: 15, label: 'Curva de Bastos', type: 'perdida', nextIds: ['paseo-16'], x: 45, y: 42 },
  { id: 'paseo-16', index: 16, label: 'Arco de Copas', type: 'evento', nextIds: ['paseo-17'], x: 33, y: 42 },
  { id: 'paseo-17', index: 17, label: 'Rincón de Oros', type: 'oros', nextIds: ['paseo-18'], x: 21, y: 42 },
  { id: 'paseo-18', index: 18, label: 'Terraza del Sello', type: 'sello', nextIds: ['paseo-19'], x: 12, y: 53 },
  { id: 'paseo-19', index: 19, label: 'Camino de Vuelta', type: 'evento', nextIds: ['salida'], x: 12, y: 68 },
];

export const GRAN_RONDA_STAMP_TARGETS = ['plaza-copas', 'union', 'atajo-2', 'paseo-18'] as const;

export function granRondaSpaceById(id: string): GranRondaBoardSpace | undefined {
  return GRAN_RONDA_BOARD.find((space) => space.id === id);
}

export function granRondaSpaceLabel(type: GranRondaSpaceType): string {
  switch (type) {
    case 'oros':
      return 'Oros';
    case 'perdida':
      return 'Pérdida';
    case 'sello':
      return 'Sello';
    case 'evento':
      return 'Evento';
    case 'atajo':
      return 'Atajo';
    case 'start':
      return 'Salida';
  }
}
