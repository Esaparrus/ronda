'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { GameAction, MatizPlayerView } from '@ronda/protocol';
import { MATIZ_CHALLENGES } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { COLOR_TOKENS, MATIZ_COLOR_TOKENS, MATIZ_HUE_GRADIENT } from '@/lib/tokens';
import { Button } from '@/components/ui/Button';
import { PlayerStrip } from '@/app/sala/[code]/_components/PlayerStrip';
import { readMatizEnabledChallengeIds } from '@/lib/matiz-catalog';
import { TableHeader } from '@/app/sala/[code]/_components/TableHeader';
import { MatizMaskedImage } from './MatizMaskedImage';

export interface MatizArtworkProps {
  challengeId: string;
  color: string;
  targetHex?: string | null;
  className?: string;
}

export function MatizArtwork({
  challengeId,
  color,
  targetHex = null,
  className = '',
}: MatizArtworkProps) {
  const art = artworkForChallenge(challengeId);
  const fill = targetHex ?? color;

  return (
    <div
      className={`relative aspect-[800/620] w-full overflow-hidden rounded-[30px] border border-linea bg-mesa shadow-[0_16px_36px_rgba(34,37,48,0.12)] ${className}`}
    >
      <MatizMaskedImage
        imageSrc={art.image}
        maskSrc={art.mask}
        color={fill}
        alt="Ilustración del reto de Matiz"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

function artworkForChallenge(challengeId: string) {
  if (challengeId === 'popeye-camiseta') {
    return {
      image: '/games/matiz/popeye-camiseta-base.png',
      mask: '/games/matiz/popeye-camiseta-mask.png',
    };
  }
  return {
    image: `/games/matiz/${challengeId}-base.png`,
    mask: `/games/matiz/${challengeId}-mask.png`,
  };
}

interface MatizPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MatizPicker({ value, onChange, disabled = false }: MatizPickerProps) {
  const decodedColor = useMemo(() => hexToPickerColor(value), [value]);
  const [hue, setHue] = useState(decodedColor.h);
  const lastEmittedValueRef = useRef<string | null>(null);
  const pickerColor = useMemo(() => ({ ...decodedColor, h: hue }), [decodedColor, hue]);
  const fieldBackground = useMemo(
    () =>
      [
        'linear-gradient(to top, black 0%, transparent 100%)',
        'linear-gradient(to right, white 0%, transparent 100%)',
        `hsl(${pickerColor.h} 100% 50%)`,
      ].join(', '),
    [pickerColor.h],
  );

  useEffect(() => {
    if (lastEmittedValueRef.current === value) {
      lastEmittedValueRef.current = null;
      return;
    }
    setHue(decodedColor.h);
  }, [decodedColor.h, value]);

  function emit(nextColor: PickerColor) {
    const nextValue = pickerColorToHex(nextColor);
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  }

  function update(next: Partial<PickerColor>) {
    const nextColor = { ...pickerColor, ...next };
    if (next.h !== undefined) setHue(nextColor.h);
    emit(nextColor);
  }

  function updateFromNativeColor(nextValue: string) {
    const normalizedValue = nextValue.toLowerCase();
    setHue(hexToPickerColor(normalizedValue).h);
    lastEmittedValueRef.current = normalizedValue;
    onChange(normalizedValue);
  }

  function updateFieldFromPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const brightness = clamp(100 - ((event.clientY - bounds.top) / bounds.height) * 100, 0, 100);
    update({ s: saturation, v: brightness });
  }

  function handleFieldPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFieldFromPointer(event);
  }

  function handleFieldPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFieldFromPointer(event);
  }

  function releaseFieldPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1;
    const next: Partial<PickerColor> = {};

    if (event.key === 'ArrowLeft') next.s = pickerColor.s - step;
    if (event.key === 'ArrowRight') next.s = pickerColor.s + step;
    if (event.key === 'ArrowDown') next.v = pickerColor.v - step;
    if (event.key === 'ArrowUp') next.v = pickerColor.v + step;

    if (Object.keys(next).length === 0) return;
    event.preventDefault();
    update(next);
  }

  return (
    <section className="surface-panel flex w-full flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <label
          htmlFor="matiz-native-color"
          className="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-white shadow-[0_4px_14px_rgba(0,0,0,.16)]"
          style={{ backgroundColor: value }}
          title="Elegir color con el móvil"
          aria-label="Elegir color con el selector del dispositivo"
        />
        <input
          id="matiz-native-color"
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => updateFromNativeColor(event.target.value)}
          className="sr-only"
        />
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-12 font-semibold uppercase tracking-[0.12em] text-humo">
            Tu mezcla
          </p>
          <p className="mt-1 font-mono text-20 font-semibold uppercase text-hueso">{value}</p>
        </div>
        <span className="shrink-0 rounded-full bg-tinta px-3 py-1 font-mono text-11 text-humo">
          T {Math.round(pickerColor.h)}° · S {Math.round(pickerColor.s)}% · B{' '}
          {Math.round(pickerColor.v)}%
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-13 font-semibold text-hueso">Afina la mezcla</p>
            <p className="mt-1 text-12 leading-relaxed text-humo">
              Toca o arrastra el punto · usa la franja para cambiar el tono
            </p>
          </div>
          <span className="shrink-0 font-mono text-12 text-humo">{value}</span>
        </div>
        <div
          className="matiz-color-field relative mx-auto aspect-square w-full max-w-[280px] rounded-[22px] border-2 border-white shadow-[inset_0_1px_3px_rgba(22,24,29,.18),0_8px_18px_rgba(22,24,29,.12)] sm:max-w-[320px]"
          style={{ background: fieldBackground }}
          role="group"
          aria-label="Ajuste de saturación y claridad. Toca o arrastra para elegir el color."
          aria-describedby="matiz-picker-help"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleFieldKeyDown}
          onPointerDown={handleFieldPointerDown}
          onPointerMove={handleFieldPointerMove}
          onPointerUp={releaseFieldPointer}
          onPointerCancel={releaseFieldPointer}
        >
          <span
            className="pointer-events-none absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-black/10 shadow-[0_0_0_2px_rgba(22,24,29,.3),0_2px_8px_rgba(22,24,29,.55)]"
            style={{ left: `${pickerColor.s}%`, top: `${100 - pickerColor.v}%` }}
          />
          <span className="pointer-events-none absolute inset-x-3 top-2 text-11 font-semibold text-white drop-shadow-[0_1px_2px_rgba(22,24,29,.7)]">
            Más claro
          </span>
          <span className="pointer-events-none absolute inset-x-3 bottom-2 text-11 font-semibold text-white drop-shadow-[0_1px_2px_rgba(22,24,29,.7)]">
            Más oscuro
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-[320px] justify-between px-1 text-11 text-humo">
          <span>Grisáceo</span>
          <span>Intenso</span>
        </div>
        <p id="matiz-picker-help" className="mx-auto max-w-[320px] text-center text-11 leading-relaxed text-humo">
          También puedes tocar la muestra de arriba para abrir el selector de color del dispositivo.
        </p>
      </div>

      <SliderRow
        label="Tono"
        value={pickerColor.h}
        min={0}
        max={359}
        disabled={disabled}
        background={MATIZ_HUE_GRADIENT}
        onChange={(next) => update({ h: next })}
        suffix="°"
      />
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  disabled,
  background,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  background: string;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[74px_1fr_46px] items-center gap-3 text-13 text-humo">
      <span className="font-semibold text-hueso">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="matiz-slider h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{ background }}
        aria-label={label}
      />
      <span className="text-right font-mono text-12">
        {Math.round(value)}
        {suffix}
      </span>
    </label>
  );
}

