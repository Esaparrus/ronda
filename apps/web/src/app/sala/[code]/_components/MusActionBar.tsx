// Barra de acción de Mus. A diferencia de Chinchón y Pocha, aquí lo que se
// puede hacer cambia con la FASE (§12.5-§12.8) y no con la carta que tocas:
// decir mus, descartar, declarar pares o juego, y envidar.
//
// La lista de acciones nunca se deduce aquí: viene en `me.availableActions`,
// que la calcula el motor. Este componente solo elige qué botón pintar para
// cada una y con qué texto.
//
// Las dos declaraciones (pares y juego) se pintan como UN solo botón que dice
// la verdad de tu mano. §12.6 las describe como declaraciones públicas y el
// motor rechaza mentir con FALSE_DECLARATION: ofrecer el botón de mentir solo
// serviría para generar errores.
'use client';

import type {
  MusAvailableAction,
  MusLance,
  MusPhase,
  MusPlayerViewMe,
} from '@ronda/protocol';
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
  /** Envite vivo: hay que quererlo o no. */
  bet: { piedras: number; isOrdago: boolean; ifRejected: number } | null;
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

const PHASE_HINT: Record<MusPhase, string> = {
  mus: '¿Mus?',
  descarte: 'Marca las cartas que te quieras quitar.',
  declararPares: '¿Tienes pares?',
  declararJuego: '¿Tienes juego?',
  lance: '',
  recuento: 'Contando la mano…',
};

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
  const can = (a: MusAvailableAction) => me.availableActions.includes(a);

  const announcement = isMyTurn
    ? `Te toca. ${lance ? LANCE_LABEL[lance] + '. ' : ''}${PHASE_HINT[phase]}`
    : turnPlayerNick
      ? turnPlayerConnected
        ? `Le toca a ${turnPlayerNick}.`
        : `Esperando a ${turnPlayerNick}.`
      : '';

  const liveRegion = (
    <p className="sr-only" aria-live="polite" role="status">
      {announcement}
    </p>
  );

  if (!isMyTurn) {
    return (
      <div className="px-6 py-4 text-center">
        {liveRegion}
        <p className="text-16 text-hueso">
          {turnPlayerNick
            ? turnPlayerConnected
              ? `Le toca a ${turnPlayerNick}`
              : `Esperando a ${turnPlayerNick}`
            : ' '}
        </p>
        {bet ? (
          <p className="text-14 text-humo">
            {bet.isOrdago ? 'Órdago sobre la mesa.' : `Hay ${bet.piedras} piedras envidadas.`}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      {liveRegion}
      {lance ? (
        <p className="text-center text-14 text-humo">
          {LANCE_LABEL[lance]}
          {bet
            ? bet.isOrdago
              ? ' · órdago'
              : ` · ${bet.piedras} piedras (si no quieres, se llevan ${bet.ifRejected})`
            : ''}
        </p>
      ) : null}

      {phase === 'mus' ? (
        <div className="flex gap-2">
          <Button onClick={() => onMus(true)} className="flex-1">
            Mus
          </Button>
          <Button variant="ghost" onClick={() => onMus(false)} className="flex-1">
            No hay mus
          </Button>
        </div>
      ) : null}

      {phase === 'descarte' ? (
        <Button onClick={onDescartar} disabled={selectedCount === 0}>
          {selectedCount === 0
            ? 'Marca al menos una carta'
            : `Descartar ${selectedCount} ${selectedCount === 1 ? 'carta' : 'cartas'}`}
        </Button>
      ) : null}

      {phase === 'declararPares' ? (
        <Button onClick={onDeclararPares}>
          {me.pares ? 'Tengo pares' : 'No tengo pares'}
        </Button>
      ) : null}

      {phase === 'declararJuego' ? (
        <Button onClick={onDeclararJuego}>
          {me.juego.tiene ? `Tengo juego (${me.juego.suma})` : 'No tengo juego'}
        </Button>
      ) : null}

      {phase === 'lance' && bet === null ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={onPaso} variant="ghost" className="flex-1">
              Paso
            </Button>
            {can('envidar') ? (
              <Button onClick={onEnvidar} className="flex-1">
                Envido
              </Button>
            ) : null}
          </div>
          {can('ordago') ? (
            <Button variant="danger" onClick={onOrdago}>
              Órdago
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === 'lance' && bet !== null ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={() => onQuerer(true)} className="flex-1">
              Quiero
            </Button>
            <Button variant="ghost" onClick={() => onQuerer(false)} className="flex-1">
              No quiero
            </Button>
          </div>
          {can('envidar') || can('ordago') ? (
            <div className="flex gap-2">
              {can('envidar') ? (
                <Button variant="ghost" onClick={onEnvidar} className="flex-1">
                  Subir
                </Button>
              ) : null}
              {can('ordago') ? (
                <Button variant="danger" onClick={onOrdago} className="flex-1">
                  Órdago
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
