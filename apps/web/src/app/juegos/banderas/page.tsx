import { GameIntro } from '@/components/ui/GameIntro';

export default function BanderasPage() {
  return (
    <GameIntro
      slug="banderas"
      title="Banderas"
      kind="Quiz visual"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Reconoced banderas originales, elegid entre cuatro opciones y descubrid el dato detrás de cada diseño."
      primaryAction={{
        href: '/crear/banderas',
        label: 'Jugar en grupo',
        description: 'Crea una sala y comparte el código con la mesa.',
      }}
      note="Incluye banderas nacionales y territoriales dibujadas como material original de juego. La primera respuesta bloqueada activa 5 segundos para el resto; la puntuación premia acertar."
    />
  );
}
