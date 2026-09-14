// Servidor HTTP mínimo. Contrato P5.
//
// Solo expone GET /health → { ok, uptime, rooms }. Nada más: el transporte de
// juego es Socket.IO (io.ts). El recuento de salas lo provee un callback
// inyectado para no acoplar este módulo al RoomManager (llega en P6).
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export interface HttpDeps {
  /** Número de salas activas. Inyectado por P6; por defecto 0. */
  countRooms?: () => number;
}

export interface HttpRuntime {
  server: Server;
  /** Marca de tiempo de arranque, para calcular uptime. */
  startedAt: number;
}

export function createHttpServer(deps: HttpDeps = {}): HttpRuntime {
  const startedAt = Date.now();
  const server = createServer((req, res) => handleRequest(req, res, startedAt, deps));

  return { server, startedAt };
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  startedAt: number,
  deps: HttpDeps,
): void {
  if (req.method === 'GET' && req.url === '/health') {
    const body = {
      ok: true,
      uptime: Date.now() - startedAt,
      rooms: deps.countRooms ? deps.countRooms() : 0,
    };
    sendJson(res, 200, body);
    return;
  }
  sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}
