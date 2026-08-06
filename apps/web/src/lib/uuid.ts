/**
 * UUID compatible con navegadores en HTTP local.
 *
 * `crypto.randomUUID()` solo está disponible en contextos seguros (HTTPS o
 * localhost). El playtest en la red local usa `http://192.168.x.x`, así que
 * cae a `getRandomValues`, disponible también en ese contexto.
 */
export function createUuid(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `ronda-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
