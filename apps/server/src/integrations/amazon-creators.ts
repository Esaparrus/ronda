// Integración server-side con Amazon Creators API.
//
// Las credenciales nunca salen del servidor. El proveedor devuelve un catálogo
// congelado por partida: el motor sigue siendo puro y cada sala conserva el
// precio que vio al empezar, aunque Amazon cambie la oferta después.
import type { PriceCategory } from '@ronda/protocol';
import type { PriceQuestion } from '@ronda/engine';
import type { ServerConfig } from '../config.ts';
import type { Logger } from '../logger.ts';

type AmazonPriceCategory = Exclude<PriceCategory, 'todo'>;
type JsonObject = Record<string, unknown>;

const CATALOG_CATEGORIES: readonly [AmazonPriceCategory, string][] = [
  ['hogar', 'hogar cocina'],
  ['tecnologia', 'tecnología gadgets'],
  ['ocio', 'juegos de mesa ocio'],
  ['deporte', 'deporte accesorios'],
  ['accesorios', 'accesorios personales'],
  ['curiosos', 'gadgets originales'],
  ['baratos', 'productos útiles baratos'],
  ['precio-medio', 'productos tecnología hogar'],
];

const CREATORS_API_URL = 'https://creatorsapi.amazon/catalog/v1/searchItems';
const MARKETPLACE_LABEL = 'Amazon.es';
const RESOURCE_LIST = [
  'images.primary.large',
  'images.primary.medium',
  'images.primary.small',
  'itemInfo.title',
  'itemInfo.byLineInfo',
  'itemInfo.productInfo',
  'offersV2.listings.price',
  'offersV2.listings.merchantInfo',
  'offersV2.listings.condition',
];

const AMAZON_IMAGE_HOSTS = new Set([
  'm.media-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images-fe.ssl-images-amazon.com',
]);

export interface AmazonPriceCatalog {
  getQuestions(): readonly PriceQuestion[] | null;
  refresh(): Promise<readonly PriceQuestion[] | null>;
}

interface AmazonCatalogConfig {
  AMAZON_PRICE_JUSTO_ENABLED: boolean;
  AMAZON_CREATORS_API_CREDENTIAL_ID?: string;
  AMAZON_CREATORS_API_CREDENTIAL_SECRET?: string;
  AMAZON_CREATORS_API_VERSION: '3.1' | '3.2' | '3.3';
  AMAZON_PARTNER_TAG?: string;
  AMAZON_MARKETPLACE: string;
  AMAZON_PRICE_JUSTO_MAX_ITEMS_PER_CATEGORY: number;
}

interface AmazonItem {
  asin?: unknown;
  detailPageURL?: unknown;
  images?: unknown;
  itemInfo?: unknown;
  offersV2?: unknown;
}

interface AmazonSearchResponse {
  searchResult?: {
    items?: AmazonItem[];
  };
}

interface AmazonTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

interface PriceAndOffer {
  amount: number;
  currency: string;
  merchant: string;
  condition: string;
}

