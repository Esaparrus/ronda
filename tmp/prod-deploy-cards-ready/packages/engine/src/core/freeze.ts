// deepFreeze para tests de inmutabilidad. Contrato §3 requisito 2.
//
// Uso típico en un test:
//   deepFreeze(state);
//   applyAction(state, ...);  // no debe lanzar (no muta el estado recibido)

/**
 * Congela recursivamente un objeto y todos sus sub-objetos/array no congelados.
 * Devuelve el mismo objeto, congelado en profundidad.
 *
 * Es un helper de tests: en producción el motor simplemente devuelve estados
 * nuevos sin mutar; aquí forzamos el "no mutar" para que un bug de inmutabilidad
 * se manifieste como TypeError en el test.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  // Primero congela los hijos (recursivo), luego el propio objeto.
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return Object.freeze(value);
}
