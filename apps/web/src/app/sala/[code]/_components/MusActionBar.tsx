// Barra de acciones de Mus. Presenta una sola decisión principal cada vez:
// abrir el envite, responderlo o subirlo. Las reglas reales llegan desde el
// motor en `availableActions`; este componente solo las ordena y las explica.
'use client';

import { useState } from 'react';
import type {
  MusAvailableAction,
  MusConfig,
  MusLance,
  MusPhase,
  MusPlayerViewMe,
} from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import {
  formatMusAmount,
  formatMusStepperAmount,
  musEnviteChoices,
  type MusEnviteChoice,
} from '@/lib/mus';

export interface MusActionBarProps {
  phase: MusPhase;
  modo: MusConfig['modo'];
  lance: MusLance | null;
  isMyTurn: boolean;
  me: MusPlayerViewMe;
  /** Cartas marcadas para el descarte. */
  selectedCount: number;
  turnPlayerNick: string | null;
  turnPlayerConnected: boolean;
  /** Envite vivo: hay que quererlo, rechazarlo o subirlo. */
  bet: { piedras: number; isOrdago: boolean; ifRejected: number; byTeam: 0 | 1 } | null;
  onRepartir: () => void;
  onMus: (quiere: boolean) => void;
  onDescartar: () => void;
  onDeclararPares: () => void;
  onDeclararJuego: () => void;
  onPaso: () => void;
  onEnvidar: (piedras: number) => void;
  onOrdago: () => void;
  onQuerer: (quiere: boolean) => void;
}

export const LANCE_LABEL: Record<MusLance, string> = {
  grande: 'Grande',
  chica: 'Chica',
  pares: 'Pares',
  juego: 'Juego',
  punto: 'Punto',
};

const PARES_LABEL = {
  duples: 'Duples',
  medias: 'Medias',
  pareja: 'Pareja',
} as const;

const COMPACT_BUTTON = '!min-h-12 !rounded-xl px-3';

const PHASE_HINT: Record<MusPhase, string> = {
  reparto: 'Reparte cuatro cartas a cada jugador.',
  mus: '¿Mus?',
  descarte: 'Marca las cartas que te quieras quitar.',
  declararPares: '¿Tienes pares?',
  declararJuego: '¿Tienes juego?',
  lance: '',
  recuento: 'Contando la mano…',
};

function teamLabel(teamIndex: 0 | 1): string {
  return `pareja ${teamIndex === 0 ? 'A' : 'B'}`;
}

interface MusEnviteControlsProps {
  minEnvite: number;
  canOrdago: boolean;
  actionLabel: 'Envidar' | 'Subir';
  onConfirm: (piedras: number) => void;
  onOrdago: () => void;
  onPaso?: () => void;
}

