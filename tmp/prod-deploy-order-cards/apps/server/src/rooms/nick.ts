// Normalización y validación de apodos. Contrato §6.
//
// Apodo: 2 a 12 caracteres, letras (incluye tildes y ñ), números, espacios y
// guiones. Se recorta y se colapsan espacios. Único en la sala, sin distinguir
// mayúsculas.

const NICK_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 -]+$/;

/**
 * Normaliza un apodo: recorta espacios, colapsa múltiples espacios seguidos.
 * No valida longitud; eso lo hace validateNick.
 */
export function normalizeNick(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** ¿Es un apodo válido (2-12 caracteres tras normalizar, charset permitido)? */
export function isValidNick(raw: string): boolean {
  const n = normalizeNick(raw);
  if (n.length < 2 || n.length > 12) return false;
  return NICK_RE.test(n);
}

/** Clave de comparación para unicidad (case-insensitive). */
export function nickKey(nick: string): string {
  return normalizeNick(nick).toLowerCase();
}
