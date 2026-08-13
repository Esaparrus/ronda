const LOCAL_SERVER_URL = 'http://localhost:8787';

/**
 * Valida la URL pública que usa Socket.IO. En producción no permite volver
 * accidentalmente a localhost ni usar HTTP, porque una web HTTPS no puede
 * abrir de forma fiable una conexión de juego insegura.
 */
export function resolveServerUrl(
  value: string | undefined,
  nodeEnv: string | undefined = 'development',
): string {
  const candidate = value?.trim() || LOCAL_SERVER_URL;

  if (nodeEnv === 'production' && !value?.trim()) {
    throw new Error('NEXT_PUBLIC_SERVER_URL es obligatoria en producción');
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`NEXT_PUBLIC_SERVER_URL no es una URL válida: ${candidate}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SERVER_URL debe usar http:// o https://');
  }

  if (nodeEnv === 'production' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SERVER_URL debe usar HTTPS en producción');
  }

  return candidate.replace(/\/+$/, '');
}
