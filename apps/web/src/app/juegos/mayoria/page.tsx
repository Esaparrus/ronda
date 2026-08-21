import { GameIntro } from '@/components/ui/GameIntro';

export default function MayoriaPage() {
  return (
    <GameIntro
      slug="mayoria"
      title="Mayoría"
      kind="Social"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Responded sin mirar a nadie. La mesa agrupa las respuestas equivalentes, la mayoría gana vacas y una respuesta única puede llevarse la vaca rosa."
      mark="≋"
    />
  );
}