export function MatizPlayerRound({
  view,
  onAction,
  embedded = false,
}: {
  view: MatizPlayerView;
  onAction?: (action: GameAction) => void;
  embedded?: boolean;
}) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const [color, setColor] = useState<string>(MATIZ_COLOR_TOKENS.neutral);
  const { party, me } = view;
  const isHost = view.players.find((player) => player.playerId === me.playerId)?.isHost ?? false;
  const submitted = me.submitted;
  const dispatch =
    onAction ?? ((action: GameAction) => void useRondaStore.getState().sendAction(action));

  useEffect(() => {
    setColor(MATIZ_COLOR_TOKENS.neutral);
  }, [party.challengeId]);

  function submit() {
    dispatch({ type: 'submitMatiz', hex: color });
  }

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={embedded ? 'Minijuego · Matiz' : `Matiz · ronda ${view.round}/${view.config.rounds}`}
        turnNick={null}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
      />
      <main className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-5">
        <section className="flex w-full max-w-xl flex-col gap-1 text-center">
          <span className="text-12 font-semibold uppercase tracking-[0.14em] text-oro">
            {party.title}
          </span>
          <h1 className="text-20 font-semibold text-hueso">{party.subtitle}</h1>
          <p className="text-13 text-humo">
            Ajusta el color y la intensidad. Después, bloquea tu color.
          </p>
        </section>
        <MatizArtwork
          challengeId={party.challengeId}
          color={color}
          targetHex={party.targetHex}
          className="max-w-xl"
        />
        {party.phase === 'input' ? (
          <MatizPicker value={color} onChange={setColor} disabled={submitted || pendingAction} />
        ) : null}
        {party.phase === 'input' && !submitted ? (
          <Button onClick={submit} loading={pendingAction} className="w-full max-w-xl">
            Aceptar este color
          </Button>
        ) : party.phase === 'input' ? (
          <p className="rounded-2xl bg-oro/10 px-4 py-3 text-center text-15 font-semibold text-oro">
            Color bloqueado · {party.submittedPlayerIds.length}/{view.players.length} han respondido
          </p>
        ) : (
          <MatizReveal view={view} />
        )}
        {party.phase === 'input' && isHost && party.submittedPlayerIds.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: 'finishMatiz' })}
            loading={pendingAction}
            className="w-full max-w-xl"
          >
            Revelar ya
          </Button>
        ) : null}
        {party.phase === 'reveal' && view.status === 'playing' && isHost ? (
          <Button
            onClick={() => dispatch({ type: 'nextRound' })}
            loading={pendingAction}
            className="w-full max-w-xl"
          >
            Siguiente ronda
          </Button>
        ) : null}
        {party.phase === 'reveal' && view.status === 'playing' && !isHost ? (
          <p className="text-center text-14 text-humo">Esperando al anfitrión.</p>
        ) : null}
      </main>
    </div>
  );
}

