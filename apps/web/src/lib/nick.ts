// Normalización y validación de apodos, en el cliente, solo para dar
// feedback inmediato en los formularios de /crear y /unirse. Contrato §6:
// "2 a 12 caracteres, letras (incluye tildes y ñ), números, espacios y
// guiones. Se recorta y se colapsan espacios."
//
// Esto NO sustituye la validación del servidor (que es la que de verdad
// decide): es una comprobación de formato para no hacer un viaje de red
// inútil cuando está claro que el apodo no vale.

const NICK_PATTERN = /^[\p{L}\p{N} -]{2,12}$/u;

/** Recorta los extremos y colapsa espacios repetidos en uno solo. */
export function normalizeNick(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** ¿Tiene el apodo (ya normalizado) un formato válido? */
export function isValidNick(nick: string): boolean {
  return NICK_PATTERN.test(nick);
}
