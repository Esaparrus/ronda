// Pantalla de partida de Mus. Mismo esqueleto vertical que GameScreen.tsx
// (Chinchón) y PochaGameScreen.tsx: marcador arriba, la mesa, mano y barra de
// acción abajo.
//
// Lo que cambia respecto a los otros dos: el marcador es de la PAREJA
// (§12.12), encima del tapete no hay cartas jugadas -- en Mus no se juegan
// cartas, se habla -- y lo que se enseña ahí es en qué lance vais y qué se ha
// declarado.
//
// P32 sienta a los cuatro alrededor de la mesa, y es donde más se nota: Mus
// es siempre de cuatro, así que `orderAroundMe` deja al compañero (asiento+2)
// justo en el centro de la fila de arriba, enfrente de ti, que es donde está
// sentado de verdad. Los garbanzos de los cuatro asientos son los amarrakos
// de SU pareja, no suyos: en Mus no existe la puntuación individual.
'use client';

import { useEffect, useState } from 'react';
import type { CardId, MusPlayerView, PublicPlayer } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { MusScoreboard } from './MusScoreboard';
import { MusHand } from './MusHand';
import { MusActionBar, LANCE_LABEL } from './MusActionBar';
import { orderAroundMe } from './TableSeat';
import { BarTable } from '@/components/ui/BarTable';
import { Avatar, type SeatColorIndex } from '@/components/ui/Avatar';
import { formatMusAmount } from '@/lib/mus';

export interface MusGameScreenProps {
  view: MusPlayerView;
}

type OpponentPosition = 'left' | 'opposite' | 'right';

const OPPONENT_POSITION_CLASS: Record<OpponentPosition, string> = {
  left: 'col-start-1 row-start-2 justify-self-start',
  opposite: 'col-start-2 row-start-1 self-end justify-self-center',
  right: 'col-start-3 row-start-2 justify-self-end',
};

interface MusOpponentSeatProps {
  player: PublicPlayer;
  position: OpponentPosition;
  info: string;
  isPartner: boolean;
  isTurn: boolean;
}

function MusOpponentSeat({ player, position, info, isPartner, isTurn }: MusOpponentSeatProps) {
  const isSide = position !== 'opposite';

  return (
    <div
      data-mus-seat={position}
      role="group"
      aria-label={`${player.nick}, ${info}`}
      className={`z-10 flex min-w-0 border ${OPPONENT_POSITION_CLASS[position]} ${
        isSide
          ? 'w-[58px] self-center flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center'
          : 'w-full max-w-[140px] items-center gap-1.5 rounded-full px-2 py-1'
      } ${
        isTurn
          ? 'border-hueso bg-madera-clara'
          : isPartner
            ? 'border-oro/70 bg-mesa/90'
            : 'border-linea bg-mesa/80'
      }`}
    >
      <Avatar
        name={player.nick}
        colorIndex={(player.colorIndex % 6) as SeatColorIndex}
        size={isSide ? 30 : 28}
        className={player.connected ? '' : 'opacity-40'}
      />
      <div className="min-w-0 max-w-full">
        <p
          className={`truncate font-medium leading-tight text-hueso ${isSide ? 'text-[10px]' : 'text-[11px]'}`}
        >
          {player.nick}
        </p>
        <p className="truncate font-mono text-[9px] leading-tight text-humo">{info}</p>
      </div>
    </div>
  );
}

