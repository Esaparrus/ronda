'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { diagnosticContextFromState, reportClientIssue } from '@/lib/diagnostics';
import { useRondaStore } from '@/lib/store';

interface ReportResult {
  incidentId: string;
  sent: boolean;
}

export function ReportProblemButton() {
  const roomCode = useRondaStore((state) => state.roomCode);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);

  if (!roomCode && !open) return null;

  async function handleReport() {
    setReporting(true);
    const report = await reportClientIssue(
      'manual_block',
      diagnosticContextFromState(useRondaStore.getState()),
    );
    setResult(report);
    setReporting(false);
  }

  function closeSheet() {
    if (reporting) return;
    setOpen(false);
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // La barra de sala ya ocupa la esquina superior derecha (allí está
        // "Cerrar sala" para el anfitrión). Dejamos el acceso de diagnóstico
        // justo debajo para que ninguno de los dos botones capture el clic
        // del otro en pantallas estrechas.
        className="fixed right-3 top-16 z-40 min-h-11 rounded-full border border-linea bg-tinta/85 px-3 text-12 font-semibold text-humo shadow-lg backdrop-blur-sm hover:border-oro/60 hover:text-hueso"
      >
        ¿Bloqueado?
      </button>

      <Sheet open={open} onClose={closeSheet} ariaLabel="Informar de un bloqueo">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-2">
          {result ? (
            <>
              <div>
                <p className="eyebrow">Informe creado</p>
                <h2 className="mt-2 font-display text-28 leading-display text-hueso">
                  Código {result.incidentId}
                </h2>
              </div>
              <p className="text-14 text-humo">
                {result.sent
                  ? 'Se ha enviado el estado de la partida y los últimos movimientos.'
                  : 'Se ha guardado en este dispositivo y se enviará cuando vuelva la conexión.'}
              </p>
              <Button onClick={closeSheet}>Cerrar</Button>
            </>
          ) : (
            <>
              <div>
                <p className="eyebrow">Ayuda para depurar</p>
                <h2 className="mt-2 font-display text-28 leading-display text-hueso">
                  ¿Se ha quedado parado?
                </h2>
              </div>
              <p className="text-14 text-humo">
                Guardaremos el estado técnico y los últimos movimientos. No se envían claves, apodos
                ni el texto de vuestras respuestas.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={closeSheet} disabled={reporting}>
                  Cancelar
                </Button>
                <Button onClick={handleReport} loading={reporting}>
                  Crear informe
                </Button>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
