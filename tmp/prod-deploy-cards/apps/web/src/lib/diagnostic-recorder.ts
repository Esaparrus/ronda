import type { DiagnosticEntry } from '@ronda/protocol';

const MAX_ENTRIES = 50;

let entries: DiagnosticEntry[] = [];

/** Añade una miga de pan segura al registrador circular del navegador. */
export function recordDiagnostic(kind: string, data: DiagnosticEntry['data'] = {}): void {
  entries = [...entries, { at: Date.now(), kind, data }].slice(-MAX_ENTRIES);
}

/** Devuelve una copia para que un informe no cambie mientras se está enviando. */
export function getDiagnosticEntries(): DiagnosticEntry[] {
  return entries.map((entry) => ({ ...entry, data: { ...entry.data } }));
}

/** Solo para tests y para cerrar explícitamente una sesión de diagnóstico. */
export function clearDiagnosticEntries(): void {
  entries = [];
}
