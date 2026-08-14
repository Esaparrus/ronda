import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDiagnosticEntries,
  getDiagnosticEntries,
  recordDiagnostic,
} from './diagnostic-recorder.ts';

describe('registrador de diagnóstico', () => {
  beforeEach(() => clearDiagnosticEntries());

  it('conserva solo los últimos 50 eventos', () => {
    for (let index = 0; index < 55; index += 1) {
      recordDiagnostic('state:view', { version: index });
    }
    const entries = getDiagnosticEntries();
    expect(entries).toHaveLength(50);
    expect(entries[0]?.data.version).toBe(5);
    expect(entries.at(-1)?.data.version).toBe(54);
  });

  it('devuelve copias que no pueden alterar el historial', () => {
    recordDiagnostic('socket:connect', { socketId: 'uno' });
    const copy = getDiagnosticEntries();
    const first = copy[0];
    if (!first) throw new Error('falta el evento de prueba');
    first.data.socketId = 'otro';
    expect(getDiagnosticEntries()[0]?.data.socketId).toBe('uno');
  });
});
