import { describe, expect, it } from 'vitest';
import { DiagnosticReportSchema, type DiagnosticReport } from './socket.ts';

function report(): DiagnosticReport {
  return {
    incidentId: 'RND-A1B2C3D4',
    reason: 'manual_block',
    occurredAt: 1_700_000_000_000,
    path: '/sala/ABCD',
    release: 'abc123',
    userAgent: 'test',
    context: {
      roomCode: 'ABCD',
      playerId: 'p1',
      gameId: 'chinchon',
      viewKind: 'player',
      status: 'playing',
      phase: 'discard',
      version: 12,
      connection: 'online',
      pendingAction: true,
      pendingSince: 1_700_000_000_000,
    },
    entries: [{ at: 1_700_000_000_000, kind: 'socket:ack', data: { ok: true } }],
    error: null,
  };
}

describe('DiagnosticReportSchema', () => {
  it('acepta un informe acotado y sin datos privados', () => {
    expect(DiagnosticReportSchema.safeParse(report()).success).toBe(true);
  });

  it('rechaza tokens o respuestas libres dentro de las migas', () => {
    const withToken = report() as unknown as { entries: Array<{ data: Record<string, unknown> }> };
    const tokenEntry = withToken.entries[0];
    if (!tokenEntry) throw new Error('falta la entrada de prueba');
    tokenEntry.data.playerToken = 'secreto';
    expect(DiagnosticReportSchema.safeParse(withToken).success).toBe(false);

    const withAnswer = report() as unknown as { entries: Array<{ data: Record<string, unknown> }> };
    const answerEntry = withAnswer.entries[0];
    if (!answerEntry) throw new Error('falta la entrada de prueba');
    answerEntry.data.answer = 'texto libre';
    expect(DiagnosticReportSchema.safeParse(withAnswer).success).toBe(false);
  });

  it('rechaza campos extra y más de 50 eventos', () => {
    const withExtra = { ...report(), playerToken: 'secreto' };
    expect(DiagnosticReportSchema.safeParse(withExtra).success).toBe(false);

    const tooMany = report();
    tooMany.entries = Array.from({ length: 51 }, (_, index) => ({
      at: index,
      kind: 'state:view',
      data: {},
    }));
    expect(DiagnosticReportSchema.safeParse(tooMany).success).toBe(false);
  });
});