function MatizReveal({ view }: { view: MatizPlayerView }) {
  const { party } = view;
  const myAnswer = party.answers?.[view.me.playerId] ?? null;
  const myAccuracy = party.scoreDeltas?.[view.me.playerId] ?? 0;
  return (
    <section className="surface-panel flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-verde/45 bg-verde/10 p-2">
          <MatizArtwork
            challengeId={party.challengeId}
            color={party.targetHex ?? COLOR_TOKENS.mesa}
            className="!rounded-xl"
          />
          <div className="mt-2 flex flex-col gap-0.5 px-1">
            <p className="text-11 font-semibold uppercase tracking-[0.1em] text-humo">Original</p>
            <p className="font-mono text-12 font-semibold uppercase text-hueso">
              {party.targetHex}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-oro/45 bg-oro/10 p-2">
          <MatizArtwork
            challengeId={party.challengeId}
            color={myAnswer ?? MATIZ_COLOR_TOKENS.placeholder}
            className="!rounded-xl"
          />
          <div className="mt-2 flex flex-col gap-0.5 px-1">
            <p className="text-11 font-semibold uppercase tracking-[0.1em] text-humo">Tu mezcla</p>
            <p className="font-mono text-12 font-semibold uppercase text-hueso">
              {myAnswer ?? 'Sin respuesta'}
            </p>
          </div>
        </div>
      </div>
      <p className="rounded-2xl border border-oro/35 bg-oro/10 px-3 py-2 text-center text-14 text-hueso">
        Has conseguido <strong className="font-mono text-oro">{myAccuracy}% de precisión</strong>.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {view.players.map((player) => {
          const answer = party.answers?.[player.playerId];
          const points = party.scoreDeltas?.[player.playerId] ?? 0;
          return (
            <div
              key={player.playerId}
              className="flex items-center gap-3 rounded-2xl border border-linea bg-tinta/50 px-3 py-2"
            >
              <span
                className="size-9 shrink-0 rounded-xl border border-white shadow"
                style={{ backgroundColor: answer ?? MATIZ_COLOR_TOKENS.placeholder }}
              />
              <span className="min-w-0 flex-1 truncate text-14 font-semibold text-hueso">
                {player.nick}
              </span>
              <span className="font-mono text-16 font-semibold text-oro">{points}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MatizSoloGame() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [color, setColor] = useState<string>(MATIZ_COLOR_TOKENS.neutral);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>(() =>
    MATIZ_CHALLENGES.map((challenge) => challenge.id),
  );

  useEffect(() => {
    setEnabledIds(readMatizEnabledChallengeIds());
  }, []);

  const activeChallenges = useMemo(() => {
    const enabledIdSet = new Set(enabledIds);
    const filtered = MATIZ_CHALLENGES.filter((challenge) => enabledIdSet.has(challenge.id));
    return filtered.length > 0 ? filtered : MATIZ_CHALLENGES;
  }, [enabledIds]);
  const challenge = activeChallenges[roundIndex % activeChallenges.length] ?? activeChallenges[0];
  const finished = roundIndex >= activeChallenges.length;

  function confirm() {
    const points = scoreMatizColor(color, challenge.targetHex);
    setScore((current) => current + points);
    setScores((current) => [...current, points]);
    setRevealed(true);
  }

  function next() {
    setRoundIndex((current) => current + 1);
    setColor(MATIZ_COLOR_TOKENS.neutral);
    setRevealed(false);
  }

  function restart() {
    setRoundIndex(0);
    setColor(MATIZ_COLOR_TOKENS.neutral);
    setRevealed(false);
    setScore(0);
    setScores([]);
  }

  if (finished) {
    return (
      <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
        <span className="text-56">🎨</span>
        <span className="eyebrow">Partida individual terminada</span>
        <h1 className="font-display text-40 leading-display text-hueso">
          {score}/{activeChallenges.length * 100} puntos
        </h1>
        <p className="text-16 leading-relaxed text-humo">
          Tu media ha sido {Math.round(score / activeChallenges.length)} por reto.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {scores.map((points, index) => (
            <span
              key={index}
              className="rounded-full bg-oro/10 px-3 py-1 font-mono text-13 text-oro"
            >
              R{index + 1} · {points}
            </span>
          ))}
        </div>
        <Button onClick={restart}>Jugar otra vez</Button>
      </main>
    );
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Partida individual</span>
          <h1 className="mt-1 font-display text-32 leading-display text-hueso">Matiz</h1>
        </div>
        <span className="rounded-full bg-mesa px-3 py-2 font-mono text-13 text-humo shadow-sm">
          {roundIndex + 1}/{activeChallenges.length} · {score} pts
        </span>
      </header>
      <section className="surface-panel flex flex-col gap-1 p-4 text-center">
        <span className="text-12 font-semibold uppercase tracking-[0.14em] text-oro">
          {challenge.title}
        </span>
        <p className="text-15 text-hueso">{challenge.subtitle}</p>
      </section>
      {!revealed ? <MatizArtwork challengeId={challenge.id} color={color} /> : null}
      {!revealed ? <MatizPicker value={color} onChange={setColor} /> : null}
      {!revealed ? (
        <Button onClick={confirm} className="w-full">
          Aceptar color
        </Button>
      ) : (
        <section className="surface-panel flex flex-col gap-4 p-4 text-center">
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="rounded-2xl border border-verde/45 bg-verde/10 p-2">
              <MatizArtwork
                challengeId={challenge.id}
                color={challenge.targetHex}
                className="!rounded-xl"
              />
              <p className="mt-2 px-1 text-11 font-semibold uppercase tracking-wider text-humo">
                Original
              </p>
              <p className="px-1 font-mono text-12 uppercase text-hueso">{challenge.targetHex}</p>
            </div>
            <div className="rounded-2xl border border-oro/45 bg-oro/10 p-2">
              <MatizArtwork challengeId={challenge.id} color={color} className="!rounded-xl" />
              <p className="mt-2 px-1 text-11 font-semibold uppercase tracking-wider text-humo">
                Tu mezcla
              </p>
              <p className="px-1 font-mono text-12 uppercase text-hueso">{color}</p>
            </div>
          </div>
          <p className="font-display text-34 text-oro">
            {scores[scores.length - 1] ?? 0}% de precisión
          </p>
          <Button onClick={next}>Siguiente dibujo</Button>
        </section>
      )}
    </main>
  );
}

interface PickerColor {
  h: number;
  s: number;
  v: number;
}
interface HsvColor {
  h: number;
  s: number;
  v: number;
}

function hexToPickerColor(hex: string): PickerColor {
  const hsv = hexToHsv(hex);
  return { h: Math.min(359, Math.round(hsv.h)), s: hsv.s, v: hsv.v };
}

function pickerColorToHex({ h, s, v }: PickerColor): string {
  return hsvToHex({ h, s, v });
}

function hexToHsv(hex: string): HsvColor {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { h: hue, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

function hsvToHex({ h, s, v }: HsvColor): string {
  const saturation = clamp(s, 0, 100) / 100;
  const brightness = clamp(v, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;
  const chroma = brightness * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = brightness - chroma;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreMatizColor(answer: string, target: string): number {
  const a = hexToLab(answer);
  const b = hexToLab(target);
  const distance = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  return Math.max(0, Math.min(100, Math.round(100 - distance / 1.76)));
}

function hexToLab(hex: string): [number, number, number] {
  const channels = [0, 2, 4]
    .map((offset) => Number.parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  const [r = 0, g = 0, b = 0] = channels;
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const pivot = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