export function MusGameScreen({ view }: MusGameScreenProps) {
  const { me } = view;
  const isMyTurn = view.turnPlayerId === me.playerId;
  const turnPlayer = view.turnPlayerId
    ? (view.players.find((p) => p.playerId === view.turnPlayerId) ?? null)
    : null;
  const manoNick = view.players.find((p) => p.seat === view.manoSeat)?.nick ?? null;
  const postreNick = view.players.find((p) => p.seat === view.postreSeat)?.nick ?? null;

  const [selected, setSelected] = useState<CardId[]>([]);

  // El descarte marcado solo tiene sentido dentro de la fase de descarte: al
  // salir de ella (propia o ajena) se limpia, para que la mano nueva no
  // aparezca con cartas marcadas de la anterior.
  useEffect(() => {
    if (view.phase !== 'descarte') setSelected([]);
  }, [view.phase]);

  function toggleCard(cardId: CardId) {
    setSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }

  function handleMus(quiere: boolean) {
    void useRondaStore.getState().sendAction({ type: quiere ? 'mus' : 'noMus' });
  }

  function handleDescartar() {
    if (selected.length === 0) return;
    void useRondaStore.getState().sendAction({ type: 'descartar', cardIds: selected });
    setSelected([]);
  }

  function handleDeclararPares() {
    void useRondaStore.getState().sendAction({ type: 'declararPares', tiene: me.pares !== null });
  }

  function handleDeclararJuego() {
    void useRondaStore.getState().sendAction({ type: 'declararJuego', tiene: me.juego.tiene });
  }

  function handleEnvidar(piedras: number) {
    void useRondaStore.getState().sendAction({ type: 'envidar', piedras });
  }

  const { top: opponents } = orderAroundMe(view.players, me.playerId);
  const [leftPlayer, oppositePlayer, rightPlayer] = opponents;

  // Línea de datos del asiento: su pareja y lo que ha dicho en esta mano.
  // Es la misma información que llevaba `renderInfo` de <PlayerStrip> antes
  // de P32, recortada a lo que cabe bajo un avatar de 72px.
  function seatInfo(seat: number, teamIndex: 0 | 1 | null): string {
    const pareja = teamIndex === null ? '—' : teamIndex === 0 ? 'A' : 'B';
    const marks: string[] = [];
    if (seat === view.manoSeat) marks.push('mano');
    if (seat === view.postreSeat) marks.push('postre');
    if (view.phase === 'mus' && view.musSaid[seat] === true) marks.push('mus');
    if (view.phase === 'mus' && view.musSaid[seat] === false) marks.push('corta');
    if (view.paresDeclared[seat] === true) marks.push('pares');
    if (view.juegoDeclared[seat] === true) marks.push('juego');
    return `${pareja}${marks.length > 0 ? ` · ${marks.join(' ')}` : ''}`;
  }

  return (
    <div className="game-shell mus-game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <MusScoreboard
        teams={view.teams}
        myTeamIndex={me.teamIndex}
        juegosParaGanar={view.config.juegos}
      />

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-linea bg-mesa/80 px-3 py-1.5">
        <span className="font-mono text-11 uppercase tracking-wider text-humo">
          Mano {view.round}
        </span>
        <span className="min-w-0 truncate font-mono text-11 uppercase tracking-wider text-oro">
          {isMyTurn ? 'Tu turno' : turnPlayer ? `Turno · ${turnPlayer.nick}` : 'En juego'}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 px-2 py-1.5">
        <div className="mus-table-stage flex min-h-0 flex-1 items-center justify-center">
          <div className="mus-table-layout">
            {leftPlayer ? (
              <MusOpponentSeat
                player={leftPlayer}
                position="left"
                info={seatInfo(leftPlayer.seat, leftPlayer.teamIndex)}
                isPartner={leftPlayer.teamIndex === me.teamIndex}
                isTurn={leftPlayer.playerId === view.turnPlayerId}
              />
            ) : null}
            {oppositePlayer ? (
              <MusOpponentSeat
                player={oppositePlayer}
                position="opposite"
                info={seatInfo(oppositePlayer.seat, oppositePlayer.teamIndex)}
                isPartner={oppositePlayer.teamIndex === me.teamIndex}
                isTurn={oppositePlayer.playerId === view.turnPlayerId}
              />
            ) : null}
            {rightPlayer ? (
              <MusOpponentSeat
                player={rightPlayer}
                position="right"
                info={seatInfo(rightPlayer.seat, rightPlayer.teamIndex)}
                isPartner={rightPlayer.teamIndex === me.teamIndex}
                isTurn={rightPlayer.playerId === view.turnPlayerId}
              />
            ) : null}

            <BarTable className="mus-table-frame col-start-2 row-start-2 !max-w-none self-center justify-self-center">
              <section className="flex flex-col items-center justify-center gap-1 px-4 text-center">
                {view.phase === 'reparto' ? (
                  <>
                    <p className="font-display text-24 leading-display text-hueso">Reparto</p>
                    {postreNick ? <p className="text-12 text-oro">Reparte {postreNick}</p> : null}
                  </>
                ) : null}
                {view.phase === 'mus' ? (
                  <p className="font-display text-24 leading-display text-hueso">Mus</p>
                ) : null}
                {view.phase === 'descarte' ? (
                  <p className="font-display text-24 leading-display text-hueso">Descarte</p>
                ) : null}
                {view.phase === 'declararPares' ? (
                  <p className="font-display text-24 leading-display text-hueso">¿Pares?</p>
                ) : null}
                {view.phase === 'declararJuego' ? (
                  <p className="font-display text-24 leading-display text-hueso">¿Juego?</p>
                ) : null}
                {view.phase === 'lance' && view.lance ? (
                  <>
                    <p className="font-display text-24 leading-display text-hueso">
                      {LANCE_LABEL[view.lance]}
                    </p>
                    {view.bet ? (
                      <p className="text-12 font-semibold text-oro">
                        {view.bet.isOrdago
                          ? '¡Órdago!'
                          : `${formatMusAmount(view.bet.piedras)} · pareja ${
                              view.bet.byTeam === 0 ? 'A' : 'B'
                            }`}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {manoNick ? <p className="text-11 text-hueso/90">Mano · {manoNick}</p> : null}
              </section>
            </BarTable>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col">
        <MusHand
          hand={me.hand}
          selectable={isMyTurn && view.phase === 'descarte'}
          selected={selected}
          onToggle={toggleCard}
          pares={me.pares}
          juego={me.juego}
        />

        <MusActionBar
          phase={view.phase}
          modo={view.config.modo}
          lance={view.lance}
          isMyTurn={isMyTurn}
          me={me}
          selectedCount={selected.length}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
          bet={view.bet}
          onRepartir={() => void useRondaStore.getState().sendAction({ type: 'repartir' })}
          onMus={handleMus}
          onDescartar={handleDescartar}
          onDeclararPares={handleDeclararPares}
          onDeclararJuego={handleDeclararJuego}
          onPaso={() => void useRondaStore.getState().sendAction({ type: 'paso' })}
          onEnvidar={handleEnvidar}
          onOrdago={() => void useRondaStore.getState().sendAction({ type: 'ordago' })}
          onQuerer={(quiere) =>
            void useRondaStore.getState().sendAction({ type: quiere ? 'querer' : 'noQuerer' })
          }
        />
      </div>
    </div>
  );
}
