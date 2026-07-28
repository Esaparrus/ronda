import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from './errors.ts';
import { messageFor, assertAllMessages } from './messages.ts';

describe('messages.ts', () => {
  it('cada ErrorCode tiene texto en messages.ts', () => {
    // No lanza: todos los códigos tienen entrada.
    expect(() => assertAllMessages()).not.toThrow();
    // Y además cada uno devuelve una cadena no vacía.
    for (const code of ERROR_CODES) {
      expect(messageFor(code).length).toBeGreaterThan(0);
    }
  });

  it('no hay ErrorCode duplicados en la lista', () => {
    const set = new Set(ERROR_CODES);
    expect(set.size).toBe(ERROR_CODES.length);
  });

  it('interpola {n} cuando se pasa params.n', () => {
    const text = messageFor('CANNOT_CLOSE', { n: 5 });
    expect(text).toBe('No puedes cerrar: te sobran más de 5 puntos.');
  });

  it('deja {n} sin tocar si no se pasa params', () => {
    // Aunque en la práctica siempre se llamará con n, el comportamiento debe
    // ser estable: el placeholder queda como está.
    const text = messageFor('CANNOT_CLOSE');
    expect(text).toBe('No puedes cerrar: te sobran más de {n} puntos.');
  });
});
