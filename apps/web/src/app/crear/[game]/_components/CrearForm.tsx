// Formulario de creación de sala, por juego. Contrato P13: máximo 5 opciones
// visibles a la vez, el resto tras "Más variantes". Al enviar: room:create
// (vía store.createRoom) y navegación a /sala/[code].
'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import {
  DEFAULT_CONFIG,
  DEFAULT_BRISCA_CONFIG,
  DEFAULT_CINQUILLO_CONFIG,
  DEFAULT_COLORES_CONFIG,
  DEFAULT_ESCOBA_CONFIG,
  DEFAULT_ESCALA_CONFIG,
  DEFAULT_MAYORIA_CONFIG,
  DEFAULT_MUS_CONFIG,
  DEFAULT_LA_RONDA_CONFIG,
  DEFAULT_MUSICAL_CONFIG,
  DEFAULT_MATIZ_CONFIG,
  DEFAULT_ORDEN_CONFIG,
  DEFAULT_POCHA_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  DEFAULT_TUTE_CONFIG,
  messageFor,
  type ChinchonConfig,
  type ClassicConfig,
  type ColorTopic,
  type EscalaConfig,
  type GameId,
  type MusConfig,
  type MusicalConfig,
  type LaRondaConfig,
  type PartyConfig,
  type PochaConfig,
} from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { isValidNick, normalizeNick } from '@/lib/nick';
import {
  MUSICAL_ANSWER_MODE_OPTIONS,
  MUSICAL_GENRE_OPTIONS,
  MUSICAL_POPULARITY_OPTIONS,
} from '@/lib/musical';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NickLegalNote } from '@/components/ui/NickLegalNote';
import { BackToGames } from '@/components/ui/BackToGames';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { MusicYearRangeControl } from '@/components/ui/MusicYearRangeControl';
import { MusicRegionSelector } from '@/components/ui/MusicRegionSelector';
import { CardStylePicker } from '@/components/cards/CardStylePicker';
import { GameGlyph } from '@/components/ui/GameGlyph';
import { Icon } from '@/components/ui/Icon';
import { CreateRoomLoading } from './CreateRoomLoading';

export interface CrearFormProps {
  gameId: GameId;
}

