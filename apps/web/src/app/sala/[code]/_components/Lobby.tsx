// Sala de espera: una sola pantalla para invitar, ver quién ha entrado y empezar.
'use client';

import QRCode from 'qrcode';
import { useEffect, useState, type DragEvent } from 'react';
import type { PlayerId, PlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { RoomCode } from '@/components/ui/RoomCode';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { GameGlyph } from '@/components/ui/GameGlyph';
import { Icon } from '@/components/ui/Icon';

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
  const [draggingPlayerId, setDraggingPlayerId] = useState<PlayerId | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);

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
        const added = await useRondaStore
          .getState()
          .addBot(view.gameId === 'musical' ? 5_000 : undefined);
        if (!added) break;
      }
    } finally {
      setAddingBot(false);
    }
  }

  const minimumPlayers =
    view.gameId === 'mus' ? 4 : view.gameId === 'laronda' || view.gameId === 'granronda' ? 3 : 2;
  const scaleGroups =
    view.gameId === 'escala' && view.config.groupMode === 'groups' ? view.config.groupCount : null;
  const groupSizes = scaleGroups
    ? Array.from(
        { length: scaleGroups },
        (_, groupIndex) => view.players.filter((player) => player.groupIndex === groupIndex).length,
      )
    : [];
  const scaleGroupPlayers = scaleGroups
    ? Array.from({ length: scaleGroups }, (_, groupIndex) =>
        view.players.filter((player) => player.groupIndex === groupIndex),
      )
    : [];
  const groupsReady = scaleGroups === null || groupSizes.every((size) => size >= 2);
  const canStart = view.players.length >= minimumPlayers && groupsReady;
  const minimumLabel = minimumPlayers === 4 ? 'cuatro' : minimumPlayers === 3 ? 'tres' : 'dos';
  const hasFreeSeat = view.players.length < view.config.maxPlayers;

  function handleDrop(groupIndex: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isHost || !draggingPlayerId) return;

    const targetPlayerId = draggingPlayerId;
    setDraggingPlayerId(null);
    setDragOverGroupIndex(null);
    void useRondaStore.getState().setPlayerGroup(targetPlayerId, groupIndex);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-5">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="game-glyph-tile size-14 rounded-[18px]" data-game={view.gameId}>
          <GameGlyph game={view.gameId} size={26} />
        </span>
        <span className="eyebrow">Sala creada</span>
        <h1 className="font-display text-[30px] leading-display text-hueso">Invita al resto</h1>
        <p className="max-w-xs text-14 leading-relaxed text-humo">
          Pueden escanear el QR o escribir estas cuatro letras.
        </p>
        <RoomCode code={view.roomCode} />
        <button
          type="button"
          onClick={onReviewRules}
          className="glass-button min-h-11 px-4 text-13 font-semibold text-oro"
        >
          <Icon name="book" size={16} />
          Explicación vista · Repasar reglas
        </button>
      </header>

      <section
        className="surface-panel flex flex-col items-center gap-3 p-4"
        aria-label="Invitación a la sala"
      >
        {qrDataUrl ? (
          // Es una data URL generada en el cliente; next/image no puede optimizarla.
          <img
            src={qrDataUrl}
            alt={`Código QR para unirse a la sala ${view.roomCode}`}
            width={184}
            height={184}
            className="rounded-[20px] border border-linea/70 bg-white p-2 shadow-sm"
          />
        ) : null}
        <Button variant="ghost" onClick={handleCopyLink}>
          <span className="inline-flex items-center gap-2">
            <Icon name={copied ? 'check' : 'share'} size={17} />
            {copied ? 'Enlace copiado' : 'Copiar enlace para entrar'}
          </span>
        </Button>
      </section>

      <section className="flex flex-col gap-3" aria-live="polite">
        <h2 className="flex items-center gap-2 text-20 font-semibold text-hueso">
          <span className="icon-disc size-9">
            <Icon name="users" size={17} />
          </span>
          Ya están dentro
        </h2>
        <ul className="flex flex-col gap-2">
          {view.players.map((player) => (
            <li
              key={player.playerId}
              className="interactive-surface flex min-h-14 items-center gap-3 px-3 py-2"
            >
              <Avatar name={player.nick} colorIndex={player.colorIndex} size={36} />
              <span className="min-w-0 flex-1 truncate text-16 text-hueso">{player.nick}</span>
              {player.isBot ? <Pill>IA</Pill> : null}
              {player.isHost ? <Pill>Anfitrión</Pill> : null}
              {!player.connected ? <Pill>Reconectando</Pill> : null}
            </li>
          ))}
        </ul>
        {scaleGroups !== null ? (
          <section className="surface-panel flex flex-col gap-4 p-4">
            <div>
              <h3 className="text-16 font-semibold text-hueso">Grupos de competición</h3>
              <p className="mt-1 text-12 leading-relaxed text-humo">
                Se han repartido al azar para empezar. Cada grupo necesita al menos dos jugadores y
                la misma escala pasará por todos los grupos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scaleGroupPlayers.map((players, groupIndex) => (
                <div
                  key={groupIndex}
                  onDragOver={(event) => {
                    if (!isHost) return;
                    event.preventDefault();
                    setDragOverGroupIndex(groupIndex);
                  }}
                  onDragLeave={() => setDragOverGroupIndex(null)}
                  onDrop={(event) => handleDrop(groupIndex, event)}
                  className={`rounded-2xl border p-3 transition-colors ${
                    dragOverGroupIndex === groupIndex
                      ? 'border-oro bg-oro/10'
                      : 'border-linea bg-tinta/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-14 font-semibold text-hueso">
                      Grupo {groupLetter(groupIndex)}
                    </span>
                    <Pill>{players.length}</Pill>
                  </div>
                  <div
                    className="mt-3 flex min-h-14 flex-wrap content-start gap-2"
                    aria-label={`Jugadores del grupo ${groupLetter(groupIndex)}`}
                  >
                    {players.map((player) => (
                      <div
                        key={player.playerId}
                        draggable={isHost}
                        onDragStart={(event) => {
                          if (!isHost) return;
                          setDraggingPlayerId(player.playerId);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', player.playerId);
                        }}
                        onDragEnd={() => {
                          setDraggingPlayerId(null);
                          setDragOverGroupIndex(null);
                        }}
                        className={`rounded-xl border border-linea bg-mesa px-3 py-2 text-13 text-hueso ${
                          isHost ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                        aria-label={isHost ? `Arrastra a ${player.nick} a otro grupo` : player.nick}
                      >
                        {player.nick}
                      </div>
                    ))}
                    {players.length === 0 ? (
                      <span className="self-center text-12 text-humo">Arrastra aquí</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-12 leading-relaxed text-humo">
              {isHost
                ? 'Arrastra los nombres entre grupos o usa los botones para recolocarlos.'
                : 'El anfitrión puede arrastrar los nombres entre grupos antes de empezar.'}
            </p>
            <div className="flex flex-col gap-3">
              {view.players.map((player) => (
                <div key={player.playerId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-14 text-hueso">{player.nick}</span>
                  <div className="flex gap-1" role="group" aria-label={`Mover a ${player.nick}`}>
                    {Array.from({ length: scaleGroups }, (_, groupIndex) => {
                      const selected = player.groupIndex === groupIndex;
                      return (
                        <button
                          key={groupIndex}
                          type="button"
                          disabled={!isHost}
                          aria-label={`Mover a ${player.nick} al grupo ${groupLetter(groupIndex)}`}
                          aria-pressed={selected}
                          onClick={() =>
                            void useRondaStore
                              .getState()
                              .setPlayerGroup(player.playerId, groupIndex)
                          }
                          className={`grid size-10 place-items-center rounded-xl border text-14 font-semibold transition-colors disabled:cursor-default ${
                            selected
                              ? 'border-oro bg-oro/15 text-oro'
                              : 'border-linea bg-tinta/20 text-humo enabled:hover:bg-mesa'
                          }`}
                        >
                          {groupLetter(groupIndex)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!groupsReady ? (
              <p className="text-12 text-brasa">
                Falta completar{' '}
                {groupSizes.filter((size) => size < 2).length === 1 ? 'un grupo' : 'algunos grupos'}
                .
              </p>
            ) : (
              <p className="text-12 text-verde">
                {groupSizes
                  .map((size, index) => `Grupo ${groupLetter(index)}: ${size}`)
                  .join(' · ')}
              </p>
            )}
          </section>
        ) : null}
        {isHost && hasFreeSeat ? (
          <div className="surface-panel flex flex-col gap-3 p-4">
            <div>
              <h3 className="text-16 font-semibold text-hueso">Añadir IA</h3>
              <p className="mt-1 text-12 text-humo">
                {view.gameId === 'musical'
                  ? 'La IA responde a los cinco segundos para que puedas probar la partida.'
                  : view.gameId === 'mus'
                    ? 'Completa automáticamente los huecos de la mesa.'
                    : 'Añade jugadores automáticos para practicar.'}
              </p>
            </div>
            <Button variant="ghost" onClick={handleAddBot} loading={addingBot}>
              {view.gameId === 'mus' ? 'Completar mesa con IA' : 'Añadir IA'}
            </Button>
          </div>
        ) : null}
      </section>

      {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

      {isHost ? (
        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={handleStart} disabled={!canStart} loading={starting}>
            <span className="inline-flex items-center gap-2">
              <Icon name="play" size={18} /> Empezar partida
            </span>
          </Button>
          {!canStart ? (
            <p className="text-center text-12 text-humo">
              {scaleGroups !== null && !groupsReady
                ? 'Completa los grupos para empezar.'
                : `Esperando: hacen falta ${minimumLabel} jugadores.`}
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

function groupLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}
