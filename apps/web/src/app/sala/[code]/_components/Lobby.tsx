// Lobby: código + QR para unirse, lista de jugadores, y controles de
// anfitrión (variantes, expulsar, empezar). Contrato P14.
'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { ChinchonConfig, GameConfig, PlayerView, PochaConfig } from '@ronda/protocol';
import { messageFor } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { RoomCode } from '@/components/ui/RoomCode';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { StatsPanel } from '@/components/ui/StatsPanel';

// Genérico por `gameId` desde que Pocha tiene su propio lobby (los campos
// que usa este componente -- roomCode/players/me.playerId/config -- son
// comunes a cualquier `PlayerView`; solo la sección "Variantes" se ramifica
// por juego, ver ChinchonVariants/PochaVariants más abajo).
export interface LobbyProps {
  view: PlayerView;
}

export function Lobby({ view }: LobbyProps) {
  const lastError = useRondaStore((s) => s.lastError);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [config, setConfig] = useState<GameConfig>(view.config);

  const me = view.players.find((p) => p.playerId === view.me.playerId);
  const isHost = me?.isHost ?? false;
  const joinUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/unirse/${view.roomCode}` : '';

  useEffect(() => {
    // El código QR se genera en el cliente (contrato P14): no hay servicio
    // externo de por medio, solo la librería `qrcode` sobre el enlace de
    // unirse con el código precargado.
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 200 })
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

  // La config del lobby puede cambiar por otro jugador o por el servidor
  // (normalización de defaults); se resincroniza si no la estamos editando
  // nosotros mismos en este instante (evita pisar un cambio a medio hacer).
  useEffect(() => {
    setConfig(view.config);
  }, [view.config]);

  async function handleCopyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: no hay nada más que hacer aquí.
    }
  }

  function setChinchonField<K extends keyof ChinchonConfig>(key: K, value: ChinchonConfig[K]) {
    setConfig((prev) => ({ ...(prev as ChinchonConfig), [key]: value }));
    void useRondaStore.getState().updateConfig({ [key]: value } as Partial<ChinchonConfig>);
  }

  function setPochaField<K extends keyof PochaConfig>(key: K, value: PochaConfig[K]) {
    setConfig((prev) => ({ ...(prev as PochaConfig), [key]: value }));
    void useRondaStore.getState().updateConfig({ [key]: value } as Partial<PochaConfig>);
  }

  async function handleStart() {
    setStarting(true);
    await useRondaStore.getState().startRoom();
    setStarting(false);
  }

  async function handleKick(playerId: string) {
    await useRondaStore.getState().kickPlayer(playerId);
  }

  async function handleAddBot() {
    setAddingBot(true);
    await useRondaStore.getState().addBot();
    setAddingBot(false);
  }

  // Mínimo de jugadores por juego: 2 en Chinchón, 3 en Pocha (§9.2, "fijo,
  // no configurable") -- mismo criterio que `minPlayersFor` del servidor
  // (apps/server/src/rooms/room-manager.ts).
  const minPlayers = view.gameId === 'pocha' ? 3 : 2;
  const canStart = view.players.length >= minPlayers;
  const hasFreeSeat = view.players.length < config.maxPlayers;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-8">
      <header className="flex flex-col items-center gap-4">
        <h1 className="font-display text-28 leading-display text-hueso">Sala</h1>
        <RoomCode code={view.roomCode} />
      </header>

      <section className="flex flex-col items-center gap-3">
        {qrDataUrl ? (
          // <img> normal a propósito: es una data URL generada en el
          // cliente (QRCode.toDataURL), no un asset estático que
          // next/image pueda optimizar.
          <img
            src={qrDataUrl}
            alt={`Código QR para unirse a la sala ${view.roomCode}`}
            width={160}
            height={160}
            className="rounded-lg border border-linea"
          />
        ) : null}
        <Button variant="ghost" onClick={handleCopyLink}>
          {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-20 font-semibold text-hueso">Jugadores</h2>
        <ul className="flex flex-col gap-2">
          {view.players.map((p) => (
            <li
              key={p.playerId}
              className="flex items-center gap-3 rounded-lg border border-linea bg-mesa px-3 py-2"
            >
              <Avatar name={p.nick} colorIndex={p.colorIndex} size={36} />
              <span className="flex-1 truncate text-16 text-hueso">{p.nick}</span>
              {p.isHost ? <Pill>Anfitrión</Pill> : null}
              <Pill>{p.connected ? 'Conectado' : 'Desconectado'}</Pill>
              {isHost && !p.isHost ? (
                // Contrato §8.5.2 / P18: zona táctil mínima 56px -- se
                // mantiene el min-h-14 por defecto del Button.
                <Button variant="danger" onClick={() => handleKick(p.playerId)} className="px-3">
                  Expulsar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {isHost && hasFreeSeat ? (
          <Button variant="ghost" onClick={handleAddBot} loading={addingBot}>
            Añadir jugador IA
          </Button>
        ) : null}
        {/* Estadísticas del grupo (roadmap "Después del MVP" §3). En el
            lobby es donde tienen sentido: es el momento entre partidas.
            Van en una hoja, no en la pantalla, para no robarle sitio al
            código de sala ni al QR, que es lo que la gente mira aquí. */}
        <button
          type="button"
          onClick={() => setStatsOpen(true)}
          className="self-center text-14 text-brasa underline"
        >
          Estadísticas del grupo
        </button>
      </section>

      {isHost ? (
        <section className="flex flex-col gap-6">
          <h2 className="text-20 font-semibold text-hueso">Variantes</h2>
          {view.gameId === 'pocha' ? (
            <PochaVariantsSection config={config as PochaConfig} setField={setPochaField} />
          ) : (
            <ChinchonVariantsSection config={config as ChinchonConfig} setField={setChinchonField} />
          )}
        </section>
      ) : null}

      {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

      {isHost ? (
        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={handleStart} disabled={!canStart} loading={starting}>
            Empezar
          </Button>
          {!canStart ? (
            <p className="text-12 text-humo">{messageFor('NOT_ENOUGH_PLAYERS')}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto text-center text-14 text-humo">
          Esperando a que el anfitrión empiece la partida.
        </p>
      )}

      <Sheet open={statsOpen} onClose={() => setStatsOpen(false)}>
        <div className="flex flex-col gap-4">
          <h2 className="text-20 font-semibold text-hueso">Estadísticas del grupo</h2>
          <StatsPanel refreshKey={statsOpen ? 'abierto' : 'cerrado'} />
          <Button variant="ghost" onClick={() => setStatsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </Sheet>
    </main>
  );
}

interface ChinchonVariantsSectionProps {
  config: ChinchonConfig;
  setField: <K extends keyof ChinchonConfig>(key: K, value: ChinchonConfig[K]) => void;
}

function ChinchonVariantsSection({ config, setField }: ChinchonVariantsSectionProps) {
  return (
    <>
      <SegmentedControl
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => setField('maxPlayers', v)}
        options={[
          { value: 2, label: '2' },
          { value: 3, label: '3' },
          { value: 4, label: '4' },
        ]}
      />
      <SegmentedControl
        legend="Comodines"
        helperText="Cuántos comodines lleva la baraja."
        value={config.jokers}
        onChange={(v) => setField('jokers', v)}
        options={[
          { value: 0, label: 'Sin comodines' },
          { value: 2, label: 'Con comodines' },
        ]}
      />
      <SegmentedControl
        legend="Umbral de cierre"
        helperText="Puntos sueltos máximos para poder cerrar."
        value={config.closeThreshold}
        onChange={(v) => setField('closeThreshold', v)}
        options={[
          { value: 0, label: '0' },
          { value: 3, label: '3' },
          { value: 5, label: '5' },
          { value: 10, label: '10' },
        ]}
      />
      <SegmentedControl
        legend="Puntuación de eliminación"
        helperText="Puntos para quedar eliminado de la partida."
        value={config.eliminationScore}
        onChange={(v) => setField('eliminationScore', v)}
        options={[
          { value: 50, label: '50' },
          { value: 100, label: '100' },
          { value: 150, label: '150' },
        ]}
      />
      <SegmentedControl
        legend="Chinchón acaba la partida"
        helperText="Un chinchón termina la partida en el acto."
        value={config.chinchonEndsGame}
        onChange={(v) => setField('chinchonEndsGame', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
    </>
  );
}

interface PochaVariantsSectionProps {
  config: PochaConfig;
  setField: <K extends keyof PochaConfig>(key: K, value: PochaConfig[K]) => void;
}

function PochaVariantsSection({ config, setField }: PochaVariantsSectionProps) {
  return (
    <>
      <SegmentedControl
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => setField('maxPlayers', v)}
        options={[
          { value: 3, label: '3' },
          { value: 4, label: '4' },
          { value: 5, label: '5' },
          { value: 6, label: '6' },
        ]}
      />
      <SegmentedControl
        legend="Triunfo"
        helperText="Se revela una carta y su palo manda en la ronda."
        value={config.trump}
        onChange={(v) => setField('trump', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
      <SegmentedControl
        legend="Orden de fuerza"
        helperText="Qué carta gana la baza dentro de un palo."
        value={config.rankOrder}
        onChange={(v) => setField('rankOrder', v)}
        options={[
          { value: 'numerico', label: 'Numérico' },
          { value: 'brisca', label: 'Brisca' },
        ]}
      />
    </>
  );
}
