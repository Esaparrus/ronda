import { GameIntro } from '@/components/ui/GameIntro';

const HOW_TO_PLAY = [
  'Cada persona recibe una o varias cartas numeradas en secreto.',
  'Habláis si queréis y jugáis las cartas al centro cuando creáis que toca.',
  'Las cartas deben aparecer de menor a mayor.',
  'Si os equivocáis, la carta se descarta y seguís jugando sin vidas.',
];

export default function OrdenPage() {
  return (
    <GameIntro
      slug="orden"
      title="Orden"
      kind="Cooperativo"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Sin turnos y casi sin hablar: sentid el ritmo del grupo y lanzad vuestras cartas al centro de menor a mayor."
      steps={HOW_TO_PLAY}
      mark="↑"
    />
  );
}
