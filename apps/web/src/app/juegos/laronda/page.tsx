import { GameIntro } from '@/components/ui/GameIntro';

export default function LaRondaPage() {
  return (
    <GameIntro
      slug="laronda"
      title="La Ronda"
      kind="Cartas y pique"
      players="2–8 jugadores"
      duration="10–20 min"
      mark="€"
      summary="Una sobremesa de tapas, vino y cuentas cruzadas. Pide sin quedarte atrás y elige el momento exacto para pasarle la cuenta a otra persona."
      steps={[
        'Sirve una tapa igual o más cara que la anterior, o usa una carta especial.',
        'Cuando te convenga, pide la cuenta: puedes pagar solo, compartirla o intentar repartirla.',
        'Las propinas y los giros cambian quién paga. Si alguien se queda sin dinero, termina la partida.',
      ]}
      note="Prototipo digital independiente con reglas y arte originales. Cada persona juega desde su móvil; una pantalla común es opcional."
    />
  );
}
