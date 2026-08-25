import type { GranRondaBoardSpace, GranRondaSpaceType } from '@ronda/protocol';

export const GRAN_RONDA_START_COINS = 5;
export const GRAN_RONDA_STAMP_COST = 8;
export const GRAN_RONDA_STAMP_MIN_COST = 6;
export const GRAN_RONDA_STAMP_MAX_COST = 12;
export const GRAN_RONDA_POWERUP_COSTS = {
  doubleRoll: 5,
  rivalPenalty: 4,
  goldDuel: 6,
} as const;

/**
 * Tablero de 26 posiciones. Una carretera principal recorre todo el jardín y
 * solo se abre en dos desvíos largos. Cada ramal cruza una zona completa del
 * mapa antes de volver a unirse, de modo que la elección se entiende como un
 * recorrido y no como una sucesión de cruces pequeños.
 */
export const GRAN_RONDA_BOARD: readonly GranRondaBoardSpace[] = [
  { id: 'salida', index: 0, label: 'Salida', type: 'start', nextIds: ['plaza-oros'], x: 8, y: 82 },
  {
    id: 'plaza-oros',
    index: 1,
    label: 'Plaza de Oros',
    type: 'oros',
    nextIds: ['paseo-azul', 'senda-bastos'],
    x: 18,
    y: 86,
  },
  {
    id: 'paseo-azul',
    index: 2,
    label: 'Puente del Jardín',
    type: 'atajo',
    nextIds: ['fuente-azul'],
    x: 28,
    y: 82,
  },
  {
    id: 'fuente-azul',
    index: 3,
    label: 'Fuente Azul',
    type: 'oros',
    nextIds: ['union-bastos'],
    x: 38,
    y: 75,
  },
  {
    id: 'union-bastos',
    index: 4,
    label: 'Unión de Bastos',
    type: 'evento',
    nextIds: ['plaza-copas'],
    x: 49,
    y: 70,
  },
  {
    id: 'senda-bastos',
    index: 5,
    label: 'Senda Sur',
    type: 'evento',
    nextIds: ['sendero-bastos'],
    x: 30,
    y: 93,
  },
  {
    id: 'sendero-bastos',
    index: 6,
    label: 'Dado Doble',
    type: 'doble',
    nextIds: ['mercado-bastos'],
    x: 45,
    y: 92,
  },
  {
    id: 'mercado-bastos',
    index: 7,
    label: 'Mercado de Bastos',
    type: 'oros',
    nextIds: ['camino-riesgo'],
    x: 59,
    y: 88,
  },
  {
    id: 'plaza-copas',
    index: 8,
    label: 'Plaza de Copas',
    type: 'sello',
    nextIds: ['paseo-sol'],
    x: 59,
    y: 63,
  },
  {
    id: 'paseo-sol',
    index: 9,
    label: 'Paseo del Sol',
    type: 'oros',
    nextIds: ['bifurcacion-azul'],
    x: 70,
    y: 65,
  },
  {
    id: 'bifurcacion-azul',
    index: 10,
    label: 'Cruce del Río',
    type: 'evento',
    nextIds: ['senda-dorada'],
    x: 80,
    y: 70,
  },
  {
    id: 'senda-dorada',
    index: 11,
    label: 'Senda Dorada',
    type: 'oros',
    nextIds: ['puente-comun'],
    x: 88,
    y: 61,
  },
  {
    id: 'camino-riesgo',
    index: 12,
    label: 'Camino del Río',
    type: 'oros',
    nextIds: ['bifurcacion-azul'],
    x: 70,
    y: 82,
  },
  {
    id: 'desvio-riesgo',
    index: 13,
    label: 'Claro Central',
    type: 'evento',
    nextIds: ['terraza-sello'],
    x: 43,
    y: 46,
  },
  {
    id: 'puente-comun',
    index: 14,
    label: 'Puente Común',
    type: 'sello',
    nextIds: ['mirador'],
    x: 90,
    y: 49,
  },
  {
    id: 'mirador',
    index: 15,
    label: 'Tienda del Mirador',
    type: 'tienda',
    nextIds: ['plaza-espadas'],
    x: 88,
    y: 37,
  },
  {
    id: 'plaza-espadas',
    index: 16,
    label: 'Plaza de Espadas',
    type: 'oros',
    nextIds: ['atajo-fuente', 'sendero-copas'],
    x: 79,
    y: 29,
  },
  {
    id: 'atajo-fuente',
    index: 17,
    label: 'Puente de la Fuente',
    type: 'atajo',
    nextIds: ['curva-bastos'],
    x: 68,
    y: 22,
  },
  {
    id: 'sendero-copas',
    index: 18,
    label: 'Sendero de Copas',
    type: 'evento',
    nextIds: ['fuente-sello'],
    x: 68,
    y: 36,
  },
  {
    id: 'fuente-sello',
    index: 19,
    label: 'Fuente del Sello',
    type: 'sello',
    nextIds: ['desvio-riesgo'],
    x: 56,
    y: 42,
  },
  {
    id: 'curva-bastos',
    index: 20,
    label: 'Cárcel del Jardín',
    type: 'perdida',
    nextIds: ['arco-copas'],
    x: 56,
    y: 18,
  },
  {
    id: 'arco-copas',
    index: 21,
    label: 'Penalización',
    type: 'penalizacion',
    nextIds: ['rincon-oros'],
    x: 44,
    y: 20,
  },
  {
    id: 'rincon-oros',
    index: 22,
    label: 'Rincón de Oros',
    type: 'oros',
    nextIds: ['terraza-sello'],
    x: 32,
    y: 27,
  },
  {
    id: 'terraza-sello',
    index: 23,
    label: 'Terraza del Sello',
    type: 'sello',
    nextIds: ['camino-vuelta'],
    x: 22,
    y: 36,
  },
  {
    id: 'camino-vuelta',
    index: 24,
    label: 'Tienda de Vuelta',
    type: 'tienda',
    nextIds: ['puerta-salida'],
    x: 14,
    y: 48,
  },
  {
    id: 'puerta-salida',
    index: 25,
    label: 'Puerta de Salida',
    type: 'evento',
    nextIds: ['salida'],
    x: 10,
    y: 64,
  },
];

