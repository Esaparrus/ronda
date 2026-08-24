import { GameIntro } from '@/components/ui/GameIntro';

export default function CompletaLaFrasePage() {
  return (
    <GameIntro
      slug="completalafrase"
      title="Completa la frase"
      kind="Citas, refranes y cultura popular"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Completad refranes, expresiones, citas, frases históricas, humor y cultura popular antes de que se acabe el tiempo."
      primaryAction={{
        href: '/crear/completalafrase',
        label: 'Jugar en grupo',
        description: 'Crea una ronda de respuestas rápidas y descubre el final correcto.',
      }}
      note="Las respuestas se normalizan sin penalizar acentos ni signos. Pedir una pista ayuda a jugar, pero deja esa ronda sin puntos."
    />
  );
}
