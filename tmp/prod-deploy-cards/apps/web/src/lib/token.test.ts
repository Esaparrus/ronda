// Tests de token.ts: guardado/lectura/borrado y listSavedRooms. Contrato P12.
//
// No hay DOM en el entorno de test (environment: 'node'), así que se planta
// un `localStorage` mínimo en el global antes de importar el módulo: el
// propio token.ts solo mira `typeof localStorage`, sin pasar por `window`,
// precisamente para poder probarlo así sin añadir jsdom como dependencia.
import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = new FakeStorage();

const { saveToken, getToken, clearToken, listSavedRooms } = await import('./token.ts');

describe('token.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarda y lee el token de una sala bajo la clave ronda.token.<CODE>', () => {
    saveToken('ABCD', 'secreto-1');
    expect(localStorage.getItem('ronda.token.ABCD')).toBe('secreto-1');
    expect(getToken('ABCD')).toBe('secreto-1');
  });

  it('devuelve null si no hay token guardado', () => {
    expect(getToken('ZZZZ')).toBeNull();
  });

  it('borra el token de una sala', () => {
    saveToken('ABCD', 'secreto-1');
    clearToken('ABCD');
    expect(getToken('ABCD')).toBeNull();
  });

  it('el token sobrevive a una recarga simulada (localStorage persiste, el módulo se reimporta)', async () => {
    saveToken('WXYZ', 'secreto-2');
    // "Recarga": se reimporta el módulo desde cero (una recarga de página
    // real vacía el registro de módulos de JS), pero localStorage -el propio
    // almacén persistente del navegador- no se toca.
    vi.resetModules();
    const reimported = await import('./token.ts');
    expect(reimported.getToken('WXYZ')).toBe('secreto-2');
  });

  it('listSavedRooms devuelve los códigos de sala con token guardado', () => {
    saveToken('AAAA', 't1');
    saveToken('BBBB', 't2');
    localStorage.setItem('otra.cosa.no.relacionada', 'x');
    const rooms = listSavedRooms().sort();
    expect(rooms).toEqual(['AAAA', 'BBBB']);
  });
});
