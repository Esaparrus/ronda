'use client';

import { useState } from 'react';
import { Toast } from '@/components/ui/Toast';
import { diagnosticContextFromState, reportClientIssue } from '@/lib/diagnostics';
import { useRondaStore } from '@/lib/store';

interface ReportResult {
  incidentId: string;
  sent: boolean;
}

export function ReportProblemButton() {
  const roomCode = useRondaStore((state) => state.roomCode);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);

  if (!roomCode) return null;

  async function handleReport() {
    if (reporting || result) return;
    setReporting(true);
    try {
      const report = await reportClientIssue(
        'manual_block',
        diagnosticContextFromState(useRondaStore.getState()),
      );
      setResult(report);
    } finally {
      setReporting(false);
    }
  }

  const message = result?.sent
    ? `Alerta enviada al equipo de desarrollo · ${result.incidentId}`
    : result
      ? `Sin conexión: alerta guardada para enviarla después · ${result.incidentId}`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleReport()}
        disabled={reporting || result !== null}
        aria-label="Enviar alerta de bloqueo al equipo de desarrollo"
        aria-busy={reporting}
        title="¿Algo se ha quedado bloqueado? Enviar alerta"
        className="fixed right-3 top-16 z-40 grid h-11 w-11 place-items-center rounded-full border border-linea bg-tinta/85 text-humo shadow-lg backdrop-blur-sm transition-[border-color,color,opacity,transform] hover:border-oro/60 hover:text-hueso active:scale-95 disabled:cursor-wait disabled:opacity-70"
      >
        {reporting ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-humo border-t-oro"
          />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 21V4" />
            <path d="M5 5c4-3 7 3 12 0v9c-5 3-8-3-12 0" />
          </svg>
        )}
      </button>

      {message ? (
        <Toast message={message} durationMs={5000} onDismiss={() => setResult(null)} />
      ) : null}
    </>
  );
}
