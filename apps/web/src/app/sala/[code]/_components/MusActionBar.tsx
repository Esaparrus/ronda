// Barra de acciones de Mus. Presenta una sola decisión principal cada vez:
// abrir el envite, responderlo o subirlo. Las reglas reales llegan desde el
// motor en `availableActions`; este componente solo las ordena y las explica.
'use client';

import { useState } from 'react';
import type {
  MusAvailableAction,
  MusConfig,
  MusLance,
  MusPartnerSignal,
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
  musConsultingTeam: 0 | 1 | null;
  onRepartir: () => void;
  onMus: (quiere: boolean) => void;
  onMusSignal: (signal: MusPartnerSignal) => void;
  onDescartar: () => void;
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

const COMPACT_BUTTON = '!min-h-12 !rounded-xl px-3';

export const MUS_SIGNAL_LABEL: Record<MusPartnerSignal, string> = {
  porMiMus: 'Por mí, mus',
  prefieroCortar: 'Prefiero cortar',
  tePuedoAyudar: 'Te puedo ayudar',
  voyFlojo: 'Voy flojo',
  decideTu: 'Decide tú',
};

const MUS_SIGNALS = Object.keys(MUS_SIGNAL_LABEL) as MusPartnerSignal[];

const PHASE_HINT: Record<MusPhase, string> = {
  reparto: 'Reparte cuatro cartas a cada jugador.',
  mus: '¿Mus?',
  descarte: 'Marca las cartas que te quieras quitar.',
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
  musConsultingTeam,
  onRepartir,
  onMus,
  onMusSignal,
  onDescartar,
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

  if (modo === 'online' && phase === 'mus') {
    const consultation = me.musConsultation;
    if (!consultation) {
      return (
        <div className="action-dock flex shrink-0 flex-col gap-1.5 px-3 py-3 text-center">
          <p className="text-10 font-semibold uppercase tracking-wider text-humo">
            Consulta privada
          </p>
          <p className="text-14 font-semibold text-hueso">
            {musConsultingTeam === null
              ? 'Preparando la decisión'
              : `${teamLabel(musConsultingTeam)} está decidiendo`}
          </p>
          <p className="text-10 text-humo">Sus mensajes solo los ve su compañero.</p>
        </div>
      );
    }

    const canSignal = can('musSignal');
    const waitingForPartner = consultation.myDecision === true || consultation.myDelegated;

    return (
      <div className="action-dock flex shrink-0 flex-col gap-2 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-10 font-semibold uppercase tracking-wider text-oro">
              Consulta privada
            </p>
            <p className="truncate text-13 font-semibold text-hueso">
              Habla con {consultation.partnerNick}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-verde/60 bg-verde/15 px-2 py-1 text-9 font-semibold uppercase tracking-wide text-hueso">
            Solo pareja
          </span>
        </div>

        {consultation.partnerSignal ? (
          <p className="rounded-xl border border-oro/50 bg-oro/10 px-3 py-1.5 text-12 text-hueso">
            <span className="text-humo">{consultation.partnerNick}: </span>
            {MUS_SIGNAL_LABEL[consultation.partnerSignal]}
          </p>
        ) : (
          <p className="text-center text-10 text-humo">
            {consultation.partnerDecision === true
              ? `${consultation.partnerNick} ha dicho mus.`
              : `Esperando la indicación de ${consultation.partnerNick}.`}
          </p>
        )}

        <div>
          <p className="mb-1 text-center text-10 text-humo">¿Qué le quieres decir?</p>
          <div className="grid grid-cols-3 gap-1">
            {MUS_SIGNALS.map((signal) => {
              const selected = consultation.mySignal === signal;
              return (
                <button
                  key={signal}
                  type="button"
                  disabled={!canSignal}
                  aria-pressed={selected}
                  onClick={() => onMusSignal(signal)}
                  className={`min-h-9 rounded-lg border px-1.5 text-[10px] font-semibold leading-tight transition-colors disabled:opacity-45 ${
                    selected
                      ? 'border-oro bg-oro/20 text-hueso'
                      : 'border-linea bg-mesa/70 text-humo hover:border-oro/60 hover:text-hueso'
                  }`}
                >
                  {MUS_SIGNAL_LABEL[signal]}
                </button>
              );
            })}
          </div>
        </div>

        {waitingForPartner ? (
          <p className="rounded-xl border border-linea bg-mesa/70 px-3 py-2 text-center text-12 text-hueso">
            {consultation.myDelegated
              ? `${consultation.partnerNick} decide por los dos.`
              : `Has dicho mus. Esperando a ${consultation.partnerNick}.`}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {can('mus') ? (
              <Button onClick={() => onMus(true)} className={`w-full ${COMPACT_BUTTON}`}>
                Confirmar mus
              </Button>
            ) : null}
            {can('noMus') ? (
              <Button
                variant="danger"
                onClick={() => onMus(false)}
                className={`w-full ${COMPACT_BUTTON}`}
              >
                No hay mus
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

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

  if (phase === 'lance' && bet !== null) {
    const bettingTeam = teamLabel(bet.byTeam);
    return (
      <div className="action-dock flex shrink-0 flex-col gap-2 px-3 py-2">
        {liveRegion}
        <div className="rounded-xl border border-oro/60 bg-mesa/75 px-3 py-2.5">
          <p className="text-10 font-semibold uppercase tracking-wider text-humo">
            {bettingTeam} te envida
          </p>
          <div className="mt-0.5 flex items-end justify-between gap-3">
            <p className="shrink-0 font-display text-20 font-semibold text-hueso">
              {bet.isOrdago ? 'Órdago' : formatMusAmount(bet.piedras)}
            </p>
            <p className="max-w-[52%] text-right text-11 leading-snug text-humo">
              {bet.isOrdago
                ? 'Está en juego la partida entera.'
                : `Si no quieres, ${bettingTeam} gana ${formatMusAmount(bet.ifRejected)}.`}
            </p>
          </div>
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
          <details className="group rounded-xl border border-linea bg-mesa/45">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-12 font-semibold text-hueso">
              <span>¿Quieres subir la apuesta?</span>
              <span className="shrink-0 text-oro group-open:hidden">Ver opciones</span>
              <span className="hidden shrink-0 text-oro group-open:inline">Ocultar</span>
            </summary>
            <div className="border-t border-linea p-2">
              {canEnvido ? (
                <MusEnviteControls
                  key={`subir-${me.minEnvite ?? 2}`}
                  minEnvite={me.minEnvite ?? 2}
                  canOrdago={canOrdago}
                  actionLabel="Subir"
                  onConfirm={onEnvidar}
                  onOrdago={onOrdago}
                />
              ) : (
                <Button variant="danger" onClick={onOrdago} className={`w-full ${COMPACT_BUTTON}`}>
                  Órdago
                </Button>
              )}
            </div>
          </details>
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
    </div>
  );
}
