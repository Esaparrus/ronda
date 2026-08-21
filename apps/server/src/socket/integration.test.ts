// Tests de integración de socket: cliente socket.io-client real contra el
// servidor en un puerto efímero. Contrato §2.3, §2.4, §2.5, §6 / P8.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { createServer, type Server } from 'node:http';
import { RoomManager } from '../rooms/room-manager.ts';
import { createIoServer } from '../io.ts';
import { createLogger } from '../logger.ts';
import { loadConfig } from '../config.ts';
import type { IncidentInput } from '../db/incidents-repo.ts';
import '@ronda/engine';

const cfg = loadConfig({ DATABASE_URL: 'postgres://test', NODE_ENV: 'test' });
const logger = createLogger(cfg, { service: 'test' });

let httpServer: Server;
let port = 0;
let mgr: RoomManager;
const savedIncidents: IncidentInput[] = [];
let rejectIncidentSave = false;

beforeAll(async () => {
  httpServer = createServer();
  mgr = new RoomManager();
  createIoServer({
    server: httpServer,
    config: cfg,
    logger,
    manager: mgr,
    saveIncident: async (incident) => {
      if (rejectIncidentSave) throw new Error('database unavailable');
      savedIncidents.push(incident);
    },
  });
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });
}, 20000);

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

function client(): ClientSocket {
  return ioc(`http://localhost:${port}`, { forceNew: true });
}

function connect(c: ClientSocket): Promise<void> {
  return new Promise((resolve) => c.on('connect', () => resolve()));
}

function emitAck(socket: ClientSocket, event: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack: unknown) => resolve(ack));
  });
}

function nextView(socket: ClientSocket): Promise<unknown> {
  return new Promise((resolve) => socket.once('state:view', (p) => resolve(p)));
}

/**
 * Registra el listener ANTES de emitir, para no perder el evento que el
 * servidor envía antes de responder el ack.
 */
