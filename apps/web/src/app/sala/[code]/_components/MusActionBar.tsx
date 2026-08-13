// Barra de acciones de Mus. Presenta una sola decisión principal cada vez:
// abrir el envite, responderlo o subirlo. Las reglas reales llegan desde el
// motor en `availableActions`; este componente solo las ordena y las explica.
'use client';

import type { MusAvailableAction, MusLance, MusPhase, MusPlayerViewMe } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';

export interface MusActionBarProps {
  phase: MusPhase;
  lance: MusLance | null;
  isMyTurn: boolean;
  me: MusPlayerViewMe;
  /** Cartas marcadas para el descarte. */
  selectedCount: number;
  turnPlayerNick: string | null;
  turnPlayerConnected: boolean;
  /** Envite vivo: hay que quererlo, rechazarlo o subirlo. */
  bet: { piedras: number; isOrdago: boolean; ifRejected: number; byTeam: 0 | 1 } | null;
  onMus: (quiere: boolean) => void;
  onDescartar: () => void;
  onDeclararPares: () => void;
  onDeclararJuego: () => void;
  onPaso: () => void;
  onEnvidar: () => void;
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

const PHASE_HINT: Record<MusPhase, string> = {
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

export function MusActionBar({
  phase,
  lance,
  isMyTurn,
  me,
  selectedCount,
  turnPlayerNick,
  turnPlayerConnected,
  bet,
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
  const lanceName = lance ? LANCE_LABEL[lance] : 'Mus';
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
      <div className="action-dock flex flex-col gap-3 px-6 py-4 text-center">
        {liveRegion}
        <p className="text-16 text-hueso">
          {turnPlayerNick
            ? turnPlayerConnected
              ? `Le toca a ${turnPlayerNick}`
              : `Esperando a ${turnPlayerNick}`
            : ' '}
        </p>
        {bet ? (
          <div className="rounded-lg border border-linea bg-mesa px-4 py-3">
            <p className="text-12 uppercase tracking-wider text-humo">Envite actual</p>
            <p className="text-16 font-semibold text-hueso">
              {bet.isOrdago ? 'Órdago' : `${bet.piedras} piedras · ${teamLabel(bet.byTeam)}`}
            </p>
            <p className="text-12 text-humo">
              {bet.isOrdago
                ? 'La pareja contraria debe querer o no querer.'
                : `Si no quiere, ${teamLabel(bet.byTeam)} gana ${bet.ifRejected} ${bet.ifRejected === 1 ? 'piedra' : 'piedras'}.`}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="action-dock flex flex-col gap-3 px-4 py-4">
      {liveRegion}
      <div className="text-center">
        <p className="text-12 font-semibold uppercase tracking-wider text-oro">Tu turno</p>
        <p className="text-20 font-semibold text-hueso">{lanceName}</p>
      </div>

      {phase === 'mus' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onMus(true)} className="w-full">
            Mus
          </Button>
          <Button variant="ghost" onClick={() => onMus(false)} className="w-full">
            Cortar
          </Button>
        </div>
      ) : null}

      {phase === 'descarte' ? (
        <Button onClick={onDescartar} disabled={selectedCount === 0} className="w-full">
          {selectedCount === 0
            ? 'Marca alguna carta'
            : `Descartar ${selectedCount} ${selectedCount === 1 ? 'carta' : 'cartas'}`}
        </Button>
      ) : null}

      {phase === 'declararPares' ? (
        <Button onClick={onDeclararPares} className="w-full">
          {me.pares ? `Tengo pares · ${PARES_LABEL[me.pares.kind]}` : 'No tengo pares'}
        </Button>
      ) : null}

      {phase === 'declararJuego' ? (
        <Button onClick={onDeclararJuego} className="w-full">
          {me.juego.tiene ? `Tengo juego · ${me.juego.suma}` : 'No tengo juego'}
        </Button>
      ) : null}

      {phase === 'lance' && bet === null ? (
        <>
          <div className="rounded-lg border border-linea bg-mesa px-4 py-3 text-center">
            <p className="text-14 text-hueso">No hay apuesta todavía</p>
            <p className="text-12 text-humo">Puedes pasar o abrir el envite desde 2 piedras.</p>
          </div>
          {canEnvido ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={onPaso} className="w-full">
                Paso
              </Button>
              <Button onClick={onEnvidar} className="w-full">
                Envidar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={onPaso} className="w-full">
              Paso
            </Button>
          )}
          {can('ordago') ? (
            <Button variant="danger" onClick={onOrdago} className="w-full">
              Órdago
            </Button>
          ) : null}
        </>
      ) : null}

      {phase === 'lance' && bet !== null ? (
        <>
          <div className="rounded-lg border border-oro/60 bg-mesa px-4 py-3 text-center">
            <p className="text-12 uppercase tracking-wider text-humo">Te están envidando</p>
            <p className="text-20 font-semibold text-hueso">
              {bet.isOrdago ? 'Órdago' : `${bet.piedras} piedras`}
            </p>
            <p className="text-12 text-humo">
              {bet.isOrdago
                ? 'Si quieres, te juegas el juego entero.'
                : `Si no quieres, ${teamLabel(bet.byTeam)} gana ${bet.ifRejected} ${bet.ifRejected === 1 ? 'piedra' : 'piedras'}.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {can('querer') ? (
              <Button onClick={() => onQuerer(true)} className="w-full">
                Quiero
              </Button>
            ) : null}
            {can('noQuerer') ? (
              <Button variant="ghost" onClick={() => onQuerer(false)} className="w-full">
                No quiero
              </Button>
            ) : null}
          </div>

          {canEnvido || can('ordago') ? (
            <div className="border-t border-linea pt-3">
              <p className="mb-2 text-center text-12 uppercase tracking-wider text-humo">
                Otras opciones
              </p>
              <div className="grid grid-cols-2 gap-2">
                {canEnvido ? (
                  <Button variant="ghost" onClick={onEnvidar} className="w-full">
                    Subir
                  </Button>
                ) : null}
                {can('ordago') ? (
                  <Button variant="danger" onClick={onOrdago} className="w-full">
                    Órdago
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
