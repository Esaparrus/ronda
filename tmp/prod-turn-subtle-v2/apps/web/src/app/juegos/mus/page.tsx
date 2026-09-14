// Ficha de Mus. Mismo patrón que /juegos/chinchon y /juegos/pocha
// (contrato P13 / §7). Lo que distingue a Mus en el catálogo es que es el
// primer juego POR PAREJAS (§12.2), así que se dice ya aquí.
import { GameIntro } from '@/components/ui/GameIntro';

const HOW_TO_PLAY = [
  'Se juega siempre 4 contra 4, en dos parejas: los compañeros se sientan enfrentados.',
  'Cada uno recibe 4 cartas. Si los cuatro dicen «mus», se descarta y se reparte otra vez.',
  'En cuanto alguien corta, se juegan cuatro lances: grande, chica, pares y juego.',
  'En cada lance se pasa, se envida un número de piedras, o se lanza un órdago.',
  'Al final de la mano se descubren las cartas y se cuentan las piedras. 40 piedras ganan el juego.',
];

export default function MusPage() {
  return (
    <GameIntro
      slug="mus"
      title="Mus"
      kind="Por parejas"
      players="4 jugadores"
      duration="30–60 min"
      summary="Señas, envites y cuatro lances para entenderse con tu pareja y leer a la de enfrente."
      steps={HOW_TO_PLAY}
      rulesHref="/reglas/mus"
      mark="M"
      note="En Mus hacen falta cuatro personas. El anfitrión forma las parejas antes de empezar."
    />
  );
}
