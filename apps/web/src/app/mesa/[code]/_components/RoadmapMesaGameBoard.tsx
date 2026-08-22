import type { RoadmapTableView } from '@ronda/protocol';
import { ColorCountdownHeader } from '@/app/sala/[code]/_components/ColorCountdownHeader';

export interface RoadmapMesaGameBoardProps {
  view: RoadmapTableView;
}

export function RoadmapMesaGameBoard({ view }: RoadmapMesaGameBoardProps) {
  if (view.gameId === 'banderas') return <BanderasMesa view={view} />;
  if (view.gameId === 'cifras') return <CifrasMesa view={view} />;
  if (view.gameId === 'quienloharia') return <QuienLoHariaMesa view={view} />;
  return <CompletaLaFraseMesa view={view} />;
}

function BanderasMesa({ view }: { view: Extract<RoadmapTableView, { gameId: 'banderas' }> }) {
  const revealed = view.phase === 'reveal';
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Banderas · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.flags.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <div className="flex flex-1 flex-col items-center gap-7 overflow-y-auto px-8 py-8 text-center">
        <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-linea bg-white/95 p-8 shadow-lg">
          <img
            src={view.flags.image}
            alt={view.flags.entityName ?? 'Bandera para identificar'}
            className="mx-auto block aspect-[3/2] w-full object-contain"
          />
        </section>
        {revealed ? (
          <section className="flex w-full max-w-4xl flex-col gap-5">
            <div className="rounded-3xl border border-oro/60 bg-oro/10 px-6 py-6">
              <p className="text-14 uppercase tracking-[0.16em] text-humo">Respuesta</p>
              <p className="mt-1 font-display text-[clamp(2.5rem,7vw,5rem)] text-oro">
                {view.flags.entityName ?? '—'}
              </p>
              <p className="mt-2 text-16 text-humo">{view.flags.explanation ?? 'Buen ojo.'}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {view.flags.options.map((option) => (
                <div
                  key={option.id}
                  className={`rounded-2xl border px-5 py-4 text-left text-18 ${
                    option.id === view.flags.correctOptionId
                      ? 'border-equipo-turquesa/70 bg-equipo-turquesa/10 text-hueso'
                      : 'border-linea bg-mesa/80 text-humo'
                  }`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="float-right font-mono text-oro">
                    {Object.values(view.flags.answers ?? {}).filter((id) => id === option.id).length}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-28 text-humo">
            {view.flags.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas
          </p>
        )}
      </div>
    </main>
  );
}

function CifrasMesa({ view }: { view: Extract<RoadmapTableView, { gameId: 'cifras' }> }) {
  const revealed = view.phase === 'reveal';
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Cifras · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.cifras.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <div className="flex flex-1 flex-col items-center gap-7 overflow-y-auto px-8 py-8 text-center">
        <section className="surface-panel flex w-full max-w-4xl flex-col gap-3 px-8 py-8">
          <p className="text-14 uppercase tracking-[0.16em] text-oro">
            {view.cifras.kind === 'estimate' ? 'Estima' : 'Ordena'}
          </p>
          <h1 className="text-[clamp(2rem,5vw,4.5rem)] font-semibold leading-tight text-hueso">
            {view.cifras.prompt}
          </h1>
          <p className="text-18 text-humo">{view.cifras.definition}</p>
          <p className="font-mono text-20 text-oro">{view.cifras.unit}</p>
        </section>
        {view.cifras.kind === 'order' ? (
          <div className="grid w-full max-w-4xl gap-3 md:grid-cols-2">
            {view.cifras.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-linea bg-mesa/80 px-5 py-4 text-left">
                <p className="text-18 font-semibold text-hueso">{item.label}</p>
                {revealed ? (
                  <p className="mt-1 font-mono text-16 text-oro">
                    {formatNumber(view.cifras.itemValues?.[item.id])} {view.cifras.unit}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : revealed ? (
          <div className="rounded-3xl border border-oro/60 bg-oro/10 px-8 py-7">
            <p className="text-14 uppercase tracking-[0.16em] text-humo">Dato de referencia</p>
            <p className="mt-1 font-display text-[clamp(2.5rem,7vw,5rem)] text-oro">
              {formatNumber(view.cifras.referenceValue)} {view.cifras.unit}
            </p>
            <p className="mt-2 text-14 text-humo">{view.cifras.source ?? 'Referencia editorial'}</p>
          </div>
        ) : null}
        {revealed ? (
          <p className="text-20 text-humo">
            {view.cifras.submittedPlayerIds.length}/{view.players.length} respuestas · puntos calculados en cada móvil
          </p>
        ) : (
          <p className="text-28 text-humo">
            {view.cifras.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas
          </p>
        )}
      </div>
    </main>
  );
}

function QuienLoHariaMesa({ view }: { view: Extract<RoadmapTableView, { gameId: 'quienloharia' }> }) {
  const revealed = view.phase === 'reveal';
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Quién lo haría · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.who.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <div className="flex flex-1 flex-col items-center gap-7 overflow-y-auto px-8 py-8 text-center">
        <section className="surface-panel w-full max-w-5xl px-8 py-10">
          <p className="text-14 uppercase tracking-[0.16em] text-oro">Pregunta para la mesa</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,4.8rem)] font-semibold leading-tight text-hueso">
            {view.who.prompt}
          </h1>
        </section>
        {revealed && view.who.resultsVisible ? (
          <div className="grid w-full max-w-5xl gap-3 md:grid-cols-2 xl:grid-cols-3">
            {view.players.map((player) => (
              <div key={player.playerId} className="rounded-2xl border border-linea bg-mesa/80 px-5 py-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-20 font-semibold text-hueso">{player.nick}</span>
                  <span className="font-mono text-32 text-oro">{view.who.voteCounts?.[player.playerId] ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-28 text-humo">
            {revealed ? 'Los resultados se guardan para el final' : `${view.who.submittedPlayerIds.length}/${view.players.length} votos bloqueados`}
          </p>
        )}
      </div>
    </main>
  );
}

function CompletaLaFraseMesa({ view }: { view: Extract<RoadmapTableView, { gameId: 'completalafrase' }> }) {
  const revealed = view.phase === 'reveal';
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <ColorCountdownHeader
        left={`Completa la frase · ronda ${view.round}/${view.config.rounds}`}
        deadlineAt={view.phase === 'input' ? view.sentence.deadlineAt : null}
        durationSeconds={view.config.answerTimeSeconds || 1}
      />
      <div className="flex flex-1 flex-col items-center gap-7 overflow-y-auto px-8 py-8 text-center">
        <section className="surface-panel w-full max-w-5xl px-8 py-10">
          <p className="text-14 uppercase tracking-[0.16em] text-oro">{view.sentence.category}</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,4.8rem)] font-semibold leading-tight text-hueso">
            {view.sentence.prompt}
          </h1>
        </section>
        {revealed ? (
          <section className="flex w-full max-w-5xl flex-col gap-5">
            <div className="rounded-3xl border border-oro/60 bg-oro/10 px-8 py-7">
              <p className="text-14 uppercase tracking-[0.16em] text-humo">Respuesta esperada</p>
              <p className="mt-1 font-display text-[clamp(2.5rem,7vw,5rem)] text-oro">
                {view.sentence.canonicalAnswer ?? '—'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {view.players.map((player) => {
                const answer = view.sentence.answers?.[player.playerId];
                return (
                  <div key={player.playerId} className="rounded-2xl border border-linea bg-mesa/80 px-5 py-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-18 font-semibold text-hueso">{player.nick}</span>
                      <span className="font-mono text-24 text-oro">+{answer?.points ?? 0}</span>
                    </div>
                    <p className="mt-1 text-14 text-humo">{answer?.answer ?? 'Sin respuesta'}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="text-28 text-humo">
            {view.sentence.submittedPlayerIds.length}/{view.players.length} respuestas bloqueadas
          </p>
        )}
      </div>
    </main>
  );
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}
