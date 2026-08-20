// Sirve las previews de Apple con un tipo de audio estable para móviles.
// Algunas respuestas de iTunes llegan como audio/x-m4p y ciertos navegadores
// móviles no las reproducen bien desde el enlace remoto directamente.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set(['audio-ssl.itunes.apple.com', 'audio.itunes.apple.com']);

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get('url');
  const previewUrl = parsePreviewUrl(rawUrl);
  if (!previewUrl) {
    return Response.json({ error: 'La preview no es válida.' }, { status: 400 });
  }

  const range = request.headers.get('range');
  const headers = new Headers();
  if (range) headers.set('Range', range);

  try {
    const response = await fetch(previewUrl, { headers, cache: 'no-store' });
    if (!response.ok && response.status !== 206) {
      return Response.json({ error: 'No se pudo cargar la preview.' }, { status: 502 });
    }
    if (!response.body) {
      return Response.json({ error: 'La preview llegó vacía.' }, { status: 502 });
    }

    const responseHeaders = new Headers({
      // audio/mp4 evita que algunos móviles rechacen el MIME audio/x-m4p de Apple.
      'Content-Type': 'audio/mp4',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Accept-Ranges': response.headers.get('accept-ranges') ?? 'bytes',
    });
    for (const name of ['content-length', 'content-range']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: 'No se pudo cargar la preview.' }, { status: 502 });
  }
}

function parsePreviewUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
