import type { GranRondaTableView } from '@ronda/protocol';
import { GranRondaBoard } from '@/components/granronda/GranRondaBoard';
import { Pill } from '@/components/ui/Pill';
import { ClassicMesaGameBoard } from './ClassicMesaGameBoard';
import { MesaGameBoard } from './MesaGameBoard';
import { MusicalMesaGameBoard } from './MusicalMesaGameBoard';
import { PartyMesaGameBoard } from './PartyMesaGameBoard';
import { PochaMesaGameBoard } from './PochaMesaGameBoard';
import { PrecioJustoMesaGameBoard } from './PrecioJustoMesaGameBoard';
import { RoadmapMesaGameBoard } from './RoadmapMesaGameBoard';
import { RondaMesaScreen } from './RondaMesaScreen';

function embeddedGameLabel(gameId: GranRondaTableView['miniGame']['gameId']): string {
  switch (gameId) {
    case 'musical':
      return 'Musical';
    case 'chinchon':
      return 'Chinchón';
    case 'pocha':
      return 'Pocha';
    case 'laronda':
      return 'La Ronda';
    case 'preciojusto':
      return 'Precio justo';
    case 'banderas':
      return 'Banderas';
    case 'cifras':
      return 'Cifras';
    case 'quienloharia':
      return 'Quién lo haría';
    case 'completalafrase':
      return 'Completa la frase';
    case 'brisca':
      return 'Brisca';
    case 'escoba':
      return 'Escoba';
    case 'tute':
      return 'Tute';
    case 'sieteymedia':
      return 'Siete y media';
    case 'cinquillo':
      return 'Cinquillo';
    case 'orden':
      return 'Orden';
    case 'colores':
      return 'Colores';
    case 'mayoria':
      return 'Mayoría';
    case 'escala':
      return 'Escala';
    case 'matiz':
      return 'Matiz';
    default:
      return 'Minijuego';
  }
}

function formatOroAmount(value: number): string {
  return `${value} ${Math.abs(value) === 1 ? 'Oro' : 'Oros'}`;
}

function formatOroDelta(value: number): string {
  const delta = value > 0 ? `+${value}` : value < 0 ? String(value) : '±0';
  return `${delta} ${Math.abs(value) === 1 ? 'Oro' : 'Oros'}`;
}

function miniGameIcon(gameId: GranRondaTableView['miniGame']['gameId']): string {
  if (gameId === 'musical') return '♫';
  if (gameId === 'chinchon') return '♧';
  if (gameId === 'pocha') return '♠';
  if (gameId === 'laronda') return '🍽';
  if (gameId === 'preciojusto') return '€';
  if (gameId === 'banderas') return '⚑';
  if (gameId === 'cifras') return '#';
  if (gameId === 'quienloharia') return '☻';
  if (gameId === 'completalafrase') return '…';
  if (gameId === 'sieteymedia') return '7½';
  if (gameId === 'cinquillo') return '♣';
  return '✦';
}

