import { GameIntro } from '@/components/ui/GameIntro';

export default function QuienLoHariaPage() {
  return (
    <GameIntro
      slug="quienloharia"
      title="Quién lo haría"
      kind="Votación social"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Leed una situación, votad en secreto a la persona que mejor encaja y comprobad si el grupo piensa igual."
      primaryAction={{
        href: '/crear/quienloharia',
        label: 'Jugar en grupo',
        description: 'Elegid un pack y votad desde vuestro móvil.',
      }}
      note="Los votos permanecen privados hasta la revelación configurada. El modo social no fuerza un marcador: podéis jugar por historias y risas."
    />
  );
}
