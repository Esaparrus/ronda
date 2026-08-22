import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const catalogFile = path.join(
  repositoryRoot,
  'packages/engine/src/games/preciojusto/offline-catalog.ts',
);
const imageDirectory = path.join(
  repositoryRoot,
  'apps/web/public/games/preciojusto/catalog',
);
const capturedAt = process.env.PRECIO_JUSTO_CAPTURED_AT ?? '2026-08-22';
const sourceEndpoint = 'https://dummyjson.com/products?limit=100&skip=0';
const fetcher = globalThis.fetch;

if (!fetcher) throw new Error('Este script necesita Node.js con fetch global disponible');

const categoryLabels = {
  beauty: 'Belleza',
  fragrances: 'Perfumería',
  furniture: 'Muebles',
  groceries: 'Alimentación',
  'home-decoration': 'Decoración',
  'kitchen-accessories': 'Accesorios de cocina',
  laptops: 'Ordenadores portátiles',
  'mens-shirts': 'Moda masculina',
  'mens-shoes': 'Calzado deportivo',
  'mens-watches': 'Relojería',
  'mobile-accessories': 'Accesorios para móvil',
};

function gameCategory(product) {
  switch (product.category) {
    case 'beauty':
    case 'fragrances':
      return 'curiosos';
    case 'furniture':
    case 'home-decoration':
    case 'kitchen-accessories':
      return 'hogar';
    case 'laptops':
    case 'mobile-accessories':
      return 'tecnologia';
    case 'mens-shirts':
      return 'accesorios';
    case 'mens-shoes':
      return 'deporte';
    case 'mens-watches':
      return 'precio-medio';
    case 'groceries':
      return /ice cream|juice|soft drinks|coffee/i.test(product.title)
        ? 'ocio'
        : 'baratos';
    default:
      return 'ocio';
  }
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function downloadImage(url, destination) {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => consume()));
  return results;
}

const response = await fetcher(sourceEndpoint);
if (!response.ok) {
  throw new Error(`No se pudo obtener el catálogo: HTTP ${response.status}`);
}

const payload = await response.json();
if (!Array.isArray(payload.products) || payload.products.length < 100) {
  throw new Error(`El catálogo recibido no contiene 100 productos (${payload.products?.length ?? 0})`);
}

await mkdir(imageDirectory, { recursive: true });

const records = await mapWithConcurrency(payload.products.slice(0, 100), 8, async (product) => {
  const slug = `${String(product.id).padStart(3, '0')}-${slugify(product.title)}`;
  const imagePath = path.join(imageDirectory, `${slug}.webp`);
  const imageUrl = product.images?.[0] ?? product.thumbnail;
  if (!imageUrl) throw new Error(`El producto ${product.id} no tiene imagen`);

  await downloadImage(imageUrl, imagePath);

  return {
    id: `offline-${product.id}`,
    title: product.title,
    image: `/games/preciojusto/catalog/${slug}.webp`,
    asin: null,
    detailPageUrl: `https://dummyjson.com/products/${product.id}`,
    category: gameCategory(product),
    brandModel: product.brand ?? null,
    variant: `${product.brand ? `${product.brand} · ` : ''}${categoryLabels[product.category] ?? product.category} · referencia offline`,
    marketplace: 'Catálogo local',
    currency: 'EUR',
    referencePriceCents: Math.max(1, Math.round(Number(product.price) * 100)),
    seller: product.brand ?? 'Referencia de catálogo',
    conditions: 'Precio de referencia · catálogo offline · sin envío ni cupones',
    source: `DummyJSON · catálogo público (${sourceEndpoint})`,
    capturedAt,
  };
});

const source = `import type { PriceQuestion } from './content.ts';

/**
 * Catálogo offline generado una vez para que Precio justo funcione sin API ni
 * credenciales. Las imágenes viven en apps/web/public y el precio queda
 * congelado dentro de cada pregunta.
 */
export const OFFLINE_PRICE_QUESTIONS = ${JSON.stringify(records, null, 2)} as const satisfies readonly PriceQuestion[];
`;

await writeFile(catalogFile, source, 'utf8');
console.log(`Catálogo generado: ${records.length} productos`);
console.log(`Imágenes guardadas en: ${path.relative(repositoryRoot, imageDirectory)}`);
console.log(`Fuente de datos: ${sourceEndpoint}`);
