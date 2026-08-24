import type { GranRondaBoardSpace, GranRondaSpaceType } from '@ronda/protocol';

export const GRAN_RONDA_START_COINS = 5;
export const GRAN_RONDA_STAMP_COST = 8;
export const GRAN_RONDA_POWERUP_COSTS = {
  doubleRoll: 5,
  rivalPenalty: 4,
} as const;

/**
 * Tablero de 26 posiciones. La ruta principal rodea el paño y las tres
 * bifurcaciones tienen alternativas con distinta longitud y recompensa:
 * el camino corto adelanta, el largo ofrece más casillas de Oros pero también
 * más riesgo. La salida es la única posición sin elección.
 */
export const GRAN_RONDA_BOARD: readonly GranRondaBoardSpace[] = [
  { id: 'salida', index: 0, label: 'Salida', type: 'start', nextIds: ['plaza-oros'], x: 10, y: 88 },
  {
    id: 'plaza-oros',
    index: 1,
    label: 'Plaza de Oros',
    type: 'oros',
    nextIds: ['paseo-azul', 'senda-bastos'],
    x: 21,
    y: 88,
  },
  { id: 'paseo-azul', index: 2, label: 'Paseo Azul', type: 'atajo', nextIds: ['fuente-azul'], x: 31, y: 84 },
  { id: 'fuente-azul', index: 3, label: 'Fuente Azul', type: 'oros', nextIds: ['union-bastos'], x: 39, y: 76 },
  { id: 'union-bastos', index: 4, label: 'Unión de Bastos', type: 'evento', nextIds: ['plaza-copas'], x: 48, y: 76 },
  { id: 'senda-bastos', index: 5, label: 'Senda de Bastos', type: 'perdida', nextIds: ['sendero-bastos'], x: 30, y: 95 },
  { id: 'sendero-bastos', index: 6, label: 'Dado Doble', type: 'doble', nextIds: ['mercado-bastos'], x: 39, y: 91 },
  { id: 'mercado-bastos', index: 7, label: 'Mercado de Bastos', type: 'oros', nextIds: ['union-bastos'], x: 46, y: 84 },
  { id: 'plaza-copas', index: 8, label: 'Plaza de Copas', type: 'sello', nextIds: ['paseo-sol'], x: 57, y: 68 },
  { id: 'paseo-sol', index: 9, label: 'Paseo del Sol', type: 'oros', nextIds: ['bifurcacion-azul'], x: 67, y: 68 },
  {
    id: 'bifurcacion-azul',
    index: 10,
    label: 'Bifurcación Azul',
    type: 'evento',
    nextIds: ['senda-dorada', 'camino-riesgo'],
    x: 76,
    y: 68,
  },
  { id: 'senda-dorada', index: 11, label: 'Senda Dorada', type: 'oros', nextIds: ['puente-comun'], x: 83, y: 57 },
  { id: 'camino-riesgo', index: 12, label: 'Camino de Riesgo', type: 'perdida', nextIds: ['desvio-riesgo'], x: 83, y: 78 },
  { id: 'desvio-riesgo', index: 13, label: 'Desvío de Riesgo', type: 'evento', nextIds: ['puente-comun'], x: 75, y: 88 },
  { id: 'puente-comun', index: 14, label: 'Puente Común', type: 'sello', nextIds: ['mirador'], x: 89, y: 47 },
  { id: 'mirador', index: 15, label: 'Tienda del Mirador', type: 'tienda', nextIds: ['plaza-espadas'], x: 88, y: 36 },
  { id: 'plaza-espadas', index: 16, label: 'Plaza de Espadas', type: 'oros', nextIds: ['atajo-fuente', 'sendero-copas'], x: 78, y: 29 },
  { id: 'atajo-fuente', index: 17, label: 'Atajo de la Fuente', type: 'atajo', nextIds: ['curva-bastos'], x: 66, y: 30 },
  { id: 'sendero-copas', index: 18, label: 'Sendero de Copas', type: 'evento', nextIds: ['fuente-sello'], x: 68, y: 18 },
  { id: 'fuente-sello', index: 19, label: 'Fuente del Sello', type: 'sello', nextIds: ['curva-bastos'], x: 56, y: 18 },
  { id: 'curva-bastos', index: 20, label: 'Curva de Bastos', type: 'perdida', nextIds: ['arco-copas'], x: 45, y: 29 },
  { id: 'arco-copas', index: 21, label: 'Penalización', type: 'penalizacion', nextIds: ['rincon-oros'], x: 34, y: 29 },
  { id: 'rincon-oros', index: 22, label: 'Rincón de Oros', type: 'oros', nextIds: ['terraza-sello'], x: 23, y: 29 },
  { id: 'terraza-sello', index: 23, label: 'Terraza del Sello', type: 'sello', nextIds: ['camino-vuelta'], x: 13, y: 39 },
  { id: 'camino-vuelta', index: 24, label: 'Tienda de Vuelta', type: 'tienda', nextIds: ['puerta-salida'], x: 11, y: 57 },
  { id: 'puerta-salida', index: 25, label: 'Puerta de Salida', type: 'atajo', nextIds: ['salida'], x: 10, y: 73 },
];

export const GRAN_RONDA_STAMP_TARGETS = ['plaza-copas', 'puente-comun', 'fuente-sello', 'terraza-sello'] as const;

export function granRondaSpaceById(id: string): GranRondaBoardSpace | undefined {
  return GRAN_RONDA_BOARD.find((space) => space.id === id);
}

/**
 * El mapa se dibuja con una dirección base, pero las decisiones se toman en
 * un grafo sin dirección. La salida mantiene una única salida y la primera
 * bifurcación no permite volver inmediatamente al inicio.
 */
export function granRondaRouteOptions(
  board: readonly GranRondaBoardSpace[],
  spaceId: string,
): string[] {
  const current = board.find((space) => space.id === spaceId);
  if (!current) return [];
  if (current.id === 'salida' || current.id === 'plaza-oros') return [...current.nextIds];

  const incoming = board
    .filter((space) => space.nextIds.includes(spaceId))
    .map((space) => space.id);
  return [...new Set([...current.nextIds, ...incoming])];
}

export function granRondaMovementOptions(
  board: readonly GranRondaBoardSpace[],
  spaceId: string,
  path: readonly string[],
): string[] {
  const previousSpaceId = path.length > 1 ? path[path.length - 2] : undefined;
  return granRondaRouteOptions(board, spaceId).filter((candidate) => candidate !== previousSpaceId);
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
    case 'start':
      return 'Salida';
  }
}
