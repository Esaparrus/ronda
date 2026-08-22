import { GameIntro } from '@/components/ui/GameIntro';

export default function CifrasPage() {
  return (
    <GameIntro
      slug="cifras"
      title="Cifras"
      kind="Datos y aproximaciones"
      players="2–7 jugadores"
      duration="10–25 min"
      summary="Aproxima magnitudes sorprendentes o coloca elementos en el orden correcto. La respuesta se aprende al revelar."
      primaryAction={{
        href: '/crear/cifras',
        label: 'Jugar en grupo',
        description: 'Comparad intuición, cultura y sentido de la escala.',
      }}
      note="Cada tarjeta conserva definición, unidad, fuente editorial y fecha de actualización para que la explicación competitiva sea parte de la partida."
    />
  );
}
