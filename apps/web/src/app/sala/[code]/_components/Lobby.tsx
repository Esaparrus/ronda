// Lobby: código + QR para unirse, lista de jugadores, y controles de
// anfitrión (variantes, expulsar, empezar). Contrato P14.
'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type {
  ChinchonConfig,
  GameConfig,
  MusConfig,
  PartyConfig,
  PlayerView,
  PochaConfig,
} from '@ronda/protocol';
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
  // Mus: primer jugador marcado para intercambiar asiento (§12.2, decisión 1
  // de P28). Se toca uno, se toca otro, y cambian de sitio.
  const [swapFrom, setSwapFrom] = useState<string | null>(null);

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

  function setMusField<K extends keyof MusConfig>(key: K, value: MusConfig[K]) {
    setConfig((prev) => ({ ...(prev as MusConfig), [key]: value }));
    void useRondaStore.getState().updateConfig({ [key]: value } as Partial<MusConfig>);
  }

  function setPartyField(
    key: 'maxPlayers' | 'rounds' | 'cardsPerPlayer' | 'pointsToWin',
    value: number,
  ) {
    setConfig((prev) => ({ ...(prev as PartyConfig), [key]: value }) as GameConfig);
    void useRondaStore.getState().updateConfig({ [key]: value } as Partial<GameConfig>);
  }

  /** Mus: marca a un jugador, o lo intercambia con el ya marcado. */
  async function handleSeatTap(playerId: string) {
    if (swapFrom === null) {
      setSwapFrom(playerId);
      return;
    }
    if (swapFrom === playerId) {
      setSwapFrom(null);
      return;
    }
    const from = swapFrom;
    setSwapFrom(null);
    await useRondaStore.getState().swapSeats(from, playerId);
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
  // no configurable") y 4 en Mus (§12.2, "no hay Mus sin cuatro") -- mismo
  // criterio que `minPlayersFor` del servidor
  // (apps/server/src/rooms/room-manager.ts).
  const isMus = view.gameId === 'mus';
  const isParty =
    view.gameId === 'orden' ||
    view.gameId === 'colores' ||
    view.gameId === 'mayoria' ||
    view.gameId === 'escala';
  const minPlayers = isMus
    ? 4
    : view.gameId === 'pocha' || view.gameId === 'colores' || view.gameId === 'mayoria' || view.gameId === 'escala'
      ? 3
      : 2;
  const canStart = view.players.length >= minPlayers;
  // Mus no tiene bots (§12.11): el servidor rechaza `room:addBot` en sus
  // salas, así que aquí ni se ofrece.
  const hasFreeSeat = !isMus && view.players.length < config.maxPlayers;

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
        {isMus ? (
          <p className="text-14 text-humo">
            {isHost
              ? 'Los compañeros se sientan enfrentados. Toca a dos jugadores para cambiarlos de sitio y formar las parejas.'
              : 'Los compañeros se sientan enfrentados. El anfitrión decide las parejas antes de empezar.'}
          </p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {view.players.map((p) => (
            <li
              key={p.playerId}
              className={`flex flex-wrap items-center gap-2 rounded-lg border bg-mesa px-3 py-2 ${
                swapFrom === p.playerId ? 'border-brasa' : 'border-linea'
              }`}
            >
              <Avatar name={p.nick} colorIndex={p.colorIndex} size={36} />
              <span className="flex-1 truncate text-16 text-hueso">{p.nick}</span>
              {/* La pareja solo existe en Mus: en los otros dos juegos
                  `teamIndex` llega a null y no se pinta nada (§12.12). */}
              {p.teamIndex !== null ? <Pill>Pareja {p.teamIndex === 0 ? 'A' : 'B'}</Pill> : null}
              {p.isHost ? <Pill>Anfitrión</Pill> : null}
              <Pill>{p.connected ? 'Conectado' : 'Desconectado'}</Pill>
              {isMus && isHost ? (
                <Button
                  variant="ghost"
                  onClick={() => handleSeatTap(p.playerId)}
                  className="px-3"
                  aria-pressed={swapFrom === p.playerId}
                >
                  {swapFrom === null
                    ? 'Cambiar sitio'
                    : swapFrom === p.playerId
                      ? 'Cancelar'
                      : 'Cambiar por este'}
                </Button>
              ) : null}
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
          {isMus ? (
            <MusVariantsSection config={config as MusConfig} setField={setMusField} />
          ) : isParty ? (
            <PartyVariantsSection config={config as PartyConfig} setField={setPartyField} />
          ) : view.gameId === 'pocha' ? (
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
            // El texto de `messageFor('NOT_ENOUGH_PLAYERS')` es el del
            // servidor y dice "al menos dos", que es el mínimo de Chinchón.
            // Aquí se sabe el juego, así que se dice el número de verdad.
            <p className="text-12 text-humo">
              {`Hacen falta ${minPlayers === 4 ? 'cuatro' : minPlayers === 3 ? 'tres' : 'dos'} jugadores${
                isMus ? '' : ' como mínimo'
              }.`}
            </p>
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
        legend="Tiempo por turno"
        helperText="Cuenta atrás por jugador. Al agotarse, se hace una jugada automática legal."
        value={config.turnTimeSeconds}
        onChange={(v) => setField('turnTimeSeconds', v)}
        options={[
          { value: 0, label: 'Sin tiempo' },
          { value: 10, label: '10 s' },
          { value: 20, label: '20 s' },
          { value: 30, label: '30 s' },
          { value: 60, label: '1 min' },
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

interface MusVariantsSectionProps {
  config: MusConfig;
  setField: <K extends keyof MusConfig>(key: K, value: MusConfig[K]) => void;
}

/** Variantes de Mus (§12). Sin control de "Jugadores": son 4 fijos (§12.2). */
function MusVariantsSection({ config, setField }: MusVariantsSectionProps) {
  return (
    <>
      <SegmentedControl
        legend="Ocho reyes"
        helperText="Los Treses valen como Rey y los Doses como As."
        value={config.ochoReyes}
        onChange={(v) => setField('ochoReyes', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
      <SegmentedControl
        legend="Juegos para ganar"
        helperText="Cuántos juegos (vacas) hay que ganar para llevarse la partida."
        value={config.juegos}
        onChange={(v) => setField('juegos', v)}
        options={[
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
        ]}
      />
      <SegmentedControl
        legend="El punto vale"
        helperText="Piedras que paga el punto cuando nadie tiene juego."
        value={config.puntoVale}
        onChange={(v) => setField('puntoVale', v)}
        options={[
          { value: 1, label: '1 piedra' },
          { value: 2, label: '2 piedras' },
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

interface PartyVariantsSectionProps {
  config: PartyConfig;
  setField: (
    key: 'maxPlayers' | 'rounds' | 'cardsPerPlayer' | 'pointsToWin',
    value: number,
  ) => void;
}

function PartyVariantsSection({ config, setField }: PartyVariantsSectionProps) {
  const minimum = config.gameId === 'orden' ? 2 : 3;
  return (
    <>
      <p className="text-14 text-humo">
        Se juega hablando en la misma mesa. Cada móvil guarda sus respuestas privadas y la pantalla
        central solo enseña lo que ya se ha revelado.
      </p>
      <SegmentedControl
        legend="Jugadores"
        helperText="Tamaño máximo de la cuadrilla."
        value={config.maxPlayers}
        onChange={(value) => setField('maxPlayers', value)}
        options={([2, 3, 4, 5, 6, 7] as const)
          .filter((value) => value >= minimum)
          .map((value) => ({ value, label: String(value) }))}
      />
      {config.gameId === 'orden' ? (
        <SegmentedControl
          legend="Cartas iniciales por persona"
          helperText="El anfitrión podrá cambiarlo en cada reparto."
          value={config.cardsPerPlayer}
          onChange={(value) => setField('cardsPerPlayer', value)}
          options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => ({
            value,
            label: String(value),
          }))}
        />
      ) : (
        <>
          <SegmentedControl
            legend="Rondas máximas"
            helperText="Preguntas antes de ver el resultado."
            value={config.rounds}
            onChange={(value) => setField('rounds', value)}
            options={[5, 7, 10, 12].map((value) => ({ value, label: String(value) }))}
          />
          <SegmentedControl
            legend="Puntos para ganar"
            helperText="La primera persona que llegue a este marcador gana."
            value={config.pointsToWin}
            onChange={(value) => setField('pointsToWin', value)}
            options={[5, 10, 15, 20, 25, 30, 40].map((value) => ({
              value,
              label: String(value),
            }))}
          />
        </>
      )}
    </>
  );
}
