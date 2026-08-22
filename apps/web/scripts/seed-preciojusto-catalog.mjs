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
const dummyJsonLimit = 194;
const sourceEndpoint = `https://dummyjson.com/products?limit=${dummyJsonLimit}&skip=0`;
const fakeStoreEndpoint = 'https://fakestoreapi.com/products';
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
  'sports-accessories': 'Accesorios deportivos',
  smartphones: 'Smartphones',
  tablets: 'Tabletas',
  vehicle: 'Automóviles',
  motorcycle: 'Motocicletas',
  'skin-care': 'Cuidado personal',
  'womens-dresses': 'Moda femenina',
  'womens-bags': 'Bolsos',
  'womens-shoes': 'Calzado femenino',
  'womens-watches': 'Relojería femenina',
  'womens-jewellery': 'Joyería',
  tops: 'Moda',
  sunglasses: 'Gafas de sol',
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
    case 'smartphones':
    case 'tablets':
      return 'tecnologia';
    case 'mens-shirts':
      return 'accesorios';
    case 'mens-shoes':
    case 'sports-accessories':
      return 'deporte';
    case 'vehicle':
    case 'motorcycle':
      return 'precio-medio';
    case 'womens-dresses':
    case 'womens-bags':
    case 'womens-shoes':
    case 'womens-watches':
    case 'womens-jewellery':
    case 'tops':
    case 'sunglasses':
      return 'accesorios';
    case 'skin-care':
      return 'curiosos';
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

function fakeStoreGameCategory(product) {
  switch (product.category) {
    case 'electronics':
      return 'tecnologia';
    case 'jewelery':
    case "men's clothing":
    case "women's clothing":
      return 'accesorios';
    default:
      return 'ocio';
  }
}

function fakeStoreCategoryLabel(category) {
  switch (category) {
    case 'electronics':
      return 'Electrónica';
    case 'jewelery':
      return 'Joyería';
    case "men's clothing":
      return 'Moda masculina';
    case "women's clothing":
      return 'Moda femenina';
    default:
      return 'Producto variado';
  }
}

