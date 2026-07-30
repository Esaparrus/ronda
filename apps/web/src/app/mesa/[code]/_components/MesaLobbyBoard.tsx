// "Si no hay partida en curso, muestra el código a pantalla completa y la
// lista de quién ha entrado." Contrato P15. Sin controles: la pantalla
// central nunca puede accionar nada, eso vive en /sala/[code] (P14).
'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { TableView } from '@ronda/protocol';
import { RoomCode } from '@/components/ui/RoomCode';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';

export interface MesaLobbyBoardProps {
  view: TableView;
}

export function MesaLobbyBoard({ view }: MesaLobbyBoardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const joinUrl = `${window.location.origin}/unirse/${view.roomCode}`;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [view.roomCode]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-10 px-10 py-8">
      <div className="flex flex-col items-center gap-6">
        <p className="text-[clamp(1.25rem,2.2vw,1.75rem)] text-humo">Uniros desde el móvil</p>
        <RoomCode code={view.roomCode} className="scale-[1.8]" />
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Código QR para unirse a la sala ${view.roomCode}`}
            width={220}
            height={220}
            className="mt-8 rounded-lg border border-linea"
          />
        ) : null}
      </div>

      <ul className="flex flex-wrap items-center justify-center gap-6">
        {view.players.map((p) => (
          <li key={p.playerId} className="flex flex-col items-center gap-2">
            <Avatar
              name={p.nick}
              colorIndex={p.colorIndex}
              size={64}
              className={p.connected ? '' : 'opacity-40'}
            />
            <span className="text-[clamp(1rem,1.6vw,1.5rem)] text-hueso">{p.nick}</span>
            {p.isHost ? <Pill>Anfitrión</Pill> : null}
          </li>
        ))}
        {view.players.length === 0 ? (
          <li className="text-16 text-humo">Todavía no se ha unido nadie.</li>
        ) : null}
      </ul>
    </main>
  );
}
