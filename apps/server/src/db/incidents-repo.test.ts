import { describe, expect, it } from 'vitest';
import { incidentFingerprint, type IncidentInput } from './incidents-repo.ts';

function input(overrides: Partial<IncidentInput> = {}): IncidentInput {
  return {
    incidentId: 'RND-A1B2C3D4',
    roomCode: 'ABCD',
    gameId: 'colores',
    reason: 'manual_block',
    occurredAt: 1,
    receivedAt: 2,
    release: 'test',
    path: '/sala/ABCD',
    clientStatus: 'playing',
    clientPhase: 'answering',
    pendingAction: true,
    errorName: 'TimeoutError',
    errorMessage: 'La acción 123 tardó 8000 ms',
    payload: {},
    ...overrides,
  };
}

describe('incidentFingerprint', () => {
  it('agrupa el mismo fallo aunque cambien sala, UUID y cifras', () => {
    const first = incidentFingerprint(input());
    const second = incidentFingerprint(
      input({
        roomCode: 'WXYZ',
        path: '/sala/WXYZ',
        errorMessage: 'La acción 987 tardó 12000 ms',
      }),
    );

    expect(second).toBe(first);
  });

  it('separa fases distintas para no mezclar bloqueos diferentes', () => {
    expect(incidentFingerprint(input({ clientPhase: 'answering' }))).not.toBe(
      incidentFingerprint(input({ clientPhase: 'reveal' })),
    );
  });
});
