import { describe, it, expect } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('falla si falta DATABASE_URL', () => {
    expect(() => loadConfig({ PORT: '8787', CORS_ORIGIN: 'http://localhost:3000' })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => loadConfig({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('acepta config mínima válida con DATABASE_URL', () => {
    const cfg = loadConfig({ DATABASE_URL: 'postgres://u:p@host:5432/db' });
    expect(cfg.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
    // defaults aplicados
    expect(cfg.PORT).toBe(8787);
    expect(cfg.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(cfg.NODE_ENV).toBe('development');
    expect(cfg.ROOM_INACTIVITY_MINUTES).toBe(30);
    expect(cfg.ROOM_PRESENCE_TIMEOUT_SECONDS).toBe(90);
    expect(cfg.AMAZON_PRICE_JUSTO_ENABLED).toBe(false);
    expect(cfg.AMAZON_MARKETPLACE).toBe('www.amazon.es');
  });

  it('interpreta correctamente el interruptor de Amazon desde env', () => {
    expect(
      loadConfig({ DATABASE_URL: 'x', AMAZON_PRICE_JUSTO_ENABLED: 'false' })
        .AMAZON_PRICE_JUSTO_ENABLED,
    ).toBe(false);
    expect(
      loadConfig({ DATABASE_URL: 'x', AMAZON_PRICE_JUSTO_ENABLED: 'true' })
        .AMAZON_PRICE_JUSTO_ENABLED,
    ).toBe(true);
  });

  it('aplica PORT, CORS_ORIGIN y NODE_ENV si se pasan', () => {
    const cfg = loadConfig({
      DATABASE_URL: 'postgres://x',
      PORT: '9000',
      CORS_ORIGIN: 'https://ronda.example.com',
      NODE_ENV: 'production',
    });
    expect(cfg.PORT).toBe(9000);
    expect(cfg.CORS_ORIGIN).toBe('https://ronda.example.com');
    expect(cfg.NODE_ENV).toBe('production');
  });

  it('PORT se coerce desde string a número', () => {
    const cfg = loadConfig({ DATABASE_URL: 'x', PORT: '1234' });
    expect(typeof cfg.PORT).toBe('number');
    expect(cfg.PORT).toBe(1234);
  });

  it('acepta un límite de inactividad configurable en minutos', () => {
    const cfg = loadConfig({ DATABASE_URL: 'x', ROOM_INACTIVITY_MINUTES: '15' });
    expect(cfg.ROOM_INACTIVITY_MINUTES).toBe(15);
  });

  it('acepta un límite de presencia configurable en segundos', () => {
    const cfg = loadConfig({ DATABASE_URL: 'x', ROOM_PRESENCE_TIMEOUT_SECONDS: '45' });
    expect(cfg.ROOM_PRESENCE_TIMEOUT_SECONDS).toBe(45);
  });

  it('rechaza un límite de presencia no positivo', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'x', ROOM_PRESENCE_TIMEOUT_SECONDS: '0' }),
    ).toThrow(/ROOM_PRESENCE_TIMEOUT_SECONDS/);
  });

  it('rechaza un límite de inactividad no positivo', () => {
    expect(() => loadConfig({ DATABASE_URL: 'x', ROOM_INACTIVITY_MINUTES: '0' })).toThrow(
      /ROOM_INACTIVITY_MINUTES/,
    );
  });

  it('rechaza NODE_ENV inválido', () => {
    expect(() => loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('isProd / isDev reflejan NODE_ENV', async () => {
    const { isProd, isDev } = await import('./config.ts');
    expect(isProd(loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'production' }))).toBe(true);
    expect(isDev(loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'development' }))).toBe(true);
    expect(isProd(loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'development' }))).toBe(false);
  });
});