function MusEnviteControls({
  minEnvite,
  canOrdago,
  actionLabel,
  onConfirm,
  onOrdago,
  onPaso,
}: MusEnviteControlsProps) {
  const choices = musEnviteChoices(minEnvite).filter((choice) => canOrdago || choice !== 'ordago');
  const [choice, setChoice] = useState<MusEnviteChoice>(() => choices[0] ?? minEnvite);
  const choiceIndex = Math.max(0, choices.indexOf(choice));
  const isOrdago = choice === 'ordago';
  const amountDisplay = isOrdago ? null : formatMusStepperAmount(choice);

  function confirmChoice() {
    if (isOrdago) {
      onOrdago();
      return;
    }
    onConfirm(choice);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(104px,0.5fr)] gap-2">
        <div
          role="group"
          aria-label={
            actionLabel === 'Subir' ? 'Cantidad total del reenvido' : 'Cantidad del envite'
          }
          className={`flex min-h-[52px] min-w-0 items-stretch overflow-hidden rounded-xl border bg-mesa ${
            isOrdago ? 'border-brasa/80' : 'border-oro/60'
          }`}
        >
          <button
            type="button"
            aria-label="Bajar envite"
            disabled={choiceIndex === 0}
            onClick={() => setChoice(choices[choiceIndex - 1] ?? choice)}
            className="min-w-12 border-r border-linea px-2 text-22 text-hueso transition-colors hover:bg-madera-clara disabled:opacity-30"
          >
            −
          </button>

          <div
            aria-live="polite"
            className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center leading-tight"
          >
            <span
              className={`max-w-full truncate font-semibold ${
                isOrdago ? 'text-15 uppercase tracking-wide text-brasa' : 'text-14 text-hueso'
              }`}
            >
              {isOrdago ? 'Órdago' : amountDisplay?.primary}
            </span>
            <span className="min-h-3 text-10 text-humo">
              {isOrdago ? 'Juego entero' : amountDisplay?.secondary}
            </span>
          </div>

          <button
            type="button"
            aria-label="Subir envite"
            disabled={choiceIndex >= choices.length - 1}
            onClick={() => setChoice(choices[choiceIndex + 1] ?? choice)}
            className="min-w-12 border-l border-linea px-2 text-22 text-hueso transition-colors hover:bg-madera-clara disabled:opacity-30"
          >
            +
          </button>
        </div>

        <Button
          variant={isOrdago ? 'danger' : 'primary'}
          onClick={confirmChoice}
          className="!min-h-[52px] !rounded-xl px-3 text-14"
        >
          {isOrdago ? 'Confirmar' : actionLabel}
        </Button>
      </div>

      {onPaso || canOrdago ? (
        <div className={`grid gap-2 ${onPaso && canOrdago ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onPaso ? (
            <Button variant="ghost" onClick={onPaso} className={`w-full ${COMPACT_BUTTON}`}>
              Paso
            </Button>
          ) : null}
          {canOrdago ? (
            <Button
              variant="danger"
              aria-pressed={isOrdago}
              onClick={() => setChoice('ordago')}
              className={`w-full ${COMPACT_BUTTON} ${isOrdago ? 'border-brasa bg-brasa/20' : ''}`}
            >
              Órdago
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MusActionBar({
  phase,
  modo,
  lance,
  isMyTurn,
  me,
  selectedCount,
  turnPlayerNick,
  turnPlayerConnected,
  bet,
  onRepartir,
  onMus,
  onDescartar,
  onDeclararPares,
  onDeclararJuego,
  onPaso,
  onEnvidar,
  onOrdago,
  onQuerer,
}: MusActionBarProps) {
  const can = (action: MusAvailableAction) => me.availableActions.includes(action);
  const canEnvido =
    can('envidar') &&
    (lance !== 'pares' || me.pares !== null) &&
    (lance !== 'juego' || me.juego.tiene);
  const canOrdago =
    can('ordago') &&
    (lance !== 'pares' || me.pares !== null) &&
    (lance !== 'juego' || me.juego.tiene);
  const lanceName = phase === 'reparto' ? 'Reparto' : lance ? LANCE_LABEL[lance] : 'Mus';
  const announcement = isMyTurn
    ? `Tu turno. ${lanceName}. ${PHASE_HINT[phase]}`
    : turnPlayerNick
      ? turnPlayerConnected
        ? `Le toca a ${turnPlayerNick}.`
        : `Esperando a ${turnPlayerNick}; está desconectado.`
      : '';

  const liveRegion = (
    <p className="sr-only" aria-live="polite" role="status">
      {announcement}
    </p>
  );

  if (!isMyTurn) {
    return (
      <div className="action-dock flex shrink-0 flex-col gap-1.5 px-3 py-2 text-center">
        {liveRegion}
        <p className="truncate text-12 text-hueso">
          {turnPlayerNick
            ? turnPlayerConnected
              ? `Le toca a ${turnPlayerNick}`
              : `Esperando a ${turnPlayerNick}`
            : ' '}
        </p>
        {bet ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-linea bg-mesa px-3 py-1.5">
            <span className="text-10 uppercase tracking-wider text-humo">Envite</span>
            <span className="text-12 font-semibold text-hueso">
              {bet.isOrdago
                ? 'Órdago'
                : `${formatMusAmount(bet.piedras)} · ${teamLabel(bet.byTeam)}`}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="action-dock flex shrink-0 flex-col gap-2 px-3 py-2">
      {liveRegion}
      <div className="flex items-center justify-center gap-2 text-center">
        <p className="text-10 font-semibold uppercase tracking-wider text-oro">Tu turno</p>
        <span aria-hidden="true" className="text-10 text-linea">
          ·
        </span>
        <p className="text-14 font-semibold text-hueso">{lanceName}</p>
      </div>

      {modo === 'presencial' && phase !== 'reparto' ? (
        <p className="text-center text-10 text-humo">
          Habladlo en la mesa y confirma aquí la decisión.
        </p>
      ) : null}

      {phase === 'reparto' && can('repartir') ? (
        <Button onClick={onRepartir} className={`w-full ${COMPACT_BUTTON}`}>
          Repartir 4 cartas
        </Button>
      ) : null}

      {phase === 'mus' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onMus(true)} className={`w-full ${COMPACT_BUTTON}`}>
            Mus
          </Button>
          <Button
            variant="ghost"
            onClick={() => onMus(false)}
            className={`w-full ${COMPACT_BUTTON}`}
          >
            Cortar
          </Button>
        </div>
      ) : null}

      {phase === 'descarte' ? (
        <Button
          onClick={onDescartar}
          disabled={selectedCount === 0}
          className={`w-full ${COMPACT_BUTTON}`}
        >
          {selectedCount === 0
            ? 'Marca alguna carta'
            : `Descartar ${selectedCount} ${selectedCount === 1 ? 'carta' : 'cartas'}`}
        </Button>
      ) : null}

      {phase === 'declararPares' ? (
        <Button onClick={onDeclararPares} className={`w-full ${COMPACT_BUTTON}`}>
          {me.pares ? `Tengo pares · ${PARES_LABEL[me.pares.kind]}` : 'No tengo pares'}
        </Button>
      ) : null}

      {phase === 'declararJuego' ? (
        <Button onClick={onDeclararJuego} className={`w-full ${COMPACT_BUTTON}`}>
          {me.juego.tiene ? `Tengo juego · ${me.juego.suma}` : 'No tengo juego'}
        </Button>
      ) : null}

      {phase === 'lance' && bet === null ? (
        <>
          <p className="text-center text-10 text-humo">Sin envite · elige la cantidad</p>
          {canEnvido ? (
            <MusEnviteControls
              key={`abrir-${me.minEnvite ?? 2}`}
              minEnvite={me.minEnvite ?? 2}
              canOrdago={canOrdago}
              actionLabel="Envidar"
              onConfirm={onEnvidar}
              onOrdago={onOrdago}
              onPaso={onPaso}
            />
          ) : (
            <div className={`grid gap-2 ${canOrdago ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Button variant="ghost" onClick={onPaso} className={`w-full ${COMPACT_BUTTON}`}>
                Paso
              </Button>
              {canOrdago ? (
                <Button variant="danger" onClick={onOrdago} className={`w-full ${COMPACT_BUTTON}`}>
                  Órdago
                </Button>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {phase === 'lance' && bet !== null ? (
        <>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-oro/60 bg-mesa px-3 py-1.5 text-center">
            <span className="text-10 uppercase tracking-wider text-humo">Envite</span>
            <span className="text-14 font-semibold text-hueso">
              {bet.isOrdago ? 'Órdago' : formatMusAmount(bet.piedras)}
            </span>
            <span className="text-10 text-humo">
              {bet.isOrdago
                ? '· juego entero'
                : `· no querer da ${formatMusAmount(bet.ifRejected)} a ${teamLabel(bet.byTeam)}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {can('querer') ? (
              <Button onClick={() => onQuerer(true)} className={`w-full ${COMPACT_BUTTON}`}>
                Quiero
              </Button>
            ) : null}
            {can('noQuerer') ? (
              <Button
                variant="ghost"
                onClick={() => onQuerer(false)}
                className={`w-full ${COMPACT_BUTTON}`}
              >
                No quiero
              </Button>
            ) : null}
          </div>

          {canEnvido || canOrdago ? (
            <div className="border-t border-linea pt-2">
              {canEnvido ? (
                <MusEnviteControls
                  key={`subir-${me.minEnvite ?? 2}`}
                  minEnvite={me.minEnvite ?? 2}
                  canOrdago={canOrdago}
                  actionLabel="Subir"
                  onConfirm={onEnvidar}
                  onOrdago={onOrdago}
                />
              ) : canOrdago ? (
                <Button variant="danger" onClick={onOrdago} className={`w-full ${COMPACT_BUTTON}`}>
                  Órdago
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
