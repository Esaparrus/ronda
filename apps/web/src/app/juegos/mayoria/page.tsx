import { GameIntro } from '@/components/ui/GameIntro';

export default function MayoriaPage() {
  return (
    <GameIntro
      slug="mayoria"
      title="Mayoría"
      kind="Social"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Responded sin mirar a nadie. Si piensas como la mayoría, puntúas; si sorprendes a la mesa, al menos habrá conversación."
      mark="≋"
    />
  );
}
