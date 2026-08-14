import { GameIntro } from '@/components/ui/GameIntro';
import { CLASSIC_GAMES } from '@/lib/classic-games';

export default function Page() {
  const game = CLASSIC_GAMES.sieteymedia;
  return <GameIntro {...game} rulesHref="/reglas/sieteymedia" />;
}