/** Artículos ficticios/editoriales para dar variedad y humor al playtest. */
const extraProducts = [
  {
    id: 'humor-001',
    title: 'Tanga de leopardo talla única',
    description: 'Prenda de broma para entrar en una fiesta como si fueras el protagonista.',
    brand: 'Moda Inconsciente',
    category: 'curiosos',
    categoryLabel: 'Ropa interior',
    price: 7.99,
    emoji: '🩲',
  },
  {
    id: 'humor-002',
    title: 'Pack de 12 preservativos sabor menta',
    description: 'Pack humorístico de protección personal para una noche con demasiadas expectativas.',
    brand: 'Safe & Fun',
    category: 'curiosos',
    categoryLabel: 'Cuidado personal',
    price: 8.99,
    emoji: '🎈',
  },
  {
    id: 'humor-003',
    title: 'Curso guiado para gente que se pierde',
    description: 'Cuatro horas de orientación práctica para no acabar siempre en el bar equivocado.',
    brand: 'Aula del GPS',
    category: 'ocio',
    categoryLabel: 'Curso presencial',
    price: 49.99,
    emoji: '🧭',
  },
  {
    id: 'humor-004',
    title: 'Cuota mensual del gimnasio del barrio',
    description: 'Acceso ilimitado a pesas, cintas y conversaciones sobre empezar el lunes.',
    brand: 'Gimnasio La Repetición',
    category: 'deporte',
    categoryLabel: 'Suscripción mensual',
    price: 29.99,
    emoji: '🏋️',
  },
  {
    id: 'humor-005',
    title: 'Coche urbano de segunda mano',
    description: 'Utilitario compacto con más historias que kilómetros y una radio que funciona a veces.',
    brand: 'Motor de Barrio',
    category: 'precio-medio',
    categoryLabel: 'Automóvil',
    price: 6800,
    emoji: '🚗',
  },
  {
    id: 'humor-006',
    title: 'Gramo de polvo blanco de atrezo (no real)',
    description: 'Objeto de utilería para una película de sobremesa; no es una sustancia real ni consumible.',
    brand: 'Cine de Cartón',
    category: 'curiosos',
    categoryLabel: 'Utilería de ficción',
    price: 3.5,
    emoji: '🎬',
  },
  {
    id: 'humor-007',
    title: 'Curso online de tortilla de patata',
    description: 'Lecciones paso a paso para discutir cebolla sí o cebolla no con argumentos.',
    brand: 'Academia La Sartén',
    category: 'ocio',
    categoryLabel: 'Curso online',
    price: 19.99,
    emoji: '🍳',
  },
  {
    id: 'humor-008',
    title: 'Curso de guitarra para gente sin guitarra',
    description: 'Aprende acordes imaginarios y practica el solo sin molestar a los vecinos.',
    brand: 'Música de Salón',
    category: 'ocio',
    categoryLabel: 'Curso online',
    price: 39.99,
    emoji: '🎸',
  },
  {
    id: 'humor-009',
    title: 'Piedra mascota con certificado de adopción',
    description: 'Compañera silenciosa, obediente y con menos gastos veterinarios que un hámster.',
    brand: 'Mascotas Inertes',
    category: 'curiosos',
    categoryLabel: 'Mascota decorativa',
    price: 12.5,
    emoji: '🪨',
  },
  {
    id: 'humor-010',
    title: 'Aire premium de la montaña en lata',
    description: 'Una bocanada de naturaleza envasada para abrirla justo cuando empieza la reunión.',
    brand: 'Respira Mucho',
    category: 'curiosos',
    categoryLabel: 'Producto absurdo',
    price: 6.99,
    emoji: '🌬️',
  },
  {
    id: 'humor-011',
    title: 'Detector de cuñados en sobremesa',
    description: 'Dispositivo que pita al escuchar una opinión no solicitada sobre política o fútbol.',
    brand: 'Navidad Segura',
    category: 'tecnologia',
    categoryLabel: 'Gadget humorístico',
    price: 24.99,
    emoji: '📢',
  },
  {
    id: 'humor-012',
    title: 'Figura de cera de tu ex',
    description: 'Decoración a tamaño reducido para recordar que sobreviviste a aquella relación.',
    brand: 'Museo del Drama',
    category: 'ocio',
    categoryLabel: 'Decoración',
    price: 89.99,
    emoji: '🗿',
  },
  {
    id: 'humor-013',
    title: 'Bocadillo de tortilla premium',
    description: 'Producto gourmet de bar con pan crujiente y una servilleta que cuenta como presentación.',
    brand: 'Bar La Última',
    category: 'baratos',
    categoryLabel: 'Comida preparada',
    price: 8.5,
    emoji: '🥪',
  },
  {
    id: 'humor-014',
    title: 'Taza «No soy el impostor»',
    description: 'Taza para reuniones sospechosas, desayunos largos y acusaciones sin pruebas.',
    brand: 'Tripulación Cafetera',
    category: 'hogar',
    categoryLabel: 'Menaje',
    price: 12.99,
    emoji: '☕',
  },
  {
    id: 'humor-015',
    title: 'Gorro de ducha con altavoz Bluetooth',
    description: 'Canta en la ducha sin perder el ritmo ni la conexión con el móvil.',
    brand: 'Shower Star',
    category: 'tecnologia',
    categoryLabel: 'Gadget doméstico',
    price: 22.99,
    emoji: '🚿',
  },
  {
    id: 'humor-016',
    title: 'Suscripción para ver la tele con tu gato',
    description: 'Contenido premium para dos espectadores: tú y el animal que te ignora.',
    brand: 'MiauFlix',
    category: 'ocio',
    categoryLabel: 'Suscripción mensual',
    price: 4.99,
    emoji: '🐈',
  },
  {
    id: 'humor-017',
    title: 'Billete turístico a Marte (solo souvenir)',
    description: 'Billete conmemorativo para presumir de viaje espacial sin despegar del sofá.',
    brand: 'Agencia Interplanetaria',
    category: 'curiosos',
    categoryLabel: 'Souvenir',
    price: 99.99,
    emoji: '🚀',
  },
  {
    id: 'humor-018',
    title: 'Curso intensivo para ser influencer en 7 días',
    description: 'Aprende a posar con una taza, decir «link en bio» y grabar un unboxing vacío.',
    brand: 'Viral Academy',
    category: 'ocio',
    categoryLabel: 'Curso online',
    price: 79.99,
    emoji: '📱',
  },
  {
    id: 'humor-019',
    title: 'Kit de detective privado de bar',
    description: 'Lupa, libreta y coartadas para investigar quién se terminó las aceitunas.',
    brand: 'Sherlock de Barra',
    category: 'accesorios',
    categoryLabel: 'Kit de broma',
    price: 17.99,
    emoji: '🔎',
  },
  {
    id: 'humor-020',
    title: 'Coche deportivo de alquiler por un día',
    description: 'Veinticuatro horas de postureo motorizado y fotos delante del capó.',
    brand: 'Alquila y Presume',
    category: 'precio-medio',
    categoryLabel: 'Alquiler de vehículo',
    price: 199,
    emoji: '🏎️',
  },
];

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

