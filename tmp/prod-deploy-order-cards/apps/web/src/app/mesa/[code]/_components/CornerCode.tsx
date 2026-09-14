// Esquina superior: código de sala y QR pequeño permanente, para que
// alguien se una desde la mesa. Contrato P15. Se muestra en cualquier
// status salvo 'lobby' (ese ya tiene el código a pantalla completa en
// MesaLobbyBoard).
'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { TableView } from '@ronda/protocol';

export interface CornerCodeProps {
  view: TableView;
}

export function CornerCode({ view }: CornerCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const joinUrl = `${window.location.origin}/unirse/${view.roomCode}`;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 96 })
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
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-linea bg-mesa/80 px-3 py-2">
      {qrDataUrl ? (
        // <img> normal: data URL generada en cliente, no un asset estático.
        <img
          src={qrDataUrl}
          alt={`Código QR para unirse a la sala ${view.roomCode}`}
          width={40}
          height={40}
          className="rounded"
        />
      ) : null}
      <span className="font-mono text-16 tracking-widest text-hueso">{view.roomCode}</span>
    </div>
  );
}
