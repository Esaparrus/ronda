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
      summary="Llena una cuenta común de tapas, vino y extras sin quedarte sin ahorros. Juega efectos, aguanta el pique y elige el momento exacto para pedir que se pague."
      steps={[
        'Sirve una tapa igual o más cara que la anterior, o usa una carta especial.',
        'Cuando te convenga, pide la cuenta: puedes pagar solo, compartirla o intentar repartirla.',
        'Las propinas y los giros cambian quién paga. Si alguien se queda sin dinero, termina la partida.',
      ]}
      note="Cada persona juega desde su móvil; una pantalla común es opcional. Las cartas legales aparecen activas: puedes tocarlas para seleccionarlas o arrastrarlas al centro de la mesa."
    />
  );
}
