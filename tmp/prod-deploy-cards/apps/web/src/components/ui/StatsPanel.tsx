// Estadísticas del grupo, guardadas por sala. Roadmap "Después del MVP" §3
// de 02-PAQUETES.md.
//
// Se piden a demanda (`room:stats`), no llegan en el snapshot: ver la nota
// de `packages/protocol/src/stats.ts`. Este componente se encarga de pedirlas
// al montarse y de refrescarlas cuando cambia `refreshKey` (por ejemplo, al
// terminar una partida).
'use client';

import { useEffect, useState } from 'react';
import type { RoomStats } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';

export interface StatsPanelProps {
  /**
   * Cambia este valor para forzar una recarga (p. ej. el número de ronda o
   * el estado de la vista). Sin él, el panel pide las cifras una sola vez.
   */
  refreshKey?: string | number;
  className?: string;
}

export function StatsPanel({ refreshKey, className = '' }: StatsPanelProps) {
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void useRondaStore
      .getState()
      .fetchStats()
      .then((s) => {
        if (!cancelled) {
          setStats(s);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <p className={`text-14 text-humo ${className}`}>Cargando las estadísticas…</p>;
  }

  if (!stats || stats.matches === 0) {
    return (
      <p className={`text-14 text-humo ${className}`}>
        Todavía no habéis terminado ninguna partida en esta sala.
      </p>
    );
  }

  // "Mejor" no significa lo mismo en los dos juegos: en Chinchón es la
  // puntuación más baja y en Pocha la más alta (el servidor ya elige cuál
  // guardar, ver stats.ts). El encabezado lo dice para que nadie lo dude.
  const bestLabel = stats.gameId === 'chinchon' ? 'Mejor (mín.)' : 'Mejor (máx.)';

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <p className="text-14 text-humo">
        {stats.matches} {stats.matches === 1 ? 'partida jugada' : 'partidas jugadas'} en esta sala.
      </p>
      {/* La tabla puede desbordar en pantallas estrechas: se desplaza ella
          sola, nunca el cuerpo de la página. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-72 border-collapse text-left">
          <thead>
            <tr className="text-12 text-humo">
              <th scope="col" className="py-1 pr-2 font-normal">
                Jugador
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">
                PJ
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">
                Ganadas
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">
                {bestLabel}
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Rondas
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.rows.map((r) => (
              <tr key={r.playerId} className="border-t border-linea">
                <td className="flex items-center gap-2 py-2 pr-2 text-16 text-hueso">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: `var(--seat-${r.seat})` }}
                  />
                  <span className="truncate">{r.nick}</span>
                </td>
                <td className="py-2 pr-2 text-right font-mono text-16 text-hueso">{r.matches}</td>
                <td className="py-2 pr-2 text-right font-mono text-16 text-hueso">{r.wins}</td>
                <td className="py-2 pr-2 text-right font-mono text-16 text-hueso">
                  {r.bestScore ?? '—'}
                </td>
                <td className="py-2 text-right font-mono text-16 text-humo">{r.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