async function downloadImageWithDetectedExtension(url, destinationWithoutExtension) {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
  const extensionByContentType = {
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const extension = extensionByContentType[contentType] ?? '.jpg';
  const destination = `${destinationWithoutExtension}${extension}`;
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return path.basename(destination);
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
if (!Array.isArray(payload.products) || payload.products.length < dummyJsonLimit) {
  throw new Error(
    `El catálogo recibido no contiene ${dummyJsonLimit} productos (${payload.products?.length ?? 0})`,
  );
}

await mkdir(imageDirectory, { recursive: true });

const baseRecords = await mapWithConcurrency(payload.products.slice(0, dummyJsonLimit), 8, async (product) => {
  const slug = `${String(product.id).padStart(3, '0')}-${slugify(product.title)}`;
  const imagePath = path.join(imageDirectory, `${slug}.webp`);
  const imageUrl = product.images?.[0] ?? product.thumbnail;
  if (!imageUrl) throw new Error(`El producto ${product.id} no tiene imagen`);

  await downloadImage(imageUrl, imagePath);

  return {
    id: `offline-${product.id}`,
    title: product.title,
    description: product.description ?? null,
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

const fakeStoreResponse = await fetcher(fakeStoreEndpoint);
if (!fakeStoreResponse.ok) {
  throw new Error(`No se pudo obtener el catálogo alternativo: HTTP ${fakeStoreResponse.status}`);
}

const fakeStoreProducts = await fakeStoreResponse.json();
if (!Array.isArray(fakeStoreProducts) || fakeStoreProducts.length < 20) {
  throw new Error(
    `El catálogo alternativo no contiene 20 productos (${fakeStoreProducts?.length ?? 0})`,
  );
}

const fakeStoreRecords = await mapWithConcurrency(fakeStoreProducts, 8, async (product) => {
  const title = String(product.title).trim();
  const slug = `fake-store-${String(product.id).padStart(3, '0')}-${slugify(title)}`;
  const imageFile = await downloadImageWithDetectedExtension(
    product.image,
    path.join(imageDirectory, slug),
  );

  return {
    id: `fake-store-${product.id}`,
    title,
    description: product.description?.trim() ?? null,
    image: `/games/preciojusto/catalog/${imageFile}`,
    asin: null,
    detailPageUrl: `https://fakestoreapi.com/products/${product.id}`,
    category: fakeStoreGameCategory(product),
    brandModel: null,
    variant: `${fakeStoreCategoryLabel(product.category)} · referencia offline`,
    marketplace: 'Catálogo local',
    currency: 'EUR',
    referencePriceCents: Math.max(1, Math.round(Number(product.price) * 100)),
    seller: 'Referencia de catálogo',
    conditions: 'Precio orientativo de juego · catálogo offline · sin envío ni cupones',
    source: `Fake Store API · catálogo público (${fakeStoreEndpoint})`,
    capturedAt,
  };
});

/** Productos variados con imágenes CC0 o de dominio público encontradas en Openverse. */
const openverseProducts = [
  {
    id: 'openverse-001',
    title: 'Tostadora vintage para desayunos con carácter',
    description: 'Tostadora retro para quien quiere que hasta el pan tenga una entrada triunfal.',
    category: 'hogar',
    categoryLabel: 'Pequeño electrodoméstico',
    price: 39.99,
    imageUrl: 'https://cdn.stocksnap.io/img-thumbs/960w/0UTZ00FWC6.jpg',
    detailPageUrl: 'https://stocksnap.io/photo/toaster-toast-0UTZ00FWC6',
    license: 'CC0',
    creator: 'Łukasz Popardowski',
  },
  {
    id: 'openverse-002',
    title: 'Bicicleta de montaña para escapadas de barro',
    description: 'Bicicleta para llegar a sitios preciosos y volver con las piernas pidiendo explicaciones.',
    category: 'deporte',
    categoryLabel: 'Ciclismo',
    price: 649,
    imageUrl: 'https://live.staticflickr.com/3839/33265683642_7787075506_b.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/76340031@N02/33265683642',
    license: 'PDM',
    creator: 'BLMUtah',
  },
  {
    id: 'openverse-003',
    title: 'Guitarra eléctrica para tocar tres acordes con actitud',
    description: 'Instrumento para aprender un riff, montar una banda y molestar cariñosamente al vecindario.',
    category: 'ocio',
    categoryLabel: 'Instrumento musical',
    price: 279,
    imageUrl: 'https://live.staticflickr.com/8771/16714011173_e175c3a351_b.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/132795455@N08/16714011173',
    license: 'CC0',
    creator: 'Image Catalog',
  },
  {
    id: 'openverse-004',
    title: 'Donut gigante para merendar sin medias tintas',
    description: 'Unidad de repostería de tamaño generoso; compartirlo es opcional y moralmente discutible.',
    category: 'baratos',
    categoryLabel: 'Comida',
    price: 5.5,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Shakoy_doughnut.jpg',
    detailPageUrl: 'https://commons.wikimedia.org/w/index.php?curid=60318770',
    license: 'CC0',
    creator: 'Obsidian Soul',
  },
  {
    id: 'openverse-005',
    title: 'Disfraz de dinosaurio para reuniones serias',
    description: 'Disfraz acolchado para aparecer en una videollamada y convertir cualquier reunión en una era jurásica.',
    category: 'curiosos',
    categoryLabel: 'Disfraz',
    price: 44.99,
    imageUrl: 'https://live.staticflickr.com/65535/49056649573_3d3dc1d34f.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/185449710@N03/49056649573',
    license: 'CC0',
    creator: 'Shopping Guide 7',
  },
  {
    id: 'openverse-006',
    title: 'Tabla de surf para promesas de verano',
    description: 'Tabla para empezar diciendo “este año sí” y acabar negociando con las olas.',
    category: 'deporte',
    categoryLabel: 'Deportes acuáticos',
    price: 399,
    imageUrl: 'https://live.staticflickr.com/306/19767109789_d88d651eca_b.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/132795455@N08/19767109789',
    license: 'CC0',
    creator: 'Image Catalog',
  },
  {
    id: 'openverse-007',
    title: 'Cámara instantánea para fotos con sorpresa',
    description: 'Cámara que imprime el recuerdo antes de que puedas arrepentirte de haber pulsado el botón.',
    category: 'tecnologia',
    categoryLabel: 'Fotografía',
    price: 119,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/The_Polaroid_Now_Instant_Camera_%28Generation_2%29.jpg',
    detailPageUrl: 'https://commons.wikimedia.org/w/index.php?curid=180377291',
    license: 'CC0',
    creator: 'KneeHallHawk',
  },
  {
    id: 'openverse-008',
    title: 'Caja de herramientas para arreglarlo todo regular',
    description: 'Kit básico para reparar una estantería, perder un tornillo y terminar consultando un tutorial.',
    category: 'hogar',
    categoryLabel: 'Bricolaje',
    price: 54.99,
    imageUrl: 'https://live.staticflickr.com/101/265764063_fa92e28d1c_b.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/37996646802@N01/265764063',
    license: 'CC0',
    creator: 'cogdogblog',
  },
  {
    id: 'openverse-009',
    title: 'Lámpara de lava para decisiones cuestionables',
    description: 'Lámpara decorativa hipnótica para estudiar, relajarse o mirar burbujas en vez de trabajar.',
    category: 'hogar',
    categoryLabel: 'Iluminación',
    price: 29.99,
    imageUrl: 'https://live.staticflickr.com/2617/3919576745_fcfa0fa191_b.jpg',
    detailPageUrl: 'https://www.flickr.com/photos/38451115@N04/3919576745',
    license: 'CC0',
    creator: 'pasukaru76',
  },
  {
    id: 'openverse-010',
    title: 'Pato de goma director de baño',
    description: 'Pato amarillo para supervisar duchas, reuniones familiares y cualquier plan que se tuerza.',
    category: 'curiosos',
    categoryLabel: 'Juguete absurdo',
    price: 8.99,
    imageUrl: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyZHVja3NfZmlndXJlc19ncm91cF9jdXRlLWltYWdlLWt5YmR0MG9nLmpwZw.jpg',
    detailPageUrl: 'https://www.rawpixel.com/image/6038277/photo-image-public-domain-kids-cute',
    license: 'CC0',
    creator: 'Rawpixel',
  },
];

const openverseRecords = await mapWithConcurrency(openverseProducts, 6, async (product) => {
  const slug = `${product.id}-${slugify(product.title)}`;
  const imageFile = await downloadImageWithDetectedExtension(
    product.imageUrl,
    path.join(imageDirectory, slug),
  );

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    image: `/games/preciojusto/catalog/${imageFile}`,
    asin: null,
    detailPageUrl: product.detailPageUrl,
    category: product.category,
    brandModel: null,
    variant: `${product.categoryLabel} · imagen ${product.license}`,
    marketplace: 'Catálogo local',
    currency: 'EUR',
    referencePriceCents: Math.max(1, Math.round(product.price * 100)),
    seller: 'Referencia de catálogo',
    conditions: `Precio orientativo de juego · imagen ${product.license} · sin envío ni cupones`,
    source: `Openverse · imagen ${product.license} · ${product.creator} (${product.detailPageUrl})`,
    capturedAt,
  };
});

const extraRecords = await Promise.all(
  extraProducts.map(async (product) => {
    const slug = `${product.id}-${slugify(product.title)}`;
    await writeFile(
      path.join(imageDirectory, `${slug}.svg`),
      productSvg(product),
      'utf8',
    );
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      image: `/games/preciojusto/catalog/${slug}.svg`,
      asin: null,
      detailPageUrl: null,
      category: product.category,
      brandModel: product.brand,
      variant: `${product.brand} · ${product.categoryLabel} · edición humorística`,
      marketplace: 'Catálogo local',
      currency: 'EUR',
      referencePriceCents: Math.max(1, Math.round(product.price * 100)),
      seller: product.brand,
      conditions: 'Precio orientativo de juego · producto editorial/ficticio',
      source: 'Ronda · catálogo editorial humorístico',
      capturedAt,
    };
  }),
);

const records = ensureUniqueTitles([
  ...baseRecords,
  ...fakeStoreRecords,
  ...openverseRecords,
  ...extraRecords,
]);

const source = `import type { PriceQuestion } from './content.ts';

/**
 * Catálogo offline generado una vez para que Precio justo funcione sin API ni
 * credenciales. Las imágenes viven en apps/web/public y el precio queda
 * congelado dentro de cada pregunta.
 */
export const OFFLINE_PRICE_QUESTIONS = ${JSON.stringify(records, null, 2)} as const satisfies readonly PriceQuestion[];
`;

await writeFile(catalogFile, source, 'utf8');
console.log(
  `Catálogo generado: ${records.length} productos (${baseRecords.length} DummyJSON + ${fakeStoreRecords.length} Fake Store + ${openverseRecords.length} Openverse + ${extraRecords.length} editoriales)`,
);
console.log(`Imágenes guardadas en: ${path.relative(repositoryRoot, imageDirectory)}`);
console.log(`Fuentes de datos: ${sourceEndpoint}, ${fakeStoreEndpoint} y Openverse`);

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function productSvg(product) {
  const title = escapeXml(product.title);
  const brand = escapeXml(product.brand);
  const emoji = escapeXml(product.emoji);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${brand}</desc>
  <rect width="800" height="620" rx="42" fill="#f7f1e7"/>
  <circle cx="400" cy="255" r="166" fill="#d7eee7"/>
  <text x="400" y="326" text-anchor="middle" font-size="190" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text>
  <rect x="70" y="470" width="660" height="82" rx="24" fill="#ffffff" fill-opacity=".9"/>
  <text x="400" y="505" text-anchor="middle" font-size="25" font-weight="700" font-family="Arial, sans-serif" fill="#24252c">${title}</text>
  <text x="400" y="535" text-anchor="middle" font-size="17" font-family="Arial, sans-serif" fill="#6f7078">${brand}</text>
</svg>`;
}

function ensureUniqueTitles(items) {
  const seen = new Map();
  return items.map((item) => {
    const occurrences = (seen.get(item.title) ?? 0) + 1;
    seen.set(item.title, occurrences);
    if (occurrences === 1) return item;
    const suffix = item.variant.includes('Relojería femenina')
      ? ' · versión femenina'
      : ` · edición ${occurrences}`;
    return { ...item, title: `${item.title}${suffix}` };
  });
}
