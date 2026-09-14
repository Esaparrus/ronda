import type { DiagnosticContext, DiagnosticReport, PlayerView, TableView } from '@ronda/protocol';
import { emitWithAck, getSocket } from './socket.ts';
import { createUuid } from './uuid.ts';
import { getDiagnosticEntries, recordDiagnostic } from './diagnostic-recorder.ts';

const QUEUE_KEY = 'ronda:diagnostics:v1';
const MAX_QUEUED_REPORTS = 5;

export type DiagnosticReason = DiagnosticReport['reason'];

export interface DiagnosticStateSource {
  roomCode: string | null;
  playerId: string | null;
  view: PlayerView | TableView | null;
  version: number;
  connection: DiagnosticContext['connection'];
  pendingAction: boolean;
  pendingSince: number | null;
}

export interface DiagnosticReportResult {
  incidentId: string;
  sent: boolean;
}

export function emptyDiagnosticContext(): DiagnosticContext {
  return {
    roomCode: null,
    playerId: null,
    gameId: null,
    viewKind: null,
    status: null,
    phase: null,
    version: 0,
    connection: 'offline',
    pendingAction: false,
    pendingSince: null,
  };
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' ? value.slice(0, 40) : null;
}

/** Extrae solo contexto público; nunca copia la mano ni respuestas del jugador. */
export function diagnosticContextFromState(state: DiagnosticStateSource): DiagnosticContext {
  const view = state.view as unknown as Record<string, unknown> | null;
  const party = view?.party as Record<string, unknown> | undefined;
  const rawKind = stringField(view?.kind);

  return {
    roomCode: state.roomCode,
    playerId: state.playerId,
    gameId: stringField(view?.gameId),
    viewKind: rawKind === 'player' || rawKind === 'table' ? rawKind : null,
    status: stringField(view?.status),
    phase: stringField(view?.phase) ?? stringField(party?.phase) ?? stringField(view?.turnPhase),
    version: state.version,
    connection: state.connection,
    pendingAction: state.pendingAction,
    pendingSince: state.pendingSince,
  };
}

function incidentId(): string {
  const compact = createUuid()
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  return `RND-${compact.padEnd(8, '0').slice(0, 8)}`;
}

function serializeError(error: unknown): DiagnosticReport['error'] {
  if (error === null || error === undefined) return null;
  if (error instanceof Error) {
    return {
      name: error.name.slice(0, 100),
      message: error.message.slice(0, 500),
      stack: error.stack?.slice(0, 4_000) ?? null,
    };
  }
  return { name: 'Error', message: String(error).slice(0, 500), stack: null };
}

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readQueue(): DiagnosticReport[] {
  const target = storage();
  if (!target) return [];
  try {
    const value = JSON.parse(target.getItem(QUEUE_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as DiagnosticReport[]).slice(-MAX_QUEUED_REPORTS) : [];
  } catch {
    return [];
  }
}

function writeQueue(reports: DiagnosticReport[]): void {
  const target = storage();
  if (!target) return;
  try {
    target.setItem(QUEUE_KEY, JSON.stringify(reports.slice(-MAX_QUEUED_REPORTS)));
  } catch {
    // El informe sigue teniendo un identificador visible aunque el navegador
    // no permita localStorage (modo privado estricto o cuota agotada).
  }
}

function queueReport(report: DiagnosticReport): void {
  const withoutDuplicate = readQueue().filter((item) => item.incidentId !== report.incidentId);
  writeQueue([...withoutDuplicate, report]);
}

async function sendNow(report: DiagnosticReport): Promise<boolean> {
  const socket = getSocket();
  if (!socket.connected) return false;
  const result = await emitWithAck(socket, 'diagnostic:report', report);
  return result.ok;
}

export async function reportClientIssue(
  reason: DiagnosticReason,
  context: DiagnosticContext,
  error: unknown = null,
): Promise<DiagnosticReportResult> {
  const report: DiagnosticReport = {
    incidentId: incidentId(),
    reason,
    occurredAt: Date.now(),
    path: typeof window === 'undefined' ? '' : window.location.pathname.slice(0, 240),
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 500),
    context,
    entries: getDiagnosticEntries(),
    error: serializeError(error),
  };

  let sent = false;
  try {
    sent = await sendNow(report);
  } catch {
    sent = false;
  }
  if (!sent) queueReport(report);
  recordDiagnostic('diagnostic:created', { incidentId: report.incidentId, reason, sent });
  return { incidentId: report.incidentId, sent };
}

/** Reintenta informes creados sin conexión. Los conserva si vuelve a fallar. */
export async function flushQueuedDiagnostics(): Promise<void> {
  const reports = readQueue();
  if (reports.length === 0 || !getSocket().connected) return;

  const pending: DiagnosticReport[] = [];
  for (const report of reports) {
    try {
      if (!(await sendNow(report))) pending.push(report);
    } catch {
      pending.push(report);
    }
  }
  writeQueue(pending);
}