export function CrearForm({ gameId }: CrearFormProps) {
  const router = useRouter();
  const lastError = useRondaStore((s) => s.lastError);

  const [nick, setNick] = useState('');
  const [nickError, setNickError] = useState<string | null>(null);
  const [chinchonConfig, setChinchonConfig] = useState<ChinchonConfig>(DEFAULT_CONFIG);
  const [pochaConfig, setPochaConfig] = useState<PochaConfig>(DEFAULT_POCHA_CONFIG);
  const [musConfig, setMusConfig] = useState<MusConfig>(DEFAULT_MUS_CONFIG);
  const [musicalConfig, setMusicalConfig] = useState<MusicalConfig>(DEFAULT_MUSICAL_CONFIG);
  const [rondaConfig, setRondaConfig] = useState<LaRondaConfig>(DEFAULT_LA_RONDA_CONFIG);
  const [classicConfig, setClassicConfig] = useState<ClassicConfig>(() => classicDefaults(gameId));
  const [partyConfig, setPartyConfig] = useState<PartyConfig>(() => partyDefaults(gameId));
  const [submitting, setSubmitting] = useState(false);

  const title = `Crear partida de ${gameTitle(gameId)}`;
  const nickErrorMessage = nickError
    ? nick.trim().length === 0
      ? 'Falta poner tu nombre para crear la sala.'
      : nickError
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const normalized = normalizeNick(nick);
    if (!isValidNick(normalized)) {
      setNickError(messageFor('NICK_INVALID'));
      return;
    }
    setNickError(null);
    setSubmitting(true);
    const config =
      gameId === 'laronda'
        ? rondaConfig
        : gameId === 'mus'
          ? musConfig
          : gameId === 'pocha'
            ? pochaConfig
            : gameId === 'musical'
              ? musicalConfig
              : isClassicGame(gameId)
                ? classicConfig
                : isPartyGame(gameId)
                  ? partyConfig
                  : chinchonConfig;
    const created = await useRondaStore.getState().createRoom(gameId, config, normalized);
    if (created) {
      const code = useRondaStore.getState().roomCode;
      if (code) {
        router.push(`/sala/${code}`);
        return;
      }
    }
    setSubmitting(false);
  }

  if (submitting) {
    return <CreateRoomLoading gameTitle={gameTitle(gameId)} />;
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <BackToGames />
      <header className="flex items-center gap-4">
        <span className="game-glyph-tile size-16 shrink-0 rounded-[21px]" data-game={gameId}>
          <GameGlyph game={gameId} size={29} />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="eyebrow">Nueva mesa</span>
          <h1 className="font-display text-32 leading-display text-hueso">
            {isPartyGame(gameId) ? `Partida de ${gameTitle(gameId)}` : title}
          </h1>
          <span className="text-13 leading-relaxed text-humo">
            Ajusta la partida y comparte el código.
          </span>
        </span>
      </header>

      <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
        <div className="surface-panel flex flex-col gap-2 p-4">
          <label
            htmlFor="nick"
            className="flex items-center gap-2 text-16 font-semibold text-hueso"
          >
            <span className="icon-disc size-8">
              <Icon name="person" size={15} />
            </span>
            <span>Tu apodo</span>
          </label>
          <input
            id="nick"
            name="nick"
            value={nick}
            onChange={(e) => {
              setNick(e.target.value);
              if (nickError) setNickError(null);
            }}
            maxLength={12}
            autoComplete="off"
            aria-invalid={Boolean(nickError)}
            aria-describedby={nickError ? 'nick-error' : undefined}
            className={`form-control px-4 text-16 ${nickError ? 'border-brasa' : ''}`}
            placeholder="Cómo te van a ver los demás"
          />
          <NickLegalNote />
        </div>

        {!isPartyGame(gameId) && gameId !== 'laronda' && gameId !== 'musical' ? (
          <CardStylePicker />
        ) : null}

        {gameId === 'laronda' ? (
          <LaRondaVariants config={rondaConfig} setConfig={setRondaConfig} />
        ) : gameId === 'mus' ? (
          <MusVariants config={musConfig} setConfig={setMusConfig} />
        ) : gameId === 'pocha' ? (
          <PochaVariants config={pochaConfig} setConfig={setPochaConfig} />
        ) : gameId === 'musical' ? (
          <MusicalVariants config={musicalConfig} setConfig={setMusicalConfig} />
        ) : isClassicGame(gameId) ? (
          <ClassicVariants config={classicConfig} setConfig={setClassicConfig} />
        ) : isPartyGame(gameId) ? (
          <PartyVariants config={partyConfig} setConfig={setPartyConfig} />
        ) : (
          <ChinchonVariants config={chinchonConfig} setConfig={setChinchonConfig} />
        )}

        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

        <Button type="submit" loading={submitting}>
          <span className="inline-flex items-center justify-center gap-2">
            <Icon name="plus" size={18} /> Crear partida
          </span>
        </Button>
        {nickErrorMessage ? (
          <p id="nick-error" role="alert" className="-mt-4 text-center text-14 text-brasa">
            {nickErrorMessage}
          </p>
        ) : null}
      </form>
    </main>
  );
}

function updateConfig<C, K extends keyof C>(
  setConfig: (fn: (prev: C) => C) => void,
  key: K,
  value: C[K],
) {
  setConfig((prev) => ({ ...prev, [key]: value }));
}

interface ChinchonVariantsProps {
  config: ChinchonConfig;
  setConfig: (fn: (prev: ChinchonConfig) => ChinchonConfig) => void;
}

