import type { GranRondaBoardSpace, GranRondaSpaceType } from '@ronda/protocol';

export const GRAN_RONDA_START_COINS = 5;
export const GRAN_RONDA_STAMP_COST = 8;
export const GRAN_RONDA_POWERUP_COSTS = {
  doubleRoll: 5,
  rivalPenalty: 4,
} as const;

/**
 * Tablero de 26 posiciones. La ruta principal rodea el paño y las tres
 * bifurcaciones equilibran distancia y recompensa: el camino corto avanza más,
 * mientras que el largo ofrece una casilla o poder adicional. Ninguna elección
 * enfrenta un premio inmediato con un castigo inmediato.
 */
export const GRAN_RONDA_BOARD: readonly GranRondaBoardSpace[] = [
  { id: 'salida', index: 0, label: 'Salida', type: 'start', nextIds: ['plaza-oros'], x: 9, y: 86 },
  {
    id: 'plaza-oros',
    index: 1,
    label: 'Plaza de Oros',
    type: 'oros',
    nextIds: ['paseo-azul', 'senda-bastos'],
    x: 20,
    y: 83,
  },
  {
    id: 'paseo-azul',
    index: 2,
    label: 'Paseo Azul',
    type: 'atajo',
    nextIds: ['fuente-azul'],
    x: 29,
    y: 77,
  },
  {
    id: 'fuente-azul',
    index: 3,
    label: 'Fuente Azul',
    type: 'oros',
    nextIds: ['union-bastos'],
    x: 38,
    y: 71,
  },
  {
    id: 'union-bastos',
    index: 4,
    label: 'Unión de Bastos',
    type: 'evento',
    nextIds: ['plaza-copas'],
    x: 47,
    y: 68,
  },
  {
    id: 'senda-bastos',
    index: 5,
    label: 'Senda de Bastos',
    type: 'evento',
    nextIds: ['sendero-bastos'],
    x: 25,
    y: 91,
  },
  {
    id: 'sendero-bastos',
    index: 6,
    label: 'Dado Doble',
    type: 'doble',
    nextIds: ['mercado-bastos'],
    x: 36,
    y: 91,
  },
  {
    id: 'mercado-bastos',
    index: 7,
    label: 'Mercado de Bastos',
    type: 'oros',
    nextIds: ['union-bastos'],
    x: 44,
    y: 82,
  },
  {
    id: 'plaza-copas',
    index: 8,
    label: 'Plaza de Copas',
    type: 'sello',
    nextIds: ['paseo-sol'],
    x: 56,
    y: 63,
  },
  {
    id: 'paseo-sol',
    index: 9,
    label: 'Paseo del Sol',
    type: 'oros',
    nextIds: ['bifurcacion-azul'],
    x: 65,
    y: 61,
  },
  {
    id: 'bifurcacion-azul',
    index: 10,
    label: 'Bifurcación Azul',
    type: 'evento',
    nextIds: ['senda-dorada', 'camino-riesgo'],
    x: 73,
    y: 62,
  },
  {
    id: 'senda-dorada',
    index: 11,
    label: 'Senda Dorada',
    type: 'oros',
    nextIds: ['puente-comun'],
    x: 80,
    y: 55,
  },
  {
    id: 'camino-riesgo',
    index: 12,
    label: 'Camino del Río',
    type: 'oros',
    nextIds: ['desvio-riesgo'],
    x: 77,
    y: 72,
  },
  {
    id: 'desvio-riesgo',
    index: 13,
    label: 'Mirador del Río',
    type: 'evento',
    nextIds: ['puente-comun'],
    x: 86,
    y: 67,
  },
  {
    id: 'puente-comun',
    index: 14,
    label: 'Puente Común',
    type: 'sello',
    nextIds: ['mirador'],
    x: 87,
    y: 47,
  },
  {
    id: 'mirador',
    index: 15,
    label: 'Tienda del Mirador',
    type: 'tienda',
    nextIds: ['plaza-espadas'],
    x: 86,
    y: 38,
  },
  {
    id: 'plaza-espadas',
    index: 16,
    label: 'Plaza de Espadas',
    type: 'oros',
    nextIds: ['atajo-fuente', 'sendero-copas'],
    x: 80,
    y: 31,
  },
  {
    id: 'atajo-fuente',
    index: 17,
    label: 'Atajo de la Fuente',
    type: 'atajo',
    nextIds: ['curva-bastos'],
    x: 70,
    y: 29,
  },
  {
    id: 'sendero-copas',
    index: 18,
    label: 'Sendero de Copas',
    type: 'evento',
    nextIds: ['fuente-sello'],
    x: 70,
    y: 19,
  },
  {
    id: 'fuente-sello',
    index: 19,
    label: 'Fuente del Sello',
    type: 'sello',
    nextIds: ['curva-bastos'],
    x: 58,
    y: 18,
  },
  {
    id: 'curva-bastos',
    index: 20,
    label: 'Curva de Bastos',
    type: 'perdida',
    nextIds: ['arco-copas'],
    x: 48,
    y: 29,
  },
  {
    id: 'arco-copas',
    index: 21,
    label: 'Penalización',
    type: 'penalizacion',
    nextIds: ['rincon-oros'],
    x: 38,
    y: 29,
  },
  {
    id: 'rincon-oros',
    index: 22,
    label: 'Rincón de Oros',
    type: 'oros',
    nextIds: ['terraza-sello'],
    x: 28,
    y: 30,
  },
  {
    id: 'terraza-sello',
    index: 23,
    label: 'Terraza del Sello',
    type: 'sello',
    nextIds: ['camino-vuelta'],
    x: 19,
    y: 37,
  },
  {
    id: 'camino-vuelta',
    index: 24,
    label: 'Tienda de Vuelta',
    type: 'tienda',
    nextIds: ['puerta-salida'],
    x: 14,
    y: 49,
  },
  {
    id: 'puerta-salida',
    index: 25,
    label: 'Puerta de Salida',
    type: 'atajo',
    nextIds: ['salida'],
    x: 11,
    y: 65,
  },
];

export const GRAN_RONDA_STAMP_TARGETS = [
  'plaza-copas',
  'puente-comun',
  'fuente-sello',
  'terraza-sello',
] as const;

/** Casillas positivas que el monstruo puede convertir temporalmente en trampa. */
export const GRAN_RONDA_TRAP_TARGETS = GRAN_RONDA_BOARD.filter(
  (space) => space.type === 'oros' || space.type === 'evento' || space.type === 'atajo',
).map((space) => space.id);

export function granRondaSpaceById(id: string): GranRondaBoardSpace | undefined {
  return GRAN_RONDA_BOARD.find((space) => space.id === id);
}

/**
 * El recorrido es dirigido: en una bifurcación solo se ofrecen las salidas que
 * continúan la vuelta. Las aristas entrantes nunca permiten desandar el camino.
 */
export function granRondaRouteOptions(
  board: readonly GranRondaBoardSpace[],
  spaceId: string,
): string[] {
  const current = board.find((space) => space.id === spaceId);
  if (!current) return [];
  return [...current.nextIds];
}

export function granRondaMovementOptions(
  board: readonly GranRondaBoardSpace[],
  spaceId: string,
  _path: readonly string[],
): string[] {
  return granRondaRouteOptions(board, spaceId);
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
    case 'doble':
      return 'Dado doble';
    case 'penalizacion':
      return 'Penalización';
    case 'tienda':
      return 'Tienda';
    case 'trampa':
      return 'Trampa';
    case 'start':
      return 'Salida';
  }
}
