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
import type { CardId, MusPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { MusScoreboard } from './MusScoreboard';
import { MusHand } from './MusHand';
import { MusActionBar, LANCE_LABEL } from './MusActionBar';
import { MusEnvitePicker } from './MusEnvitePicker';
import { TableHeader } from './TableHeader';
import { TableSeat, orderAroundMe } from './TableSeat';
import { BarTable } from '@/components/ui/BarTable';
import { formatMusAmount } from '@/lib/mus';

/** §12.3: 8 amarrakos = 1 juego. Mismo puñado que los huecos de Chinchón. */
const AMARRAKOS_POR_JUEGO = 8;

export interface MusGameScreenProps {
  view: MusPlayerView;
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
  const [envidando, setEnvidando] = useState(false);

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
    setEnvidando(false);
    void useRondaStore.getState().sendAction({ type: 'envidar', piedras });
  }

  const { top, me: mySeat } = orderAroundMe(view.players, me.playerId);

  // Los garbanzos de un asiento son los amarrakos de SU pareja: en Mus no
  // existe puntuación individual (§12.12), así que los dos compañeros
  // enseñan la misma fila. Es correcto y además es informativo: ves de un
  // vistazo qué mitad de la mesa va ganando.
  function beansFor(teamIndex: 0 | 1 | null) {
    if (teamIndex === null) return null;
    const team = view.teams.find((t) => t.index === teamIndex);
    if (!team) return null;
    return {
      count: team.amarrakos,
      total: AMARRAKOS_POR_JUEGO,
      label: `Amarrakos de la pareja ${teamIndex === 0 ? 'A' : 'B'}`,
    };
  }

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
    // `flex-1` y no `min-h-dvh`: el contenedor de SalaClient ya ocupa la
    // pantalla entera y encima lleva la banda de conexión y las reacciones.
    // Pedir aquí otra pantalla completa empujaría la barra de acción fuera
    // del móvil, y en Mus la barra de acción ES el juego.
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <MusScoreboard
        teams={view.teams}
        myTeamIndex={me.teamIndex}
        juegosParaGanar={view.config.juegos}
      />

      <TableHeader left={`Mano ${view.round}`} turnNick={turnPlayer?.nick ?? null} />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] px-1 py-2">
        <div className="flex min-h-[60px] items-end justify-center gap-2">
          {top.map((p) => (
            <TableSeat
              key={p.playerId}
              player={p}
              variant="top"
              isPartner={p.teamIndex === me.teamIndex}
              isTurn={p.playerId === view.turnPlayerId}
              beans={beansFor(p.teamIndex)}
              info={seatInfo(p.seat, p.teamIndex)}
            />
          ))}
        </div>

        <BarTable>
          <section className="flex flex-col items-center justify-center gap-2 px-6 text-center">
            {view.phase === 'reparto' ? (
              <>
                <p className="font-display text-28 leading-display text-hueso">Reparto</p>
                {postreNick ? <p className="text-14 text-oro">Reparte {postreNick}</p> : null}
              </>
            ) : null}
            {view.phase === 'mus' ? (
              <p className="font-display text-28 leading-display text-hueso">Mus</p>
            ) : null}
            {view.phase === 'descarte' ? (
              <p className="font-display text-28 leading-display text-hueso">Descarte</p>
            ) : null}
            {view.phase === 'declararPares' ? (
              <p className="font-display text-28 leading-display text-hueso">¿Pares?</p>
            ) : null}
            {view.phase === 'declararJuego' ? (
              <p className="font-display text-28 leading-display text-hueso">¿Juego?</p>
            ) : null}
            {view.phase === 'lance' && view.lance ? (
              <>
                <p className="font-display text-28 leading-display text-hueso">
                  {LANCE_LABEL[view.lance]}
                </p>
                {/* Sobre el tapete verde el envite va en latón y no en brasa:
                 * el rojo apagado de la acción no despega del verde. */}
                {view.bet ? (
                  <p className="text-16 text-oro">
                    {view.bet.isOrdago
                      ? '¡Órdago!'
                      : `${formatMusAmount(view.bet.piedras)} · pareja ${
                          view.bet.byTeam === 0 ? 'A' : 'B'
                        }`}
                  </p>
                ) : null}
              </>
            ) : null}
            {manoNick ? <p className="text-14 text-hueso">Es mano {manoNick}</p> : null}
          </section>
        </BarTable>

        <div className="flex min-h-[46px] items-start justify-center">
          {mySeat ? (
            <TableSeat
              player={mySeat}
              variant="plate"
              isYou
              isTurn={isMyTurn}
              beans={beansFor(me.teamIndex)}
              info={seatInfo(mySeat.seat, mySeat.teamIndex)}
            />
          ) : null}
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
          onEnvidar={() => setEnvidando(true)}
          onOrdago={() => void useRondaStore.getState().sendAction({ type: 'ordago' })}
          onQuerer={(quiere) =>
            void useRondaStore.getState().sendAction({ type: quiere ? 'querer' : 'noQuerer' })
          }
        />
      </div>

      <MusEnvitePicker
        open={envidando && me.minEnvite !== null}
        minEnvite={me.minEnvite ?? 2}
        currentBet={view.bet?.piedras ?? null}
        onConfirm={handleEnvidar}
        onCancel={() => setEnvidando(false)}
      />
    </div>
  );
}
