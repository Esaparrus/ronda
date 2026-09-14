// Un asiento alrededor de la mesa (P32, contrato §8.6). Dos formas, las dos
// del diseño:
//
// - `top`: columna estrecha (avatar, apodo, garbanzos, datos). Es la de los
//   rivales, que van en el borde de arriba de la mesa.
// - `plate`: chapa ovalada horizontal. Es la tuya, abajo, donde estarías
//   sentado — más ancha porque es la única que lleva la marca «TÚ» y porque
//   la mirada acaba ahí antes de bajar a la mano.
//
// Al contrario que SeatRing de /mesa (que es una TableView y no puede leer
// `me` jamás), este componente sí sabe quién eres: vive en /sala.
'use client';

import type { PublicPlayer } from '@ronda/protocol';
import { Avatar, type SeatColorIndex } from '@/components/ui/Avatar';
import { Garbanzos } from '@/components/ui/Garbanzos';

export interface SeatBeans {
  count: number;
  total?: number;
  label: string;
}

export interface TableSeatProps {
  player: PublicPlayer;
  variant: 'top' | 'plate';
  isYou?: boolean;
  /** Mus: marca al compañero de pareja (§12.12). */
  isPartner?: boolean;
  isTurn?: boolean;
  /** Fila de garbanzos bajo el apodo, o null si este juego no cuenta nada ahí. */
  beans?: SeatBeans | null;
  /** Línea de datos en mono ("7 · 12", "cantó 2"...). */
  info?: string;
}

/**
 * Ordena la mesa como se ve desde tu silla: tú abajo y los demás arriba, en
 * el orden en que te llega el turno (asiento+1, +2, +3...).
 *
 * En Mus esto coloca al compañero (asiento+2, §12.12) justo en el centro de
 * la fila de arriba, enfrente de ti, sin que este componente sepa nada de
 * parejas: es la misma geometría de la mesa real.
 */
export function orderAroundMe(
  players: PublicPlayer[],
  myPlayerId: string,
): { top: PublicPlayer[]; me: PublicPlayer | null } {
  const bySeat = [...players].sort((a, b) => a.seat - b.seat);
  const myIndex = bySeat.findIndex((p) => p.playerId === myPlayerId);
  if (myIndex === -1) return { top: bySeat, me: null };
  const rotated = [...bySeat.slice(myIndex + 1), ...bySeat.slice(0, myIndex)];
  return { top: rotated, me: bySeat[myIndex] ?? null };
}

export function TableSeat({
  player,
  variant,
  isYou = false,
  isPartner = false,
  isTurn = false,
  beans = null,
  info,
}: TableSeatProps) {
  const colorIndex = (player.colorIndex % 6) as SeatColorIndex;
  // El asiento en turno se marca con aro de hueso y no de latón: el latón ya
  // es el borde de TODOS los avatares, así que como señal de turno no diría
  // nada. El hueso es el valor más claro de la paleta y se despega solo.
  const ring = isTurn ? 'border-hueso' : 'border-oro';
  const dimmed = player.connected ? '' : 'opacity-40';

  if (variant === 'plate') {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border-2 py-[5px] pl-[6px] pr-3 ${
          isYou ? 'border-oro bg-mesa' : 'border-linea bg-mesa'
        }`}
      >
        <Avatar
          name={player.nick}
          colorIndex={colorIndex}
          size={32}
          className={`border-2 ${ring} ${dimmed}`}
        />
        <div className="flex flex-col gap-[2px]">
          <span className="whitespace-nowrap text-12 text-hueso">{player.nick}</span>
          {beans ? <Garbanzos count={beans.count} total={beans.total} label={beans.label} /> : null}
        </div>
        {info ? <span className="font-mono text-12 text-humo">{info}</span> : null}
        {isYou ? (
          <span className="inline-flex items-center rounded-full bg-oro px-2 py-[3px] font-mono text-12 font-semibold leading-none tracking-wider text-tinta">
            TÚ
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-[72px] flex-col items-center gap-[2px]">
      {isPartner ? (
        <span className="font-mono text-12 uppercase leading-none tracking-wider text-oro">
          Compañero
        </span>
      ) : null}
      <Avatar
        name={player.nick}
        colorIndex={colorIndex}
        size={36}
        className={`border-2 ${ring} ${dimmed}`}
      />
      <span className="max-w-full truncate text-12 text-hueso">{player.nick}</span>
      {beans ? <Garbanzos count={beans.count} total={beans.total} label={beans.label} /> : null}
      {info ? (
        <span className="max-w-full truncate font-mono text-12 text-humo">{info}</span>
      ) : null}
    </div>
  );
}
