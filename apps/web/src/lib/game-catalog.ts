import type { GameId } from '@ronda/protocol';

export interface GameCatalogEntry {
  readonly slug: GameId;
  readonly name: string;
  readonly players: string;
  readonly duration: string;
  readonly kind: string;
}

export type GameCategoryIcon = 'cards' | 'users' | 'sparkles';

export interface GameCategory {
  readonly slug: 'cartas' | 'otros' | 'gran-ronda';
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly icon: GameCategoryIcon;
  readonly gameSlugs: readonly GameId[];
}

export const GAME_CATALOG = [
  {
    slug: 'laronda',
    name: 'La Ronda',
    players: '2–8 jugadores',
    duration: '10–20 min',
    kind: 'Cartas y pique',
  },
  {
    slug: 'chinchon',
    name: 'Chinchón',
    players: '2–4 jugadores',
    duration: '15–30 min',
    kind: 'Cartas',
  },
  {
    slug: 'pocha',
    name: 'Pocha',
    players: '2–6 jugadores',
    duration: '20–45 min',
    kind: 'Bazas',
  },
  {
    slug: 'mus',
    name: 'Mus',
    players: '4 jugadores, por parejas',
    duration: '30–60 min',
    kind: 'Parejas',
  },
  {
    slug: 'brisca',
    name: 'Brisca',
    players: '2–4 jugadores',
    duration: '10–25 min',
    kind: 'Bazas',
  },
  {
    slug: 'escoba',
    name: 'Escoba',
    players: '2–4 jugadores',
    duration: '15–25 min',
    kind: 'Capturas',
  },
  {
    slug: 'sieteymedia',
    name: 'Siete y media',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Tentar la suerte',
  },
  {
    slug: 'tute',
    name: 'Tute',
    players: '2 jugadores',
    duration: '20–35 min',
    kind: 'Bazas',
  },
  {
    slug: 'cinquillo',
    name: 'Cinquillo',
    players: '2–6 jugadores',
    duration: '10–20 min',
    kind: 'Descarte',
  },
  {
    slug: 'orden',
    name: 'Orden',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Cooperativo',
  },
  {
    slug: 'colores',
    name: 'Colores',
    players: '2–7 jugadores',
    duration: '15–25 min',
    kind: 'Social',
  },
  {
    slug: 'mayoria',
    name: 'Mayoría',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Social',
  },
  {
    slug: 'escala',
    name: 'Escala',
    players: '2–7 jugadores',
    duration: '15–25 min',
    kind: 'Social',
  },
  {
    slug: 'musical',
    name: 'Musical',
    players: '1 solo · 2–8 en grupo',
    duration: '10–25 min',
    kind: 'Música',
  },
  {
    slug: 'matiz',
    name: 'Matiz',
    players: '1 solo · 2–7 en grupo',
    duration: '5–15 min',
    kind: 'Color y precisión',
  },
  {
    slug: 'preciojusto',
    name: 'Precio justo',
    players: '2–7 jugadores',
    duration: '10–25 min',
    kind: 'Estimación',
  },
  {
    slug: 'banderas',
    name: 'Banderas',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Quiz visual',
  },
  {
    slug: 'cifras',
    name: 'Cifras',
    players: '2–7 jugadores',
    duration: '10–25 min',
    kind: 'Estimación y orden',
  },
  {
    slug: 'quienloharia',
    name: 'Quién lo haría',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Social',
  },
  {
    slug: 'completalafrase',
    name: 'Completa la frase',
    players: '2–7 jugadores',
    duration: '10–20 min',
    kind: 'Palabras',
  },
  {
    slug: 'granronda',
    name: 'La Gran Ronda',
    players: '2–7 jugadores',
    duration: '15–25 min',
    kind: 'Tablero y minijuegos',
  },
] as const satisfies readonly GameCatalogEntry[];

export const GAME_CATEGORIES = [
  {
    slug: 'cartas',
    eyebrow: 'Baraja española',
    title: 'Cartas',
    description: 'Bazas, capturas y combinaciones con los clásicos de toda la vida.',
    icon: 'cards',
    gameSlugs: [
      'laronda',
      'chinchon',
      'pocha',
      'mus',
      'brisca',
      'escoba',
      'sieteymedia',
      'tute',
      'cinquillo',
    ],
  },
  {
    slug: 'otros',
    eyebrow: 'Para cambiar de ritmo',
    title: 'Otros juegos',
    description: 'Retos sociales, música, color, cultura y estimaciones para toda la mesa.',
    icon: 'sparkles',
    gameSlugs: [
      'orden',
      'colores',
      'mayoria',
      'escala',
      'musical',
      'matiz',
      'preciojusto',
      'banderas',
      'cifras',
      'quienloharia',
      'completalafrase',
    ],
  },
  {
    slug: 'gran-ronda',
    eyebrow: 'Partida completa',
    title: 'La Gran Ronda',
    description: 'Tablero, Oros, Sellos y minijuegos aleatorios en una sola partida.',
    icon: 'users',
    gameSlugs: ['granronda'],
  },
] as const satisfies readonly GameCategory[];

export const GAME_COUNT = GAME_CATALOG.length;

export function findGameCategory(slug: string): GameCategory | undefined {
  return GAME_CATEGORIES.find((category) => category.slug === slug);
}

export function getGamesForCategory(category: Pick<GameCategory, 'gameSlugs'>) {
  return GAME_CATALOG.filter((game) => category.gameSlugs.some((slug) => slug === game.slug));
}
