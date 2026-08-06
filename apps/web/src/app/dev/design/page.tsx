// Escaparate de diseño: pinta las 40 cartas, todos los tamaños y todos los
// componentes de src/components/ui y src/components/cards. Contrato P11.
// Solo para desarrollo — no forma parte de las rutas jugables (§7).
'use client';

import { useState, type ReactNode } from 'react';
import { SUITS, type CardId, type Suit } from '@ronda/protocol';
import { PlayingCard, type CardSize } from '@/components/cards/PlayingCard';
import { CardBack } from '@/components/cards/CardBack';
import { Pile } from '@/components/cards/Pile';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Toast } from '@/components/ui/Toast';
import { Banner, type ConnectionStatus } from '@/components/ui/Banner';
import { Pill } from '@/components/ui/Pill';
import { Avatar } from '@/components/ui/Avatar';
import { RoomCode } from '@/components/ui/RoomCode';
import { Garbanzos } from '@/components/ui/Garbanzos';
import { BarTable } from '@/components/ui/BarTable';

// Las 40 cartas: 4 palos x 10 rangos. Generado localmente
// (no se importa @ronda/engine desde el escaparate web: es cosmético, no
// lógica de juego).
const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

function allCardIds(): CardId[] {
  const ids: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      ids.push(`${suit}-${rank}`);
    }
  }
  return ids;
}

const ALL_CARDS = allCardIds();
const CONNECTION_STATUSES: ConnectionStatus[] = ['online', 'reconnecting', 'offline'];
// Cartas de la baraja de 40 (P31): sin ochos ni nueves. El montón de muestra
// llevaba un 'oros-9' desde antes de P31 y se pintaba como dorso roto.
const PILE_SAMPLE: CardId[] = ['oros-3', 'copas-7', 'espadas-11', 'bastos-1', 'oros-10'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-20 leading-display text-hueso">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignShowcasePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <main className="flex flex-col gap-10 px-4 py-8">
      <h1 className="font-display text-40 leading-display text-hueso">Escaparate de diseño</h1>

      <Section title="Banner de conexión (4px, arriba)">
        <div className="flex flex-col gap-2">
          {CONNECTION_STATUSES.map((status) => (
            <Banner key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Roba una carta</Button>
          <Button variant="ghost">Ver reglas</Button>
          <Button variant="danger">Abandonar partida</Button>
          <Button
            variant="primary"
            loading={loadingDemo}
            onClick={() => {
              setLoadingDemo(true);
              window.setTimeout(() => setLoadingDemo(false), 1500);
            }}
          >
            {loadingDemo ? 'Enviando…' : 'Probar loading'}
          </Button>
        </div>
      </Section>

      <Section title="Garbanzos (P32: los tantos se cuentan con legumbre)">
        <div className="flex flex-col gap-3">
          <Garbanzos count={3} total={8} label="Amarrakos de ejemplo" />
          <Garbanzos count={8} total={8} label="Juego completo de ejemplo" />
          <Garbanzos count={2} label="Bazas ganadas de ejemplo" />
        </div>
      </Section>

      <Section title="Mesa de bar (P32)">
        <BarTable>
          <PlayingCard cardId="espadas-12" size="md" />
          <PlayingCard cardId="oros-3" size="md" />
        </BarTable>
      </Section>

      <Section title="Pill">
        <div className="flex gap-3">
          <Pill>2 / 4 jugadores</Pill>
          <Pill>Ronda 3</Pill>
        </div>
      </Section>

      <Section title="Avatar (colores de asiento)">
        <div className="flex gap-3">
          <Avatar name="Unai" colorIndex={0} />
          <Avatar name="Marta" colorIndex={1} />
          <Avatar name="Leo" colorIndex={2} />
          <Avatar name="Cata" colorIndex={3} />
          <Avatar name="Nora" colorIndex={4} />
          <Avatar name="Iker" colorIndex={5} />
        </div>
      </Section>

      <Section title="Código de sala">
        <RoomCode code="R4ND2" />
      </Section>

      <Section title="Sheet y Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setSheetOpen(true)}>
            Abrir panel
          </Button>
          <Button variant="ghost" onClick={() => setToastOpen(true)}>
            Mostrar aviso
          </Button>
        </div>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <p className="text-16 text-hueso">
            Panel inferior. Se cierra con el botón, con un gesto hacia abajo o con Escape.
          </p>
        </Sheet>
        {toastOpen ? (
          <Toast message="Carta descartada" onDismiss={() => setToastOpen(false)} />
        ) : null}
      </Section>

      <Section title="Dorso de carta">
        <div className="flex gap-3">
          <CardBack width={48} height={72} />
          <CardBack width={72} height={108} />
          <CardBack width={120} height={180} />
        </div>
      </Section>

      <Section title="Estados de carta (selected, dimmed, meldColor)">
        <div className="flex flex-wrap gap-4">
          <PlayingCard cardId="oros-7" />
          <PlayingCard cardId="oros-7" selected />
          <PlayingCard cardId="oros-7" dimmed />
          <PlayingCard cardId="oros-7" meldColor={1} />
          <PlayingCard cardId="oros-7" faceDown />
        </div>
      </Section>

      <Section title="Montón (Pile) con rotación determinista">
        <div className="flex gap-8">
          <Pile cards={PILE_SAMPLE} />
          <Pile cards={PILE_SAMPLE} faceDown />
          <Pile cards={[]} />
        </div>
      </Section>

      <Section title="Las 40 cartas — tamaño sm (comprobación a 360px de ancho)">
        <div className="flex max-w-[360px] flex-wrap gap-1 border border-linea p-2">
          {ALL_CARDS.map((cardId) => (
            <PlayingCard key={cardId} cardId={cardId} size="sm" />
          ))}
        </div>
      </Section>

      {(['sm', 'md', 'lg'] as CardSize[]).map((size) => (
        <Section key={size} title={`Todos los palos, un rango — tamaño ${size}`}>
          <div className="flex flex-wrap items-end gap-3">
            {(SUITS as readonly Suit[]).map((suit) => (
              <PlayingCard key={suit} cardId={`${suit}-7`} size={size} />
            ))}
          </div>
        </Section>
      ))}
    </main>
  );
}
