// Tests de nick.ts: normalización y validación de formato. Contrato §6.
import { describe, expect, it } from 'vitest';
import { isValidNick, normalizeNick } from './nick.ts';

describe('normalizeNick', () => {
  it('recorta espacios en los extremos', () => {
    expect(normalizeNick('  Ana  ')).toBe('Ana');
  });

  it('colapsa espacios repetidos en uno solo', () => {
    expect(normalizeNick('Ana   Beto')).toBe('Ana Beto');
  });
});

describe('isValidNick', () => {
  it('acepta letras con tildes y ñ', () => {
    expect(isValidNick('Íñigo')).toBe(true);
  });

  it('acepta números, espacios y guiones', () => {
    expect(isValidNick('Ana-2 B')).toBe(true);
  });

  it('rechaza menos de 2 caracteres', () => {
    expect(isValidNick('A')).toBe(false);
  });

  it('rechaza más de 12 caracteres', () => {
    expect(isValidNick('Nombre Demasiado Largo')).toBe(false);
  });

  it('rechaza símbolos y emoji', () => {
    expect(isValidNick('Ana😀')).toBe(false);
    expect(isValidNick('Ana@Beto')).toBe(false);
  });

  it('rechaza cadena vacía', () => {
    expect(isValidNick('')).toBe(false);
  });
});
