// Formulario de creación de sala, por juego. Contrato P13: máximo 5 opciones
// visibles a la vez, el resto tras "Más variantes". Al enviar: room:create
// (vía store.createRoom) y navegación a /sala/[code].
'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import {
  DEFAULT_CONFIG,
  DEFAULT_MUS_CONFIG,
  DEFAULT_POCHA_CONFIG,
  messageFor,
  type ChinchonConfig,
  type GameId,
  type MusConfig,
  type PochaConfig,
} from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { isValidNick, normalizeNick } from '@/lib/nick';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NickLegalNote } from '@/components/ui/NickLegalNote';

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
  const [submitting, setSubmitting] = useState(false);

  const title =
    gameId === 'mus'
      ? 'Crear partida de Mus'
      : gameId === 'pocha'
        ? 'Crear partida de Pocha'
        : 'Crear partida de Chinchón';

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
      gameId === 'mus' ? musConfig : gameId === 'pocha' ? pochaConfig : chinchonConfig;
    const created = await useRondaStore.getState().createRoom(gameId, config, normalized);
    setSubmitting(false);
    if (created) {
      const code = useRondaStore.getState().roomCode;
      if (code) router.push(`/sala/${code}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-40 leading-display text-hueso">{title}</h1>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
            className="min-h-14 rounded-lg border border-linea bg-mesa px-4 text-16 text-hueso"
            placeholder="Cómo te van a ver los demás"
          />
          <NickLegalNote />
          {nickError ? <p className="text-14 text-brasa">{nickError}</p> : null}
        </div>

        {gameId === 'mus' ? (
          <MusVariants config={musConfig} setConfig={setMusConfig} />
        ) : gameId === 'pocha' ? (
          <PochaVariants config={pochaConfig} setConfig={setPochaConfig} />
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
      <SegmentedControl
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => set('maxPlayers', v)}
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
        onChange={(v) => set('closeThreshold', v)}
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
        onChange={(v) => set('eliminationScore', v)}
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
        onChange={(v) => set('chinchonEndsGame', v)}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
      />

      <details className="rounded-lg border border-linea px-4 py-3">
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
        El Mus se juega siempre entre cuatro, en dos parejas. Podrás decidir quién va con quién en la
        sala, antes de empezar.
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

      <SegmentedControl
        legend="Juegos para ganar"
        helperText="Cuántos juegos (vacas) hay que ganar para llevarse la partida."
        value={config.juegos}
        onChange={(v) => set('juegos', v)}
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
        onChange={(v) => set('puntoVale', v)}
        options={[
          { value: 1, label: '1 piedra' },
          { value: 2, label: '2 piedras' },
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

interface PochaVariantsProps {
  config: PochaConfig;
  setConfig: (fn: (prev: PochaConfig) => PochaConfig) => void;
}

function PochaVariants({ config, setConfig }: PochaVariantsProps) {
  const set = <K extends keyof PochaConfig>(key: K, value: PochaConfig[K]) =>
    updateConfig(setConfig, key, value);

  return (
    <>
      <SegmentedControl
        legend="Jugadores"
        helperText="Cuántos jugadores puede tener la sala."
        value={config.maxPlayers}
        onChange={(v) => set('maxPlayers', v)}
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
