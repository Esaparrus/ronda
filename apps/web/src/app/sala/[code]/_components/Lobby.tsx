// Sala de espera: una sola pantalla para invitar, ver quién ha entrado y empezar.
'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { PlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { RoomCode } from '@/components/ui/RoomCode';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';

export interface LobbyProps {
  view: PlayerView;
  onReviewRules: () => void;
}

export function Lobby({ view, onReviewRules }: LobbyProps) {
  const lastError = useRondaStore((state) => state.lastError);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [addingBot, setAddingBot] = useState(false);

  const me = view.players.find((player) => player.playerId === view.me.playerId);
  const isHost = me?.isHost ?? false;
  const joinUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/unirse/${view.roomCode}` : '';

  useEffect(() => {
    if (!joinUrl) return;
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
  }, [joinUrl]);

  async function handleCopyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // El QR y el código siguen disponibles si el navegador niega el portapapeles.
    }
  }

  async function handleStart() {
    setStarting(true);
    await useRondaStore.getState().startRoom();
    setStarting(false);
  }

  async function handleAddBot() {
    setAddingBot(true);
    try {
      // Mus necesita exactamente cuatro jugadores. Un solo clic completa los
      // huecos para que se pueda entrar a probar la partida inmediatamente.
      const botsToAdd = view.gameId === 'mus' ? view.config.maxPlayers - view.players.length : 1;
      for (let i = 0; i < botsToAdd; i++) {
        const added = await useRondaStore.getState().addBot();
        if (!added) break;
      }
    } finally {
      setAddingBot(false);
    }
  }

  const minimumPlayers = view.gameId === 'mus' ? 4 : view.gameId === 'laronda' ? 3 : 2;
  const canStart = view.players.length >= minimumPlayers;
  const minimumLabel = minimumPlayers === 4 ? 'cuatro' : minimumPlayers === 3 ? 'tres' : 'dos';
  const supportsBots = true;
  const hasFreeSeat = view.players.length < view.config.maxPlayers;

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-5">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="eyebrow">Sala creada</span>
        <h1 className="font-display text-28 leading-display text-hueso">Invita al resto</h1>
        <p className="max-w-xs text-14 text-humo">
          Pueden escanear el QR o escribir estas cuatro letras.
        </p>
        <RoomCode code={view.roomCode} />
        <button
          type="button"
          onClick={onReviewRules}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-verde/70 bg-verde/15 px-4 text-13 font-semibold text-crema transition-[border-color,background-color,transform] hover:border-oro/60 hover:bg-verde/25 active:translate-y-0.5"
        >
          <span className="text-oro" aria-hidden="true">
            ✓
          </span>
          Explicación vista · Repasar reglas
        </button>
      </header>

      <section className="flex flex-col items-center gap-3" aria-label="Invitación a la sala">
        {qrDataUrl ? (
          // Es una data URL generada en el cliente; next/image no puede optimizarla.
          <img
            src={qrDataUrl}
            alt={`Código QR para unirse a la sala ${view.roomCode}`}
            width={184}
            height={184}
            className="rounded-xl border border-linea bg-white p-1"
          />
        ) : null}
        <Button variant="ghost" onClick={handleCopyLink}>
          {copied ? 'Enlace copiado' : 'Copiar enlace para entrar'}
        </Button>
      </section>

      <section className="flex flex-col gap-3" aria-live="polite">
        <h2 className="text-20 font-semibold text-hueso">Ya están dentro</h2>
        <ul className="flex flex-col gap-2">
          {view.players.map((player) => (
            <li
              key={player.playerId}
              className="interactive-surface flex min-h-14 items-center gap-3 px-3 py-2"
            >
              <Avatar name={player.nick} colorIndex={player.colorIndex} size={36} />
              <span className="min-w-0 flex-1 truncate text-16 text-hueso">{player.nick}</span>
              {player.isHost ? <Pill>Anfitrión</Pill> : null}
              {!player.connected ? <Pill>Reconectando</Pill> : null}
            </li>
          ))}
        </ul>
        {isHost && supportsBots && hasFreeSeat ? (
          <div className="flex flex-col gap-2">
            <Button variant="ghost" onClick={handleAddBot} loading={addingBot}>
              {view.gameId === 'mus'
                ? 'Completar mesa con IA'
                : view.players.length === 1
                  ? 'Jugar contra un bot'
                  : 'Añadir bot'}
            </Button>
            <p className="text-center text-12 text-humo">
              {view.gameId === 'mus'
                ? 'Añade automáticamente los robots que falten hasta completar las dos parejas.'
                : 'Añade jugadores automáticos para practicar o simular una partida.'}
            </p>
          </div>
        ) : null}
      </section>

      {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

      {isHost ? (
        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={handleStart} disabled={!canStart} loading={starting}>
            Empezar partida
          </Button>
          {!canStart ? (
            <p className="text-center text-12 text-humo">
              Esperando: hacen falta {minimumLabel} jugadores.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto text-center text-14 text-humo">
          La partida empezará cuando el anfitrión pulse Empezar.
        </p>
      )}
    </main>
  );
}
