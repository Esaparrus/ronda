// Pantalla de partida de Mus. Mismo esqueleto vertical que GameScreen.tsx
// (Chinchón) y PochaGameScreen.tsx: marcador arriba, la mesa, mano y barra de
// acción abajo.
//
// Lo que cambia respecto a los otros dos: el marcador es de la PAREJA
// (§12.12), encima del tapete no hay cartas jugadas -- en Mus no se juegan
// cartas, se habla -- y lo que se enseña ahí es en qué lance vais y qué se ha
// calculado. En móvil los otros tres jugadores se presentan en una fila
// estable: conserva quién es pareja y quién rival sin competir con la mano ni
// con los controles del envite por el mismo espacio vertical.
//
// Mus es siempre de cuatro, así que `orderAroundMe` deja al compañero en el
// centro de la fila, entre los dos rivales. Los garbanzos pertenecen a la
// pareja, no al jugador: en Mus no existe la puntuación individual.
'use client';

import { useEffect, useState } from 'react';
import type { CardId, MusPartnerSignal, MusPlayerView, PublicPlayer } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { MusScoreboard } from './MusScoreboard';
import { MusHand } from './MusHand';
import { MusActionBar, LANCE_LABEL } from './MusActionBar';
import { orderAroundMe } from './TableSeat';
import { Avatar, type SeatColorIndex } from '@/components/ui/Avatar';

export interface MusGameScreenProps {
  view: MusPlayerView;
}

interface MusOpponentSeatProps {
  player: PublicPlayer;
  info: string;
  isPartner: boolean;
  isTurn: boolean;
}

function MusOpponentSeat({ player, info, isPartner, isTurn }: MusOpponentSeatProps) {
  return (
    <div
      role="group"
      aria-label={`${player.nick}, ${info}`}
      className={`relative flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1.5 text-center ${
        isTurn
          ? 'border-oro bg-madera-clara shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-oro)_45%,transparent)]'
          : isPartner
            ? 'border-oro/70 bg-mesa/90'
            : 'border-linea bg-mesa/80'
      }`}
    >
      <Avatar
        name={player.nick}
        colorIndex={(player.colorIndex % 6) as SeatColorIndex}
        size={28}
        className={player.connected ? '' : 'opacity-40'}
      />
      <div className="min-w-0 max-w-full">
        <p className="truncate text-[10px] font-semibold leading-tight text-hueso">{player.nick}</p>
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
  const isPairConsulting =
    view.config.modo === 'online' &&
    view.phase === 'mus' &&
    view.musConsultingTeam === me.teamIndex;
  const turnStatus = isPairConsulting
    ? 'Decidís en pareja'
    : view.config.modo === 'online' && view.phase === 'mus' && view.musConsultingTeam !== null
      ? 'Decide la pareja rival'
      : isMyTurn
        ? 'Tu turno'
        : turnPlayer
          ? `Turno · ${turnPlayer.nick}`
          : 'En juego';
  const phaseLabel =
    view.phase === 'lance' && view.lance
      ? LANCE_LABEL[view.lance]
      : view.phase === 'reparto'
        ? 'Reparto'
        : view.phase === 'mus'
          ? 'Mus'
          : view.phase === 'descarte'
            ? 'Descarte'
            : 'Recuento';

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

  function handleMusSignal(signal: MusPartnerSignal) {
    void useRondaStore.getState().sendAction({ type: 'musSignal', signal });
  }

  function handleDescartar() {
    if (selected.length === 0) return;
    void useRondaStore.getState().sendAction({ type: 'descartar', cardIds: selected });
    setSelected([]);
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
    const relation = teamIndex === me.teamIndex ? 'Tu pareja' : 'Rival';
    const marks: string[] = [];
    if (seat === view.manoSeat) marks.push('mano');
    if (seat === view.postreSeat) marks.push('postre');
    if (view.phase === 'mus' && view.musSaid[seat] === true) marks.push('mus');
    if (view.phase === 'mus' && view.musSaid[seat] === false) marks.push('corta');
    if (view.paresDeclared[seat] === true) marks.push('pares');
    if (view.juegoDeclared[seat] === true) marks.push('juego');
    return `${relation}${marks.length > 0 ? ` · ${marks.join(' ')}` : ''}`;
  }

  return (
    <div className="game-shell mus-game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <MusScoreboard
        teams={view.teams}
        myTeamIndex={me.teamIndex}
        juegosParaGanar={view.config.juegos}
      />

      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-y border-linea bg-mesa/80 px-3 py-1.5">
        <span className="font-mono text-10 uppercase tracking-wider text-humo">
          Mano {view.round}
        </span>
        <span className="font-display text-16 font-semibold text-hueso">{phaseLabel}</span>
        <span className="min-w-0 justify-self-end truncate text-10 font-semibold uppercase tracking-wider text-oro">
          {turnStatus}
        </span>
      </div>

      <div
        role="group"
        className="grid shrink-0 grid-cols-3 gap-1.5 px-3 py-2"
        aria-label="Jugadores de la mesa"
      >
        {leftPlayer ? (
          <MusOpponentSeat
            player={leftPlayer}
            info={seatInfo(leftPlayer.seat, leftPlayer.teamIndex)}
            isPartner={leftPlayer.teamIndex === me.teamIndex}
            isTurn={leftPlayer.playerId === view.turnPlayerId}
          />
        ) : null}
        {oppositePlayer ? (
          <MusOpponentSeat
            player={oppositePlayer}
            info={seatInfo(oppositePlayer.seat, oppositePlayer.teamIndex)}
            isPartner={oppositePlayer.teamIndex === me.teamIndex}
            isTurn={oppositePlayer.playerId === view.turnPlayerId}
          />
        ) : null}
        {rightPlayer ? (
          <MusOpponentSeat
            player={rightPlayer}
            info={seatInfo(rightPlayer.seat, rightPlayer.teamIndex)}
            isPartner={rightPlayer.teamIndex === me.teamIndex}
            isTurn={rightPlayer.playerId === view.turnPlayerId}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col">
        <MusHand
          hand={me.hand}
          selectable={isMyTurn && view.phase === 'descarte'}
          selected={selected}
          onToggle={toggleCard}
          pares={me.pares}
          juego={me.juego}
          ochoReyes={view.config.ochoReyes}
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
          musConsultingTeam={view.musConsultingTeam}
          onRepartir={() => void useRondaStore.getState().sendAction({ type: 'repartir' })}
          onMus={handleMus}
          onMusSignal={handleMusSignal}
          onDescartar={handleDescartar}
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