function ChinchonVariants({ config, setConfig }: ChinchonVariantsProps) {
  const set = <K extends keyof ChinchonConfig>(key: K, value: ChinchonConfig[K]) =>
    updateConfig(setConfig, key, value);

  return (
    <>
      <QuantityStepper
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => set('maxPlayers', v)}
        options={[
          { value: 2, label: '2' },
          { value: 3, label: '3' },
          { value: 4, label: '4' },
        ]}
        valueSuffix="personas"
      />

      <QuantityStepper
        legend="Umbral de cierre"
        helperText="Puntos sueltos máximos para poder cerrar."
        value={config.closeThreshold}
        onChange={(v) => set('closeThreshold', v)}
        options={[
          { value: 0, label: '0' },
          { value: 3, label: '3' },
          { value: 5, label: '5' },
          { value: 10, label: '10' },
        ]}
        valueSuffix="puntos"
      />

      <QuantityStepper
        legend="Puntuación de eliminación"
        helperText="Puntos para quedar eliminado de la partida."
        value={config.eliminationScore}
        onChange={(v) => set('eliminationScore', v)}
        options={[
          { value: 50, label: '50' },
          { value: 100, label: '100' },
          { value: 150, label: '150' },
        ]}
        valueSuffix="puntos"
      />

      <SegmentedControl
        legend="Tiempo por turno"
        helperText="Al agotarse, se completa una jugada legal."
        value={config.turnTimeSeconds}
        onChange={(v) => set('turnTimeSeconds', v)}
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
        onChange={(v) => set('chinchonEndsGame', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />

      <details className="surface-panel px-4 py-3">
        <summary className="cursor-pointer text-16 font-semibold text-hueso">Más variantes</summary>
        <div className="mt-4 flex flex-col gap-6">
          <SegmentedControl
            legend="Bonificación por cierre en seco"
            helperText="Bonificación extra por cerrar con cero puntos."
            value={config.dryCloseBonus}
            onChange={(v) => set('dryCloseBonus', v)}
            options={[
              { value: -10, label: '-10' },
              { value: 0, label: '0' },
            ]}
          />
          <SegmentedControl
            legend="Prohibir descartar lo robado"
            helperText="Prohíbe descartar la carta que acabas de robar."
            value={config.forbidDiscardDrawnCard}
            onChange={(v) => set('forbidDiscardDrawnCard', v)}
            options={[
              { value: true, label: 'Sí' },
              { value: false, label: 'No' },
            ]}
          />
          <SegmentedControl
            legend="Sonido"
            helperText="Activa los sonidos de la partida."
            value={config.soundEnabled}
            onChange={(v) => set('soundEnabled', v)}
            options={[
              { value: true, label: 'Sí' },
              { value: false, label: 'No' },
            ]}
          />
        </div>
      </details>
    </>
  );
}

interface MusVariantsProps {
  config: MusConfig;
  setConfig: (fn: (prev: MusConfig) => MusConfig) => void;
}

/**
 * Variantes de Mus (§12). No hay control de "Jugadores": son exactamente 4
 * (§12.2), y ofrecer el número sería ofrecer algo que no se puede elegir.
 */
function MusVariants({ config, setConfig }: MusVariantsProps) {
  const set = <K extends keyof MusConfig>(key: K, value: MusConfig[K]) =>
    updateConfig(setConfig, key, value);

  return (
    <>
      <p className="text-14 text-humo">
        El Mus se juega siempre entre cuatro, en dos parejas. Podrás decidir quién va con quién en
        la sala, antes de empezar.
      </p>

      <SegmentedControl
        legend="Cómo vais a jugar"
        helperText="Las jugadas siempre se confirman en el móvil."
        value={config.modo}
        onChange={(v) => set('modo', v)}
        options={[
          { value: 'presencial', label: 'En la misma mesa' },
          { value: 'online', label: 'Cada uno a distancia' },
        ]}
      />

      <p className="text-12 text-humo">
        {config.modo === 'presencial'
          ? 'Podéis hablar con normalidad; cada paso se marca también en el móvil para llevar el tanteo.'
          : 'Los botones comunican cada paso, envite y respuesta al resto de la mesa.'}
      </p>

      <SegmentedControl
        legend="Ocho reyes"
        helperText="Variante: Tres = Rey y Dos = As. Con ella, un As y un Dos forman pareja."
        value={config.ochoReyes}
        onChange={(v) => set('ochoReyes', v)}
        options={[
          { value: false, label: 'No' },
          { value: true, label: 'Sí' },
        ]}
      />

      <QuantityStepper
        legend="Juegos para ganar"
        helperText="Cuántos juegos (vacas) hay que ganar para llevarse la partida."
        value={config.juegos}
        onChange={(v) => set('juegos', v)}
        options={[
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
        ]}
        valueSuffix="juegos"
      />

      <QuantityStepper
        legend="El punto vale"
        helperText="Piedras que paga el punto cuando nadie tiene juego."
        value={config.puntoVale}
        onChange={(v) => set('puntoVale', v)}
        options={[
          { value: 1, label: '1 piedra' },
          { value: 2, label: '2 piedras' },
        ]}
        valueSuffix="en el lance"
      />

      <SegmentedControl
        legend="Sonido"
        helperText="Activa los sonidos de la partida."
        value={config.soundEnabled}
        onChange={(v) => set('soundEnabled', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
    </>
  );
}

interface PochaVariantsProps {
  config: PochaConfig;
  setConfig: (fn: (prev: PochaConfig) => PochaConfig) => void;
}

function PochaVariants({ config, setConfig }: PochaVariantsProps) {
  const set = <K extends keyof PochaConfig>(key: K, value: PochaConfig[K]) =>
    updateConfig(setConfig, key, value);

  return (
    <>
      <QuantityStepper
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => set('maxPlayers', v)}
        options={[
          { value: 2, label: '2' },
          { value: 3, label: '3' },
          { value: 4, label: '4' },
          { value: 5, label: '5' },
          { value: 6, label: '6' },
        ]}
        valueSuffix="personas"
      />

      <SegmentedControl
        legend="Triunfo"
        helperText="Se revela una carta y su palo manda en la ronda."
        value={config.trump}
        onChange={(v) => set('trump', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />

      <SegmentedControl
        legend="Orden de fuerza"
        helperText="Qué carta gana la baza dentro de un palo."
        value={config.rankOrder}
        onChange={(v) => set('rankOrder', v)}
        options={[
          { value: 'numerico', label: 'Numérico' },
          { value: 'brisca', label: 'Brisca' },
        ]}
      />

      <SegmentedControl
        legend="Sonido"
        helperText="Activa los sonidos de la partida."
        value={config.soundEnabled}
        onChange={(v) => set('soundEnabled', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
    </>
  );
}

function isPartyGame(gameId: GameId): gameId is PartyConfig['gameId'] {
  return (
    gameId === 'orden' ||
    gameId === 'colores' ||
    gameId === 'mayoria' ||
    gameId === 'escala' ||
    gameId === 'matiz'
  );
}

function isClassicGame(gameId: GameId): gameId is ClassicConfig['gameId'] {
  return (
    gameId === 'brisca' ||
    gameId === 'escoba' ||
    gameId === 'sieteymedia' ||
    gameId === 'tute' ||
    gameId === 'cinquillo'
  );
}

function classicDefaults(gameId: GameId): ClassicConfig {
  if (gameId === 'escoba') return DEFAULT_ESCOBA_CONFIG;
  if (gameId === 'sieteymedia') return DEFAULT_SIETE_Y_MEDIA_CONFIG;
  if (gameId === 'tute') return DEFAULT_TUTE_CONFIG;
  if (gameId === 'cinquillo') return DEFAULT_CINQUILLO_CONFIG;
  return DEFAULT_BRISCA_CONFIG;
}

function partyDefaults(gameId: GameId): PartyConfig {
  if (gameId === 'colores') return DEFAULT_COLORES_CONFIG;
  if (gameId === 'mayoria') return DEFAULT_MAYORIA_CONFIG;
  if (gameId === 'escala') return DEFAULT_ESCALA_CONFIG;
  if (gameId === 'matiz') return DEFAULT_MATIZ_CONFIG;
  return DEFAULT_ORDEN_CONFIG;
}

function gameTitle(gameId: GameId): string {
  if (gameId === 'laronda') return 'La Ronda';
  if (gameId === 'orden') return 'Orden';
  if (gameId === 'colores') return 'Colores';
  if (gameId === 'mayoria') return 'Mayoría';
  if (gameId === 'escala') return 'Escala';
  if (gameId === 'brisca') return 'Brisca';
  if (gameId === 'escoba') return 'Escoba';
  if (gameId === 'sieteymedia') return 'Siete y media';
  if (gameId === 'tute') return 'Tute';
  if (gameId === 'cinquillo') return 'Cinquillo';
  if (gameId === 'mus') return 'Mus';
  if (gameId === 'pocha') return 'Pocha';
  if (gameId === 'musical') return 'Musical';
  if (gameId === 'matiz') return 'Matiz';
  return 'Chinchón';
}

interface LaRondaVariantsProps {
  config: LaRondaConfig;
  setConfig: (fn: (prev: LaRondaConfig) => LaRondaConfig) => void;
}

function LaRondaVariants({ config, setConfig }: LaRondaVariantsProps) {
  return (
    <>
      <QuantityStepper
        legend="Jugadores"
        helperText="La mesa funciona desde tres personas y admite hasta ocho."
        value={config.maxPlayers}
        onChange={(value) =>
          updateConfig(setConfig, 'maxPlayers', value as LaRondaConfig['maxPlayers'])
        }
        options={[3, 4, 5, 6, 7, 8].map((value) => ({ value, label: String(value) }))}
        valueSuffix="personas"
      />
      <SegmentedControl
        legend="Sonido"
        helperText="Efectos breves al servir tapas y pedir la cuenta."
        value={config.soundEnabled}
        onChange={(value) => updateConfig(setConfig, 'soundEnabled', value)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
    </>
  );
}

interface ClassicVariantsProps {
  config: ClassicConfig;
  setConfig: (fn: (prev: ClassicConfig) => ClassicConfig) => void;
}

function ClassicVariants({ config, setConfig }: ClassicVariantsProps) {
  const maximum =
    config.gameId === 'tute'
      ? 2
      : config.gameId === 'cinquillo'
        ? 6
        : config.gameId === 'sieteymedia'
          ? 7
          : 4;
  const options = Array.from({ length: maximum - 1 }, (_, index) => index + 2).map((value) => ({
    value,
    label: String(value),
  }));

  return (
    <>
      <QuantityStepper
        legend="Jugadores"
        helperText={
          config.gameId === 'tute'
            ? 'Esta modalidad inicial de Tute se juega a dos.'
            : 'Máximo de personas en la sala.'
        }
        value={config.maxPlayers}
        onChange={(maxPlayers) =>
          setConfig((previous) => ({ ...previous, maxPlayers }) as ClassicConfig)
        }
        options={options}
        valueSuffix="personas"
      />
      <SegmentedControl
        legend="Sonido"
        helperText="Activa los sonidos de la partida."
        value={config.soundEnabled}
        onChange={(soundEnabled) => setConfig((previous) => ({ ...previous, soundEnabled }))}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />
    </>
  );
}

interface PartyVariantsProps {
  config: PartyConfig;
  setConfig: (fn: (prev: PartyConfig) => PartyConfig) => void;
}

function PartyVariants({ config, setConfig }: PartyVariantsProps) {
  function setField(
    key: 'maxPlayers' | 'rounds' | 'cardsPerPlayer' | 'pointsToWin',
    value: number,
  ) {
    setConfig((previous) => {
      const nextValue =
        key === 'maxPlayers' && previous.gameId === 'escala' && previous.groupMode === 'groups'
          ? Math.max(value, previous.groupCount * 2)
          : value;
      return { ...previous, [key]: nextValue } as PartyConfig;
    });
  }

  function setColorTopic(topic: ColorTopic) {
    setConfig((previous) => (previous.gameId === 'colores' ? { ...previous, topic } : previous));
  }

  function setScaleConfig(patch: Partial<EscalaConfig>) {
    setConfig((previous) => {
      if (previous.gameId !== 'escala') return previous;
      const next = { ...previous, ...patch };
      if (next.groupMode === 'groups') {
        next.maxPlayers = Math.max(
          next.maxPlayers,
          next.groupCount * 2,
        ) as EscalaConfig['maxPlayers'];
      }
      return next;
    });
  }

  const playerOptions = [2, 3, 4, 5, 6, 7].map((value) => ({
    value,
    label: String(value),
  }));

  return (
    <section className="flex flex-col gap-6">
      <div className="surface-panel p-4">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 -space-x-3" aria-hidden="true">
            <span className="number-card-preview number-card-preview-one rotate-[-8deg]">1</span>
            <span className="number-card-preview number-card-preview-hundred rotate-[8deg]">
              100
            </span>
          </div>
          <div>
            <p className="text-16 font-semibold text-hueso">
              {config.gameId === 'orden'
                ? 'Baraja numérica 1–100'
                : config.gameId === 'escala'
                  ? 'Pistas con polémica'
                  : config.gameId === 'matiz'
                    ? 'Dibujos y precisión'
                  : 'Juego para hablar en la mesa'}
            </p>
            <p className="mt-1 text-14 text-humo">
              Cada móvil guarda su información privada. No necesitas cartas físicas.
            </p>
          </div>
        </div>
      </div>

      <QuantityStepper
        legend="Jugadores"
        helperText="Máximo de personas en la sala."
        value={config.maxPlayers}
        onChange={(value) => setField('maxPlayers', value)}
        options={playerOptions}
        valueSuffix="personas"
      />

      {config.gameId === 'orden' ? (
        <QuantityStepper
          legend="Cartas iniciales por persona"
          helperText="El anfitrión puede cambiarlo en cada reparto."
          value={config.cardsPerPlayer}
          onChange={(value) => setField('cardsPerPlayer', value)}
          options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => ({
            value,
            label: String(value),
          }))}
          valueSuffix="cartas"
        />
      ) : (
        <>
          {config.gameId === 'escala' ? (
            <>
              <SegmentedControl
                legend="Cómo se da la pista"
                helperText="Elige si la frase se dice o se escribe."
                value={config.modo}
                onChange={(value) => setScaleConfig({ modo: value as EscalaConfig['modo'] })}
                options={[
                  { value: 'presencial', label: 'En persona' },
                  { value: 'online', label: 'Online' },
                ]}
              />
              <QuantityStepper
                legend="Tiempo para responder"
                helperText="Empieza al aceptar la frase o pista."
                value={config.answerTimeSeconds}
                onChange={(value) =>
                  setScaleConfig({
                    answerTimeSeconds: value as EscalaConfig['answerTimeSeconds'],
                  })
                }
                options={[10, 15, 20, 30, 45, 60].map((value) => ({
                  value,
                  label: String(value),
                }))}
                valueSuffix="segundos"
              />
              <SegmentedControl
                legend="Formato de juego"
                helperText="Todos contra todos o por equipos."
                value={config.groupMode}
                onChange={(value) =>
                  setScaleConfig({ groupMode: value as EscalaConfig['groupMode'] })
                }
                options={[
                  { value: 'individual', label: 'Todos contra todos' },
                  { value: 'groups', label: 'Equipos' },
                ]}
              />
              {config.groupMode === 'groups' ? (
                <QuantityStepper
                  legend="Número de equipos"
                  helperText="Cada equipo necesita al menos dos personas."
                  value={config.groupCount}
                  onChange={(value) =>
                    setScaleConfig({ groupCount: value as EscalaConfig['groupCount'] })
                  }
                  options={[2, 3].map((value) => ({
                    value,
                    label: String(value),
                  }))}
                  valueSuffix="equipos"
                />
              ) : null}
              <div className="rounded-xl border border-oro/30 bg-oro/10 px-4 py-3 text-14 leading-relaxed text-humo">
                {config.modo === 'online'
                  ? 'La persona que tiene la pista escribe su frase y la acepta. Solo entonces aparece para el resto, que coloca su puntuación antes de que termine la cuenta atrás.'
                  : 'La persona que tiene la pista ve el objetivo secreto, dice su frase en voz alta y la confirma en su móvil. Después el resto coloca su puntuación.'}
              </div>
              <div className="rounded-xl border border-linea bg-mesa/70 px-4 py-3 text-14 leading-relaxed text-humo">
                <p className="font-semibold text-hueso">Cómo se puntúa</p>
                <p className="mt-1">
                  Distancia 0–10: 4 puntos · 11–20: 3 · 21–30: 2 · 31–40: 1 · más de 40: 0.
                </p>
                <p className="mt-1">
                  La guía no estima; en equipos se acumula el marcador del grupo.
                </p>
              </div>
            </>
          ) : null}
          {config.gameId === 'colores' ? (
            <div className="flex flex-col gap-2.5">
              <label htmlFor="color-topic" className="text-16 font-semibold text-hueso">
                Tema de las preguntas
              </label>
              <p className="text-12 text-humo">Elige un banco difícil o mezcla todos.</p>
              <select
                id="color-topic"
                value={config.topic}
                onChange={(event) => setColorTopic(event.target.value as ColorTopic)}
                className="form-control px-4 text-16"
              >
                <option value="todo">De todo</option>
                <option value="animacion">Dibujos y animación</option>
                <option value="series">Series de televisión</option>
                <option value="cine">Cine</option>
                <option value="banderas">Banderas difíciles</option>
                <option value="logos">Logos y marcas</option>
                <option value="juegos">Juegos y videojuegos</option>
                <option value="cultura">Historia, ciencia y cultura</option>
              </select>
            </div>
          ) : null}
          {config.gameId === 'mayoria' ? (
            <p className="rounded-xl border border-oro/30 bg-oro/10 px-4 py-3 text-14 leading-relaxed text-humo">
              En Mayoría no hay un número fijo de rondas: la partida continúa hasta que alguien
              alcanza el objetivo sin tener la vaca rosa.
            </p>
          ) : (
            <QuantityStepper
              legend="Rondas máximas"
              helperText={
                config.gameId === 'colores'
                  ? 'Límite de seguridad si nadie alcanza antes los puntos para ganar.'
                  : config.gameId === 'matiz'
                    ? 'Cuántos dibujos vais a intentar colorear.'
                  : 'Número máximo de preguntas de la partida.'
              }
              value={config.rounds}
              onChange={(value) => setField('rounds', value)}
              options={(
                config.gameId === 'colores'
                  ? [10, 15, 20]
                  : config.gameId === 'matiz'
                    ? [3, 5, 7, 10]
                    : [5, 7, 10, 12]
              ).map(
                (value) => ({
                  value,
                  label: String(value),
                }),
              )}
              valueSuffix="rondas"
            />
          )}
          {config.gameId !== 'matiz' ? (
            <QuantityStepper
              legend={config.gameId === 'mayoria' ? 'Vacas para ganar' : 'Puntos para ganar'}
              helperText={
                config.gameId === 'mayoria'
                  ? 'La primera persona que llegue a este marcador sin la vaca rosa gana.'
                  : 'La primera persona que llegue a este marcador gana.'
              }
              value={config.pointsToWin}
              onChange={(value) => setField('pointsToWin', value)}
              options={(config.gameId === 'mayoria'
                ? [5, 8, 10, 15, 20, 25, 30, 40]
                : [5, 10, 15, 20, 25, 30, 40]
              ).map((value) => ({
                value,
                label: String(value),
              }))}
              valueSuffix={config.gameId === 'mayoria' ? 'vacas' : 'puntos'}
            />
          ) : (
            <p className="rounded-xl border border-oro/30 bg-oro/10 px-4 py-3 text-14 leading-relaxed text-humo">
              Cada dibujo da hasta 100 puntos. Gana quien tenga más puntos al terminar las rondas.
            </p>
          )}
        </>
      )}
    </section>
  );
}

interface MusicalVariantsProps {
  config: MusicalConfig;
  setConfig: (fn: (prev: MusicalConfig) => MusicalConfig) => void;
}

function MusicalVariants({ config, setConfig }: MusicalVariantsProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="surface-panel flex flex-col gap-2 p-4">
        <p className="text-16 font-semibold text-hueso">Partida en grupo</p>
        <p className="text-14 text-humo">
          Elige primero si estáis juntos o si cada persona jugará desde su móvil. Después configura
          la sala; al crearla verás un QR y un código para invitarles.
        </p>
      </div>
      <SegmentedControl
        legend="Tipo de partida"
        helperText="Elige dónde se escuchará la música antes de configurar el resto de la sala."
        value={config.audioMode}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            audioMode: value as MusicalConfig['audioMode'],
            mode: 'velocidad',
          }))
        }
        options={[
          { value: 'presencial', label: 'En persona' },
          { value: 'online', label: 'Online' },
        ]}
      />
      <QuantityStepper
        legend="Jugadores"
        helperText="Máximo de personas en la sala."
        value={config.maxPlayers}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            maxPlayers: value as MusicalConfig['maxPlayers'],
          }))
        }
        options={[2, 3, 4, 5, 6, 7, 8].map((value) => ({ value, label: String(value) }))}
        valueSuffix="personas"
      />
      <QuantityStepper
        legend="Canciones"
        helperText="La partida termina después de este número de rondas."
        value={config.rounds}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            rounds: value as MusicalConfig['rounds'],
          }))
        }
        options={[5, 10, 15, 20, 30, 40, 50].map((value) => ({ value, label: String(value) }))}
        valueSuffix="canciones"
      />
      <SegmentedControl
        legend="Estilo musical"
        helperText="Filtra el catálogo por estilo musical."
        value={config.genre}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            genre: value as MusicalConfig['genre'],
          }))
        }
        options={MUSICAL_GENRE_OPTIONS.map(({ value, label }) => ({ value, label }))}
      />
      <MusicYearRangeControl
        yearFrom={config.yearFrom}
        yearTo={config.yearTo}
        onChange={(yearFrom, yearTo) =>
          setConfig((previous) => ({ ...previous, yearFrom, yearTo }))
        }
      />
      <MusicRegionSelector
        value={config.regions}
        onChange={(regions) => setConfig((previous) => ({ ...previous, regions }))}
      />
      <SegmentedControl
        legend="Popularidad"
        helperText="Elige variedad o prioriza los éxitos."
        value={config.popularity}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            popularity: value as MusicalConfig['popularity'],
          }))
        }
        options={MUSICAL_POPULARITY_OPTIONS.map(({ value, label }) => ({ value, label }))}
      />
      <div className="surface-panel flex flex-col gap-1 p-4">
        <p className="text-14 font-semibold text-hueso">
          {config.audioMode === 'presencial'
            ? 'Velocidad · pulsador'
            : 'Online · tiempo individual'}
        </p>
        <p className="text-13 text-humo">
          {config.audioMode === 'presencial'
            ? 'Solo suena el móvil del administrador. El primero que pulsa puede responder; si falla, queda fuera de esa canción.'
            : 'Cada jugador escucha la misma canción en su móvil. El tiempo cuenta desde Play hasta Resolver, sin contar la respuesta escrita.'}
        </p>
      </div>
      <SegmentedControl
        legend="Qué hay que acertar"
        helperText="Decide qué datos debe escribir cada jugador."
        value={config.answerMode}
        onChange={(value) =>
          setConfig((previous) => ({
            ...previous,
            answerMode: value as MusicalConfig['answerMode'],
          }))
        }
        options={MUSICAL_ANSWER_MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
      />
    </section>
  );
}
