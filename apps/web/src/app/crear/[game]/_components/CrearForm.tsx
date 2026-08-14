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
  DEFAULT_ORDEN_CONFIG,
  DEFAULT_POCHA_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  DEFAULT_TUTE_CONFIG,
  messageFor,
  type ChinchonConfig,
  type ClassicConfig,
  type ColorTopic,
  type GameId,
  type MusConfig,
  type LaRondaConfig,
  type PartyConfig,
  type PochaConfig,
} from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { isValidNick, normalizeNick } from '@/lib/nick';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NickLegalNote } from '@/components/ui/NickLegalNote';
import { BackToGames } from '@/components/ui/BackToGames';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { CardStylePicker } from '@/components/cards/CardStylePicker';

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
  const [rondaConfig, setRondaConfig] = useState<LaRondaConfig>(DEFAULT_LA_RONDA_CONFIG);
  const [classicConfig, setClassicConfig] = useState<ClassicConfig>(() => classicDefaults(gameId));
  const [partyConfig, setPartyConfig] = useState<PartyConfig>(() => partyDefaults(gameId));
  const [submitting, setSubmitting] = useState(false);

  const title = `Crear partida de ${gameTitle(gameId)}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
            : isClassicGame(gameId)
              ? classicConfig
              : isPartyGame(gameId)
                ? partyConfig
                : chinchonConfig;
    const created = await useRondaStore.getState().createRoom(gameId, config, normalized);
    setSubmitting(false);
    if (created) {
      const code = useRondaStore.getState().roomCode;
      if (code) router.push(`/sala/${code}`);
    }
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <BackToGames />
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Nueva mesa</span>
        <h1 className="font-display text-40 leading-display text-hueso">
          {isPartyGame(gameId) ? `Crear partida de ${gameTitle(gameId)}` : title}
        </h1>
        <p className="text-14 text-humo">
          Elige los ajustes una vez. Al crearla verás directamente el código para invitar.
        </p>
      </header>

      <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="nick" className="text-16 font-semibold text-hueso">
            Tu apodo
          </label>
          <input
            id="nick"
            name="nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={12}
            autoComplete="off"
            className="form-control px-4 text-16"
            placeholder="Cómo te van a ver los demás"
          />
          <NickLegalNote />
          {nickError ? <p className="text-14 text-brasa">{nickError}</p> : null}
        </div>

        {!isPartyGame(gameId) && gameId !== 'laronda' ? <CardStylePicker /> : null}

        {gameId === 'laronda' ? (
          <LaRondaVariants config={rondaConfig} setConfig={setRondaConfig} />
        ) : gameId === 'mus' ? (
          <MusVariants config={musConfig} setConfig={setMusConfig} />
        ) : gameId === 'pocha' ? (
          <PochaVariants config={pochaConfig} setConfig={setPochaConfig} />
        ) : isClassicGame(gameId) ? (
          <ClassicVariants config={classicConfig} setConfig={setClassicConfig} />
        ) : isPartyGame(gameId) ? (
          <PartyVariants config={partyConfig} setConfig={setPartyConfig} />
        ) : (
          <ChinchonVariants config={chinchonConfig} setConfig={setChinchonConfig} />
        )}

        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}

        <Button type="submit" loading={submitting}>
          Crear partida
        </Button>
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
        legend="Ocho reyes"
        helperText="Los Treses valen como Rey y los Doses como As."
        value={config.ochoReyes}
        onChange={(v) => set('ochoReyes', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
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
  return gameId === 'orden' || gameId === 'colores' || gameId === 'mayoria' || gameId === 'escala';
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
    setConfig((previous) => ({ ...previous, [key]: value }) as PartyConfig);
  }

  function setColorTopic(topic: ColorTopic) {
    setConfig((previous) => (previous.gameId === 'colores' ? { ...previous, topic } : previous));
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
              {config.gameId === 'orden' ? 'Baraja numérica 1–100' : 'Juego para hablar en la mesa'}
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
          <QuantityStepper
            legend="Rondas máximas"
            helperText={
              config.gameId === 'colores'
                ? 'Límite de seguridad si nadie alcanza antes los puntos para ganar.'
                : 'Número máximo de preguntas de la partida.'
            }
            value={config.rounds}
            onChange={(value) => setField('rounds', value)}
            options={(config.gameId === 'colores' ? [10, 15, 20] : [5, 7, 10, 12]).map((value) => ({
              value,
              label: String(value),
            }))}
            valueSuffix="rondas"
          />
          <QuantityStepper
            legend="Puntos para ganar"
            helperText="La primera persona que llegue a este marcador gana."
            value={config.pointsToWin}
            onChange={(value) => setField('pointsToWin', value)}
            options={[5, 10, 15, 20, 25, 30, 40].map((value) => ({
              value,
              label: String(value),
            }))}
            valueSuffix="puntos"
          />
        </>
      )}
    </section>
  );
}
