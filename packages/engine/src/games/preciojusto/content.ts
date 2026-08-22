import type { PriceCategory } from '@ronda/protocol';
import { OFFLINE_PRICE_QUESTIONS } from './offline-catalog.ts';

export type PrecioJustoQuestionCategory = Exclude<PriceCategory, 'todo'>;

/**
 * Registro editorial de una pregunta. Los importes están congelados y son
 * parte de la pregunta, no una consulta de precio durante la partida.
 */
export interface PriceQuestion {
  id: string;
  title: string;
  image: string;
  asin: string | null;
  detailPageUrl: string | null;
  category: PrecioJustoQuestionCategory;
  brandModel: string | null;
  variant: string;
  marketplace: string;
  currency: 'EUR';
  referencePriceCents: number;
  seller: string;
  conditions: string;
  source: string;
  capturedAt: string;
}

const CATALOGUE_SOURCE = 'Catálogo curado de Ronda';
const CATALOGUE_DATE = '2026-08-01';
const MARKETPLACE = 'Ronda España';
const CONDITIONS = 'IVA incluido · sin envío ni cupones';

function question(
  value: Omit<
    PriceQuestion,
    | 'currency'
    | 'marketplace'
    | 'seller'
    | 'conditions'
    | 'source'
    | 'capturedAt'
    | 'asin'
    | 'detailPageUrl'
  >,
): PriceQuestion {
  return {
    ...value,
    asin: null,
    detailPageUrl: null,
    currency: 'EUR',
    marketplace: MARKETPLACE,
    seller: 'Referencia catalogada',
    conditions: CONDITIONS,
    source: CATALOGUE_SOURCE,
    capturedAt: CATALOGUE_DATE,
  };
}

/** Catálogo inicial pequeño, propio y reproducible para el primer playtest. */
const LEGACY_PRICE_QUESTIONS: readonly PriceQuestion[] = [
  question({
    id: 'freidora-compacta',
    title: 'Freidora de aire compacta',
    image: '/games/preciojusto/freidora-compacta.svg',
    category: 'hogar',
    brandModel: null,
    variant: '3,5 litros · color crema',
    referencePriceCents: 4999,
  }),
  question({
    id: 'cafetera-manual',
    title: 'Cafetera italiana manual',
    image: '/games/preciojusto/cafetera-manual.svg',
    category: 'hogar',
    brandModel: null,
    variant: '6 tazas · aluminio',
    referencePriceCents: 1899,
  }),
  question({
    id: 'lampara-arco',
    title: 'Lámpara de mesa de arco',
    image: '/games/preciojusto/lampara-arco.svg',
    category: 'hogar',
    brandModel: null,
    variant: 'Pantalla textil · luz cálida',
    referencePriceCents: 3499,
  }),
  question({
    id: 'auriculares-nube',
    title: 'Auriculares inalámbricos',
    image: '/games/preciojusto/auriculares-nube.svg',
    category: 'tecnologia',
    brandModel: null,
    variant: 'Cancelación pasiva · estuche USB-C',
    referencePriceCents: 2799,
  }),
  question({
    id: 'powerbank-compacta',
    title: 'Batería externa compacta',
    image: '/games/preciojusto/powerbank-compacta.svg',
    category: 'tecnologia',
    brandModel: null,
    variant: '10.000 mAh · 20 W',
    referencePriceCents: 2299,
  }),
  question({
    id: 'juego-ruta',
    title: 'Juego de cartas Ruta',
    image: '/games/preciojusto/juego-ruta.svg',
    category: 'ocio',
    brandModel: 'Ronda Studio',
    variant: 'Juego base · 2–5 jugadores',
    referencePriceCents: 2499,
  }),
  question({
    id: 'mochila-urbana',
    title: 'Mochila urbana enrollable',
    image: '/games/preciojusto/mochila-urbana.svg',
    category: 'accesorios',
    brandModel: null,
    variant: '20 litros · tejido reciclado',
    referencePriceCents: 4299,
  }),
  question({
    id: 'botella-termica',
    title: 'Botella térmica',
    image: '/games/preciojusto/botella-termica.svg',
    category: 'deporte',
    brandModel: null,
    variant: '500 ml · acero inoxidable',
    referencePriceCents: 1599,
  }),
  question({
    id: 'zapatillas-paseo',
    title: 'Zapatillas de paseo',
    image: '/games/preciojusto/zapatillas-paseo.svg',
    category: 'deporte',
    brandModel: null,
    variant: 'Adulto · color azul marino',
    referencePriceCents: 5999,
  }),
  question({
    id: 'aspirador-mini',
    title: 'Aspirador de sobremesa',
    image: '/games/preciojusto/aspirador-mini.svg',
    category: 'curiosos',
    brandModel: null,
    variant: 'Recargable · filtro lavable',
    referencePriceCents: 1299,
  }),
  question({
    id: 'paraguas-burbujas',
    title: 'Paraguas burbuja transparente',
    image: '/games/preciojusto/paraguas-burbujas.svg',
    category: 'curiosos',
    brandModel: null,
    variant: 'Apertura automática · mango curvo',
    referencePriceCents: 1699,
  }),
  question({
    id: 'kit-badminton',
    title: 'Kit de bádminton para dos',
    image: '/games/preciojusto/badminton.svg',
    category: 'baratos',
    brandModel: null,
    variant: '2 raquetas · 3 volantes · bolsa',
    referencePriceCents: 2199,
  }),
  question({
    id: 'proyector-mini',
    title: 'Proyector mini para sobremesa',
    image: '/games/preciojusto/proyector-mini.svg',
    category: 'precio-medio',
    brandModel: null,
    variant: 'Full HD · altavoz integrado',
    referencePriceCents: 7999,
  }),
];

/** Catálogo que usa el juego: 100 productos locales, con el pequeño catálogo como respaldo. */
export const PRICE_QUESTIONS: readonly PriceQuestion[] =
  OFFLINE_PRICE_QUESTIONS.length > 0 ? OFFLINE_PRICE_QUESTIONS : LEGACY_PRICE_QUESTIONS;

const QUESTIONS_BY_ID = new Map(PRICE_QUESTIONS.map((item) => [item.id, item]));

export function priceQuestionById(
  id: string,
  questions: readonly PriceQuestion[] = PRICE_QUESTIONS,
): PriceQuestion {
  const item = questions === PRICE_QUESTIONS ? QUESTIONS_BY_ID.get(id) : questions.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Pregunta de Precio justo desconocida: ${id}`);
  return item;
}

export function priceQuestionIdsFor(
  category: PriceCategory = 'todo',
  questions: readonly PriceQuestion[] = PRICE_QUESTIONS,
): string[] {
  return questions
    .filter((item) => category === 'todo' || item.category === category)
    .map((item) => item.id);
}