/** Los dos puentes se conectan entre sí al caer en cualquiera de ellos. */
export const GRAN_RONDA_BRIDGE_PAIRS: Readonly<Record<string, string>> = {
  'paseo-azul': 'atajo-fuente',
  'atajo-fuente': 'paseo-azul',
};

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

export interface GranRondaDestinationPath {
  destinationId: string;
  path: string[];
}

/**
 * Calcula antes de mover todos los destinos exactos de una tirada. El jugador
 * elige dónde caerá, no la primera casilla del ramal. El recorrido es siempre
 * hacia delante y nunca ofrece la arista por la que llegó.
 */
export function granRondaDestinationPaths(
  board: readonly GranRondaBoardSpace[],
  spaceId: string,
  steps: number,
): GranRondaDestinationPath[] {
  if (!Number.isInteger(steps) || steps < 1 || !board.some((space) => space.id === spaceId)) {
    return [];
  }

  const completed: string[][] = [];
  const walk = (currentId: string, remaining: number, path: string[]): void => {
    if (remaining === 0) {
      completed.push(path);
      return;
    }
    for (const nextId of granRondaRouteOptions(board, currentId)) {
      walk(nextId, remaining - 1, [...path, nextId]);
    }
  };
  walk(spaceId, steps, [spaceId]);

  const unique = new Map<string, string[]>();
  for (const path of completed) {
    const destinationId = path[path.length - 1];
    if (destinationId && !unique.has(destinationId)) unique.set(destinationId, path);
  }
  return [...unique].map(([destinationId, path]) => ({ destinationId, path }));
}

export function granRondaBridgeDestination(spaceId: string): string | null {
  return GRAN_RONDA_BRIDGE_PAIRS[spaceId] ?? null;
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
