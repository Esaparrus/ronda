// Pantalla de partida de Mus. Mismo esqueleto vertical que GameScreen.tsx
// (Chinchón) y PochaGameScreen.tsx: marcador arriba, fila de jugadores, zona
// común, mano y barra de acción abajo.
//
// Lo que cambia respecto a los otros dos: el marcador es de la PAREJA
// (§12.12), en la zona común no hay cartas jugadas -- en Mus no se juegan
// cartas, se habla -- y lo que se enseña ahí es en qué lance vais y qué se ha
// declarado.
'use client';

import { useEffect, useState } from 'react';
import type { CardId, MusPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { MusScoreboard } from './MusScoreboard';
import { MusHand } from './MusHand';
import { MusActionBar, LANCE_LABEL } from './MusActionBar';
import { MusEnvitePicker } from './MusEnvitePicker';

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

  return (
    // `flex-1` y no `min-h-dvh`: el contenedor de SalaClient ya ocupa la
    // pantalla entera y encima lleva la banda de conexión y las reacciones.
    // Pedir aquí otra pantalla completa empujaría la barra de acción fuera
    // del móvil, y en Mus la barra de acción ES el juego.
    <div className="flex flex-1 flex-col">
      <MusScoreboard
        teams={view.teams}
        myTeamIndex={me.teamIndex}
        juegosParaGanar={view.config.juegos}
      />

      <PlayerStrip
        players={view.players}
        turnPlayerId={view.turnPlayerId}
        myPlayerId={me.playerId}
        renderInfo={(p) => {
          const pareja = p.teamIndex === 0 ? 'A' : 'B';
          const marks: string[] = [];
          if (p.seat === view.manoSeat) marks.push('mano');
          if (view.phase === 'mus' && view.musSaid[p.seat] === true) marks.push('mus');
          if (view.phase === 'mus' && view.musSaid[p.seat] === false) marks.push('corta');
          if (view.paresDeclared[p.seat] === true) marks.push('pares');
          if (view.juegoDeclared[p.seat] === true) marks.push('juego');
          return `${pareja}${marks.length > 0 ? ` · ${marks.join(' ')}` : ''}`;
        }}
      />

      <section className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
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
            {view.bet ? (
              <p className="text-16 text-brasa">
                {view.bet.isOrdago
                  ? '¡Órdago!'
                  : `${view.bet.piedras} piedras envidadas por la pareja ${
                      view.bet.byTeam === 0 ? 'A' : 'B'
                    }`}
              </p>
            ) : null}
          </>
        ) : null}
        <p className="text-14 text-humo">
          Mano {view.round}
          {manoNick ? ` · es mano ${manoNick}` : ''}
        </p>
      </section>

      <div className="mt-auto flex flex-col">
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
          lance={view.lance}
          isMyTurn={isMyTurn}
          me={me}
          selectedCount={selected.length}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
          bet={view.bet}
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
        onConfirm={handleEnvidar}
        onCancel={() => setEnvidando(false)}
      />
    </div>
  );
}