/** Crea el catálogo si las credenciales están completas; si no, deja el fallback local. */
export function createAmazonPriceCatalog(
  config: Pick<ServerConfig, keyof AmazonCatalogConfig>,
  logger: Pick<Logger, 'info' | 'warn'>,
): AmazonPriceCatalog | null {
  if (!config.AMAZON_PRICE_JUSTO_ENABLED) return null;

  const credentialId = config.AMAZON_CREATORS_API_CREDENTIAL_ID;
  const credentialSecret = config.AMAZON_CREATORS_API_CREDENTIAL_SECRET;
  const partnerTag = config.AMAZON_PARTNER_TAG;
  if (!credentialId || !credentialSecret || !partnerTag) {
    logger.warn('Amazon Creators API no configurada; se usará el catálogo local', {
      missing: [
        !credentialId ? 'AMAZON_CREATORS_API_CREDENTIAL_ID' : null,
        !credentialSecret ? 'AMAZON_CREATORS_API_CREDENTIAL_SECRET' : null,
        !partnerTag ? 'AMAZON_PARTNER_TAG' : null,
      ].filter(Boolean),
    });
    return null;
  }

  const client = new AmazonCreatorsClient({
    credentialId,
    credentialSecret,
    version: config.AMAZON_CREATORS_API_VERSION,
    partnerTag,
    marketplace: config.AMAZON_MARKETPLACE,
  });
  let questions: PriceQuestion[] | null = null;
  let refreshInFlight: Promise<readonly PriceQuestion[] | null> | null = null;

  return {
    getQuestions: () => (questions ? questions.map((question) => ({ ...question })) : null),
    refresh: () => {
      if (refreshInFlight) return refreshInFlight;
      refreshInFlight = refreshAmazonCatalog(client, config.AMAZON_PRICE_JUSTO_MAX_ITEMS_PER_CATEGORY, logger)
        .then((next) => {
          if (next.length > 0) {
            questions = next;
            logger.info('catálogo Amazon de Precio justo actualizado', {
              products: next.length,
              marketplace: config.AMAZON_MARKETPLACE,
            });
          } else if (!questions) {
            logger.warn('Amazon no devolvió productos con precio; se usará el catálogo local');
          }
          return questions ? questions.map((question) => ({ ...question })) : null;
        })
        .catch((error: unknown) => {
          logger.warn('No se pudo actualizar el catálogo Amazon; se mantiene el anterior', {
            detail: error instanceof Error ? error.message : String(error),
          });
          return questions ? questions.map((question) => ({ ...question })) : null;
        })
        .finally(() => {
          refreshInFlight = null;
        });
      return refreshInFlight;
    },
  };
}

async function refreshAmazonCatalog(
  client: AmazonCreatorsClient,
  maxItems: number,
  logger: Pick<Logger, 'warn'>,
): Promise<PriceQuestion[]> {
  const capturedAt = new Date().toISOString();
  const questions: PriceQuestion[] = [];
  for (const [category, keywords] of CATALOG_CATEGORIES) {
    try {
      questions.push(...(await client.searchItems(keywords, category, maxItems, capturedAt)));
    } catch (error: unknown) {
      logger.warn('falló una búsqueda de Amazon para Precio justo', {
        category,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.asin ?? question.id)) return false;
    seen.add(question.asin ?? question.id);
    return true;
  });
}

class AmazonCreatorsClient {
  private readonly credentialId: string;
  private readonly credentialSecret: string;
  private readonly version: '3.1' | '3.2' | '3.3';
  private readonly partnerTag: string;
  private readonly marketplace: string;
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(options: {
    credentialId: string;
    credentialSecret: string;
    version: '3.1' | '3.2' | '3.3';
    partnerTag: string;
    marketplace: string;
  }) {
    this.credentialId = options.credentialId;
    this.credentialSecret = options.credentialSecret;
    this.version = options.version;
    this.partnerTag = options.partnerTag;
    this.marketplace = options.marketplace;
  }