export function GranRondaMesaGameBoard({ view }: { view: GranRondaTableView }) {
  const final = view.status === 'gameEnd';
  const showEmbeddedGame = view.phase === 'minigameInput' && view.miniGame.embeddedGame !== null;
  const standings = [...view.players].sort((left, right) => {
    const leftBoard = view.boardPlayers.find((player) => player.playerId === left.playerId);
    const rightBoard = view.boardPlayers.find((player) => player.playerId === right.playerId);
    return (
      (rightBoard?.seals ?? 0) - (leftBoard?.seals ?? 0) ||
      (rightBoard?.coins ?? 0) - (leftBoard?.coins ?? 0)
    );
  });
  const turnNick = view.players.find((player) => player.playerId === view.turnPlayerId)?.nick;
  const phaseLabel =
    view.phase === 'routeChoice'
      ? 'Eligiendo camino'
      : view.phase === 'moving'
        ? 'Ficha en movimiento'
        : view.phase === 'resolving'
          ? 'Resolviendo casilla'
          : view.phase === 'minigameInput'
            ? 'Juego de la ronda'
            : view.phase === 'minigameReveal'
              ? 'Resultados del juego'
              : view.phase === 'roundEnd'
                ? 'Ronda completada'
                : turnNick
                  ? `Turno de ${turnNick}`
                  : 'Mapa listo';

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-6 px-5 py-6 xl:px-14 xl:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Mapa público · La Gran Ronda</p>
          <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] leading-display text-hueso">
            La Gran Ronda
          </h1>
        </div>
        <div className="text-right text-18 text-humo">
          <p>Ronda {view.round}</p>
          <p>{final ? 'Resultado final' : phaseLabel}</p>
        </div>
      </header>

      <div
        className={`gran-ronda-map-shell gran-ronda-map-shell--table mx-auto ${showEmbeddedGame ? 'gran-ronda-map-shell--minigame' : ''}`}
      >
        <GranRondaBoard
          board={view.board}
          boardPlayers={view.boardPlayers}
          players={view.players}
          stampSpaceId={view.stampSpaceId}
          stampCost={view.stampCost}
          stampValue={view.stampValue}
          trapSpaceIds={view.trapSpaceIds}
          routeOptions={view.routeOptions}
          activePlayerId={view.turnPlayerId}
          movement={view.movement}
          resolution={view.resolution}
          compact
          closeZoom={1.55}
          minimized={showEmbeddedGame}
        />
      </div>

      {view.lastInteraction ? (
        <section className="mx-auto flex w-full max-w-3xl items-center gap-4 rounded-[24px] border border-violeta/40 bg-violeta/10 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-violeta/20 text-28">
            {view.lastInteraction.kind === 'duel' ? '⚔️' : '🧤'}
          </span>
          <div>
            <p className="eyebrow text-violeta">
              {view.lastInteraction.kind === 'duel' ? 'Reto resuelto' : 'Robo resuelto'}
            </p>
            <h2 className="mt-1 text-22 font-semibold text-hueso">{interactionText(view)}</h2>
          </div>
        </section>
      ) : null}

      {view.phase === 'minigameInput' && view.miniGame.embeddedGame ? (
        <section className="gran-ronda-embedded-game mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-oro/45 bg-oro/5 shadow-[0_18px_48px_rgba(246,195,76,0.12)]">
          <div className="flex items-center justify-between gap-3 border-b border-oro/20 px-5 py-4">
            <div>
              <p className="eyebrow text-oro">
                {view.duel ? 'Reto de Oros en curso' : 'Minijuego de la ronda'}
              </p>
              <p className="mt-1 text-14 text-humo">
                {view.duel
                  ? `${view.players.find((player) => player.playerId === view.duel?.actorPlayerId)?.nick ?? 'Un jugador'} contra ${view.players.find((player) => player.playerId === view.duel?.targetPlayerId)?.nick ?? 'su rival'} por ${formatOroAmount(view.duel.wager)}.`
                  : 'La mesa muestra la interfaz original del juego seleccionado.'}
              </p>
            </div>
            <Pill>{embeddedGameLabel(view.miniGame.gameId)}</Pill>
          </div>
          <div className="gran-ronda-embedded-game__table-frame">
            {view.miniGame.embeddedGame.gameId === 'chinchon' ? (
              <MesaGameBoard view={view.miniGame.embeddedGame} />
            ) : view.miniGame.embeddedGame.gameId === 'pocha' ? (
              <PochaMesaGameBoard view={view.miniGame.embeddedGame} />
            ) : view.miniGame.embeddedGame.gameId === 'laronda' ? (
              <RondaMesaScreen view={view.miniGame.embeddedGame} />
            ) : view.miniGame.embeddedGame.gameId === 'preciojusto' ? (
              <PrecioJustoMesaGameBoard view={view.miniGame.embeddedGame} />
            ) : view.miniGame.embeddedGame.gameId === 'banderas' ||
              view.miniGame.embeddedGame.gameId === 'cifras' ||
              view.miniGame.embeddedGame.gameId === 'quienloharia' ||
              view.miniGame.embeddedGame.gameId === 'completalafrase' ? (
              <RoadmapMesaGameBoard view={view.miniGame.embeddedGame} />
            ) : view.miniGame.embeddedGame.gameId === 'musical' ? (
              <MusicalMesaGameBoard view={view.miniGame.embeddedGame} embedded />
            ) : view.miniGame.embeddedGame.gameId === 'brisca' ||
              view.miniGame.embeddedGame.gameId === 'escoba' ||
              view.miniGame.embeddedGame.gameId === 'sieteymedia' ||
              view.miniGame.embeddedGame.gameId === 'tute' ||
              view.miniGame.embeddedGame.gameId === 'cinquillo' ? (
              <ClassicMesaGameBoard view={view.miniGame.embeddedGame} embedded />
            ) : view.miniGame.embeddedGame.gameId === 'orden' ||
              view.miniGame.embeddedGame.gameId === 'colores' ||
              view.miniGame.embeddedGame.gameId === 'mayoria' ||
              view.miniGame.embeddedGame.gameId === 'escala' ||
              view.miniGame.embeddedGame.gameId === 'matiz' ? (
              <PartyMesaGameBoard view={view.miniGame.embeddedGame} />
            ) : null}
          </div>
        </section>
      ) : view.phase === 'minigameInput' || view.phase === 'minigameReveal' ? (
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[24px] border border-oro/40 bg-oro/5 p-5 shadow-[0_14px_40px_rgba(246,195,76,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-oro">Ruleta de minijuegos</p>
              <h2 className="mt-1 text-26 font-semibold text-hueso">{view.miniGame.title}</h2>
              <p className="mt-1 text-15 text-humo">{view.miniGame.prompt}</p>
              <p className="mt-2 text-13 text-humo">{view.miniGame.instructions}</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-oro/15 font-display text-24 text-oro">
              {miniGameIcon(view.miniGame.gameId)}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {view.miniGame.options.map((option) => {
              return (
                <div
                  key={option.id}
                  className="rounded-2xl border border-linea bg-tinta/30 px-4 py-3 text-15 font-semibold text-hueso"
                >
                  <span className="mr-2 font-mono text-11 text-humo">
                    {option.id.toUpperCase()}
                  </span>
                  {option.label}
                </div>
              );
            })}
          </div>
          {view.phase === 'minigameReveal' ? (
            <div className="grid gap-1.5 rounded-2xl border border-linea bg-tinta/35 p-3 sm:grid-cols-2">
              {view.players
                .filter(
                  (player) =>
                    !view.duel ||
                    player.playerId === view.duel.actorPlayerId ||
                    player.playerId === view.duel.targetPlayerId,
                )
                .map((player) => {
                  const result = view.miniGame.results?.[player.playerId];
                  const delta = result?.reward ?? view.miniGame.scoreDeltas?.[player.playerId] ?? 0;
                  return (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between gap-2 text-13"
                    >
                      <span className="truncate text-hueso">
                        {result ? `${result.rank}. ` : ''}
                        {player.nick}
                        {result?.outcome === 'bust' ? (
                          <span className="ml-1 text-brasa">· Se pasó</span>
                        ) : null}
                      </span>
                      <strong className={delta > 0 ? 'font-mono text-oro' : 'font-mono text-humo'}>
                        {result?.score ?? '—'} · {formatOroDelta(delta)}
                      </strong>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-13 text-humo">
              Juega desde tu móvil · {view.miniGame.completedPlayerIds.length}/{view.players.length}{' '}
              terminados.
            </p>
          )}
        </section>
      ) : null}

      {!final && view.phase === 'routeChoice' ? (
        <section className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3 rounded-[24px] border border-oro/35 bg-oro/10 p-5 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-oro font-display text-24 text-tinta">
            ?
          </span>
          <div>
            <p className="eyebrow text-oro">Camino abierto</p>
            <h2 className="text-24 font-semibold text-hueso">
              {turnNick ?? 'La persona activa'} elige una casilla iluminada
            </h2>
            <p className="mt-1 text-14 text-humo">
              Dado: {view.movement?.roll ?? '—'} · El móvil elige la casilla exacta de llegada.
            </p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'moving' ? (
        <section className="mx-auto flex w-full max-w-3xl items-center justify-center gap-4 rounded-[24px] border border-azul/35 bg-azul/10 p-5 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-hueso font-display text-32 text-tinta shadow-lg">
            {view.movement?.roll ?? '—'}
          </div>
          <div>
            <p className="eyebrow text-azul">Movimiento visible para todos</p>
            <h2 className="text-26 font-semibold text-hueso">
              La ficha de {turnNick ?? 'la persona activa'} avanza
            </h2>
            <p className="mt-1 text-14 text-humo">
              Quedan {view.movement?.remainingSteps ?? 0} casillas.
            </p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'resolving' && view.resolution ? (
        <section className="mx-auto flex w-full max-w-3xl items-center gap-4 rounded-[24px] border border-oro/35 bg-oro/10 p-5">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-oro/20 font-display text-24 text-oro">
            ✦
          </div>
          <div>
            <p className="eyebrow text-oro">
              {view.resolution.kind === 'tienda' && (view.movement?.remainingSteps ?? 0) > 0
                ? `Parada de ${turnNick ?? 'la ficha'} · quedan ${view.movement?.remainingSteps} pasos`
                : `Llegada de ${turnNick ?? 'la ficha'}`}
            </p>
            <h2 className="text-26 font-semibold text-hueso">{view.resolution.title}</h2>
            <p className="mt-1 text-14 text-humo">{view.resolution.message}</p>
          </div>
        </section>
      ) : null}

      {!final && view.phase === 'roundEnd' ? (
        <section className="mx-auto w-full max-w-3xl rounded-[24px] border border-linea bg-mesa p-5 text-center">
          <p className="eyebrow">Ronda completada</p>
          <h2 className="mt-1 text-26 font-semibold text-hueso">Todas las fichas han llegado</h2>
          <p className="mt-1 text-14 text-humo">
            El anfitrión puede comenzar la siguiente ronda desde su móvil.
          </p>
        </section>
      ) : null}

      <section className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 lg:grid-cols-3">
        {standings.map((player) => {
          const boardPlayer = view.boardPlayers.find(
            (candidate) => candidate.playerId === player.playerId,
          );
          return (
            <div
              key={player.playerId}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${player.playerId === view.turnPlayerId ? 'border-oro/60 bg-oro/10' : 'border-linea bg-mesa'}`}
            >
              <span className="gran-ronda-player-token" role="img" aria-label={player.nick}>
                {player.tokenIcon ?? '🎲'}
              </span>
              <span className="min-w-0 flex-1 truncate text-18 text-hueso">{player.nick}</span>
              {player.playerId === view.winnerId ? <Pill>Ganador</Pill> : null}
              {(boardPlayer?.skipTurns ?? 0) > 0 ? (
                <span className="text-15" title="Pierde el próximo turno">
                  🔒
                </span>
              ) : null}
              <span className="font-mono text-18 text-verde">{boardPlayer?.seals ?? 0}✦</span>
              <span className="font-mono text-18 text-oro">{boardPlayer?.coins ?? 0}</span>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function interactionText(view: GranRondaTableView): string {
  const interaction = view.lastInteraction;
  if (!interaction) return '';
  const actor = view.players.find((player) => player.playerId === interaction.actorPlayerId)?.nick;
  const target = view.players.find(
    (player) => player.playerId === interaction.targetPlayerId,
  )?.nick;
  const winner = view.players.find((player) => player.playerId === interaction.winnerId)?.nick;
  if (interaction.kind === 'steal') {
    return `${actor ?? 'Un jugador'} roba ${formatOroAmount(interaction.coinsTransferred)} a ${target ?? 'su rival'}.`;
  }
  if (interaction.gameId) {
    if (!winner) {
      return `${actor ?? 'Un jugador'} y ${target ?? 'su rival'} empatan en ${embeddedGameLabel(interaction.gameId)}; nadie pierde Oros.`;
    }
    return `${actor ?? 'Un jugador'} reta a ${target ?? 'su rival'} en ${embeddedGameLabel(interaction.gameId)}. ${winner} cobra ${formatOroAmount(interaction.coinsTransferred)}.`;
  }
  return `${actor ?? 'Un jugador'} saca ${interaction.actorRoll}; ${target ?? 'su rival'}, ${interaction.targetRoll}. ${winner ?? 'El ganador'} cobra ${formatOroAmount(interaction.coinsTransferred)}.`;
}