function emitAndListen(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<{ ack: unknown; view: unknown }> {
  return new Promise((resolve) => {
    const viewP = nextView(socket);
    socket.emit(event, payload, (ack: unknown) => {
      viewP.then((view) => resolve({ ack, view }));
    });
  });
}

/** Espera una vista con el estado pedido e ignora snapshots anteriores. */
function viewWithStatus(socket: ClientSocket, status: string): Promise<unknown> {
  return new Promise((resolve) => {
    const onView = (payload: { view: { status: string } }) => {
      if (payload.view.status !== status) return;
      socket.off('state:view', onView);
      resolve(payload);
    };
    socket.on('state:view', onView);
  });
}

// ---------------------------------------------------------------------------

describe('integración socket', () => {
  it('dos clientes crean y se unen; el join responde ok y la sala tiene 2 jugadores', async () => {
    const c1 = client();
    const c2 = client();
    await Promise.all([connect(c1), connect(c2)]);

    const createP = emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const { ack: createdAck, view: v1a } = await createP;
    const created = createdAck as { ok: boolean; value?: { roomCode: string } };
    expect(created.ok).toBe(true);
    expect((v1a as { view: { players: unknown[] } }).view.players.length).toBe(1);
    const code = (created as { value: { roomCode: string } }).value.roomCode;

    // join de c2: registramos listener en c2 antes de emitir.
    const joinP = emitAndListen(c2, 'room:join', { roomCode: code, nick: 'Beto' });
    const { ack: joinedAck, view: v2b } = await joinP;
    expect((joinedAck as { ok: boolean }).ok).toBe(true);
    // c2 recibe su vista del lobby con 2 jugadores.
    expect((v2b as { view: { players: unknown[] } }).view.players.length).toBe(2);

    // c1 eventualmente recibe la actualización (vía difusión diferida).
    // No la esperamos con once (fragile); verificamos el estado del servidor.
    const room = mgr.getRoomByCode(code);
    expect(room?.players.size).toBe(2);

    c1.close();
    c2.close();
  }, 15000);

  it('al cambiar de sala con la misma pestaña libera la sala anterior', async () => {
    const c1 = client();
    await connect(c1);

    const first = (await emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    })).ack as { value: { roomCode: string } };
    const firstCode = first.value.roomCode;

    const second = (await emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    })).ack as { value: { roomCode: string } };

    expect(second.value.roomCode).not.toBe(firstCode);
    expect(mgr.getRoomByCode(firstCode)).toBeUndefined();
    expect(mgr.getRoomByCode(second.value.roomCode)?.players.size).toBe(1);

    c1.close();
  }, 15000);

  it('una pantalla con screen:attach recibe kind table (nunca player)', async () => {
    const c1 = client();
    const screen = client();
    await Promise.all([connect(c1), connect(screen)]);

    const createP = emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const { ack: createdAck } = await createP;
    const code = (createdAck as { value: { roomCode: string } }).value.roomCode;

    const attachP = emitAndListen(screen, 'screen:attach', { roomCode: code });
    const { ack: attachedAck, view: snap } = await attachP;
    expect((attachedAck as { ok: boolean }).ok).toBe(true);
    expect((snap as { view: { kind: string } }).view.kind).toBe('table');

    c1.close();
    screen.close();
  }, 15000);

  it('reconectar con el mismo token recupera asiento', async () => {
    const c1 = client();
    const c2 = client();
    await Promise.all([connect(c1), connect(c2)]);

    const createP = emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const { ack: createdAck } = await createP;
    const created = createdAck as { value: { roomCode: string; playerToken: string } };
    const code = created.value.roomCode;
    const token = created.value.playerToken;

    await emitAndListen(c2, 'room:join', { roomCode: code, nick: 'Beto' });
    // start: c1 como host inicia la partida.
    await emitAck(c1, 'room:start', {});

    c1.close();
    const c1b = client();
    await connect(c1b);
    const resumeP = emitAndListen(c1b, 'room:resume', { playerToken: token });
    const { ack: resumedAck, view: snap } = await resumeP;
    const resumed = resumedAck as { ok: boolean; value?: { seat: number } };
    expect(resumed.ok).toBe(true);
    expect(resumed.value?.seat).toBe(0);
    expect((snap as { view: { kind: string } }).view.kind).toBe('player');

    c1b.close();
    c2.close();
  }, 15000);

  it('room:leave difunde el final de la partida a quien se queda', async () => {
    const c1 = client();
    const c2 = client();
    await Promise.all([connect(c1), connect(c2)]);

    const { ack: createdAck } = await emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const code = (createdAck as { value: { roomCode: string } }).value.roomCode;

    await emitAndListen(c2, 'room:join', { roomCode: code, nick: 'Beto' });
    await emitAck(c1, 'room:start', {});

    const ended = viewWithStatus(c1, 'gameEnd');
    const leaveAck = (await emitAck(c2, 'room:leave', {})) as { ok: boolean };
    expect(leaveAck.ok).toBe(true);

    const snapshot = (await ended) as {
      view: { status: string; winnerId: string | null };
    };
    expect(snapshot.view.status).toBe('gameEnd');
    expect(snapshot.view.winnerId).not.toBeNull();

    c1.close();
    c2.close();
  }, 15000);

  it('enviar 30 mensajes en 1s produce RATE_LIMITED en alguno', async () => {
    const c1 = client();
    await connect(c1);
    const results: boolean[] = [];
    for (let i = 0; i < 30; i++) {
      const r = (await emitAck(c1, 'ping', {})) as { ok: boolean };
      results.push(r.ok);
    }
    expect(results.some((ok) => !ok)).toBe(true);
    c1.close();
  }, 15000);

  it('diagnostic:report correlaciona el incidente y conserva la acción previa', async () => {
    savedIncidents.length = 0;
    const c1 = client();
    await connect(c1);
    const { ack: createdAck } = await emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const code = (createdAck as { value: { roomCode: string } }).value.roomCode;

    // En lobby la jugada se rechaza, pero también interesa en el registrador:
    // explica qué intentó hacer el cliente inmediatamente antes del fallo.
    await emitAck(c1, 'game:action', {
      clientActionId: 'action-before-report',
      expectedVersion: 0,
      action: { type: 'drawDeck' },
    });

    const result = (await emitAck(c1, 'diagnostic:report', {
      incidentId: 'RND-A1B2C3D4',
      reason: 'manual_block',
      occurredAt: Date.now(),
      path: `/sala/${code}`,
      release: 'test',
      userAgent: 'vitest',
      context: {
        roomCode: code,
        playerId: 'p1',
        gameId: 'chinchon',
        viewKind: 'player',
        status: 'lobby',
        phase: null,
        version: 0,
        connection: 'online',
        pendingAction: false,
        pendingSince: null,
      },
      entries: [],
      error: null,
    })) as { ok: boolean; value?: { incidentId: string } };

    expect(result.ok).toBe(true);
    expect(result.value?.incidentId).toBe('RND-A1B2C3D4');
    expect(savedIncidents).toMatchObject([
      {
        incidentId: 'RND-A1B2C3D4',
        roomCode: code,
        gameId: 'chinchon',
        reason: 'manual_block',
      },
    ]);
    expect(mgr.getRoomByCode(code)?.getDiagnosticActions()).toMatchObject([
      { clientActionId: 'action-before-report', result: 'INVALID_ACTION' },
    ]);
    c1.close();
  }, 15000);

  it('diagnostic:report no confirma el envío si la base de datos falla', async () => {
    const c1 = client();
    await connect(c1);
    const { ack: createdAck } = await emitAndListen(c1, 'room:create', {
      gameId: 'chinchon',
      config: { gameId: 'chinchon' },
      nick: 'Ana',
    });
    const code = (createdAck as { value: { roomCode: string } }).value.roomCode;

    rejectIncidentSave = true;
    try {
      const result = (await emitAck(c1, 'diagnostic:report', {
        incidentId: 'RND-DBFAIL01',
        reason: 'manual_block',
        occurredAt: Date.now(),
        path: `/sala/${code}`,
        release: 'test',
        userAgent: 'vitest',
        context: {
          roomCode: code,
          playerId: 'p1',
          gameId: 'chinchon',
          viewKind: 'player',
          status: 'lobby',
          phase: null,
          version: 0,
          connection: 'online',
          pendingAction: false,
          pendingSince: null,
        },
        entries: [],
        error: null,
      })) as { ok: boolean; code?: string; detail?: string };

      expect(result).toEqual({
        ok: false,
        code: 'INTERNAL',
        detail: 'INCIDENT_NOT_STORED',
      });
    } finally {
      rejectIncidentSave = false;
      c1.close();
    }
  }, 15000);
});
