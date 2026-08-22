import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAmazonPriceCatalog } from './amazon-creators.ts';

const config = {
  AMAZON_PRICE_JUSTO_ENABLED: true,
  AMAZON_CREATORS_API_CREDENTIAL_ID: 'credential-id',
  AMAZON_CREATORS_API_CREDENTIAL_SECRET: 'credential-secret',
  AMAZON_CREATORS_API_VERSION: '3.2' as const,
  AMAZON_PARTNER_TAG: 'ronda-21',
  AMAZON_MARKETPLACE: 'www.amazon.es',
  AMAZON_PRICE_JUSTO_MAX_ITEMS_PER_CATEGORY: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Amazon Creators API', () => {
  it('obtiene token, consulta categorías y transforma imágenes/precios sin descargar archivos', async () => {
    let searchCalls = 0;
    const fetchMock = vi.fn(async (input: unknown) => {
      if (String(input).includes('/auth/o2/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      searchCalls += 1;
      const asin = `B0TEST${String(searchCalls).padStart(4, '0')}`;
      return new Response(
        JSON.stringify({
          searchResult: {
            items: [
              {
                asin,
                detailPageURL: `https://www.amazon.es/dp/${asin}?tag=ronda-21`,
                images: {
                  primary: {
                    large: {
                      url: 'https://m.media-amazon.com/images/I/real-product.jpg',
                    },
                  },
                },
                itemInfo: {
                  title: { displayValue: `Producto real ${searchCalls}` },
                  byLineInfo: { brand: { displayValue: 'Marca real' } },
                },
                offersV2: {
                  listings: [
                    {
                      price: { money: { amount: 19.99, currency: 'EUR' } },
                      merchantInfo: { name: 'Amazon.es' },
                      condition: { value: 'New' },
                    },
                  ],
                },
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const catalog = createAmazonPriceCatalog(config, {
      info: vi.fn(),
      warn: vi.fn(),
    });
    if (!catalog) throw new Error('debería crear el catálogo');

    expect(catalog.getQuestions()).toBeNull();
    const questions = await catalog.refresh();

    expect(questions).toHaveLength(8);
    expect(searchCalls).toBe(8);
    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(questions?.[0]).toMatchObject({
      title: 'Producto real 1',
      image: 'https://m.media-amazon.com/images/I/real-product.jpg',
      asin: 'B0TEST0001',
      referencePriceCents: 1999,
      detailPageUrl: 'https://www.amazon.es/dp/B0TEST0001?tag=ronda-21',
      source: 'Amazon.es · Creators API',
    });
  });

  it('mantiene el catálogo anterior si una actualización posterior falla', async () => {
    let fail = false;
    const fetchMock = vi.fn(async (input: unknown) => {
      if (fail) throw new Error('network down');
      if (String(input).includes('/auth/o2/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          searchResult: {
            items: [
              {
                asin: 'B0STABLE',
                detailPageURL: 'https://www.amazon.es/dp/B0STABLE',
                images: { primary: { medium: { url: 'https://m.media-amazon.com/stable.jpg' } } },
                itemInfo: { title: { displayValue: 'Producto estable' } },
                offersV2: {
                  listings: [{ price: { money: { amount: 10, currency: 'EUR' } } }],
                },
              },
            ],
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const catalog = createAmazonPriceCatalog(config, { info: vi.fn(), warn: vi.fn() });
    if (!catalog) throw new Error('debería crear el catálogo');

    await catalog.refresh();
    fail = true;
    const retained = await catalog.refresh();

    expect(retained?.[0]?.asin).toBe('B0STABLE');
  });
});
