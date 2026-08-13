import { describe, expect, it } from 'vitest';
import { resolveServerUrl } from './server-url';

describe('resolveServerUrl', () => {
  it('usa localhost en desarrollo si no hay variable', () => {
    expect(resolveServerUrl(undefined, 'development')).toBe('http://localhost:8787');
  });

  it('quita la barra final para que Socket.IO use una base estable', () => {
    expect(resolveServerUrl('https://ronda-server.example/', 'production')).toBe(
      'https://ronda-server.example',
    );
  });

  it('obliga a configurar una URL en producción', () => {
    expect(() => resolveServerUrl(undefined, 'production')).toThrow(
      'NEXT_PUBLIC_SERVER_URL es obligatoria en producción',
    );
  });

  it('obliga HTTPS en producción', () => {
    expect(() => resolveServerUrl('http://localhost:8787', 'production')).toThrow(
      'NEXT_PUBLIC_SERVER_URL debe usar HTTPS en producción',
    );
  });
});