  async searchItems(
    keywords: string,
    category: AmazonPriceCategory,
    maxItems: number,
    capturedAt: string,
  ): Promise<PriceQuestion[]> {
    const token = await this.getAccessToken();
    const response = await fetch(CREATORS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-marketplace': this.marketplace,
      },
      body: JSON.stringify({
        keywords,
        searchIndex: 'All',
        itemCount: maxItems,
        condition: 'New',
        currencyOfPreference: 'EUR',
        marketplace: this.marketplace,
        partnerTag: this.partnerTag,
        resources: RESOURCE_LIST,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Amazon Creators API respondió HTTP ${response.status}`);

    const payload = (await response.json()) as AmazonSearchResponse;
    return (payload.searchResult?.items ?? [])
      .map((item) => toPriceQuestion(item, category, this.marketplace, capturedAt))
      .filter((question): question is PriceQuestion => question !== null);
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }

    const response = await fetch(tokenEndpointForVersion(this.version), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.credentialId,
        client_secret: this.credentialSecret,
        scope: 'creatorsapi::default',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Amazon LwA respondió HTTP ${response.status}`);

    const payload = (await response.json()) as AmazonTokenResponse;
    const value = typeof payload.access_token === 'string' ? payload.access_token : null;
    if (!value) throw new Error('Amazon LwA no devolvió access_token');
    const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
    this.accessToken = { value, expiresAt: Date.now() + expiresIn * 1000 };
    return value;
  }
}

function tokenEndpointForVersion(version: '3.1' | '3.2' | '3.3'): string {
  if (version === '3.1') return 'https://api.amazon.com/auth/o2/token';
  if (version === '3.3') return 'https://api.amazon.co.jp/auth/o2/token';
  return 'https://api.amazon.co.uk/auth/o2/token';
}

function toPriceQuestion(
  item: AmazonItem,
  category: AmazonPriceCategory,
  marketplace: string,
  capturedAt: string,
): PriceQuestion | null {
  const asin = stringValue(item.asin);
  const title = stringAt(item.itemInfo, ['title', 'displayValue']);
  const image = imageUrl(item.images);
  const offer = priceAndOffer(item.offersV2);
  if (!asin || !title || !image || !offer || offer.currency !== 'EUR') return null;

  const detailPageUrl = amazonProductUrl(item.detailPageURL, marketplace);
  if (!detailPageUrl) return null;

  return {
    id: `amazon-${asin.toLowerCase()}`,
    title,
    image,
    asin,
    detailPageUrl,
    category,
    brandModel: stringAt(item.itemInfo, ['byLineInfo', 'brand', 'displayValue']),
    variant: stringAt(item.itemInfo, ['productInfo', 'size', 'displayValue']) ?? 'Producto nuevo',
    marketplace: MARKETPLACE_LABEL,
    currency: 'EUR',
    referencePriceCents: Math.round(offer.amount * 100),
    seller: offer.merchant || MARKETPLACE_LABEL,
    conditions: `Precio y disponibilidad consultados en ${MARKETPLACE_LABEL} · ${offer.condition || 'nuevo'}`,
    source: `${MARKETPLACE_LABEL} · Creators API`,
    capturedAt,
  };
}

function imageUrl(value: unknown): string | null {
  for (const size of ['large', 'medium', 'small']) {
    const url = stringAt(value, ['primary', size, 'url']);
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && AMAZON_IMAGE_HOSTS.has(parsed.hostname)) return parsed.toString();
    } catch {
      // La siguiente resolución puede tener una imagen válida.
    }
  }
  return null;
}

function amazonProductUrl(value: unknown, marketplace: string): string | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.hostname !== marketplace) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function priceAndOffer(value: unknown): PriceAndOffer | null {
  const listings = arrayValue(value, ['listings']);
  for (const listing of listings) {
    const amount = numberAt(listing, ['price', 'money', 'amount']);
    const currency = stringAt(listing, ['price', 'money', 'currency']);
    if (amount === null || amount <= 0 || amount > 1_000_000 || !currency) continue;
    return {
      amount,
      currency,
      merchant: stringAt(listing, ['merchantInfo', 'name']) ?? '',
      condition: stringAt(listing, ['condition', 'value']) ?? 'nuevo',
    };
  }
  return null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringAt(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current)) return null;
    current = current[key];
  }
  return stringValue(current);
}

function numberAt(value: unknown, path: string[]): number | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current)) return null;
    current = current[key];
  }
  const result = typeof current === 'number' ? current : Number(current);
  return Number.isFinite(result) ? result : null;
}

function arrayValue(value: unknown, path: string[]): unknown[] {
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current)) return [];
    current = current[key];
  }
  return Array.isArray(current) ? current : [];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}
