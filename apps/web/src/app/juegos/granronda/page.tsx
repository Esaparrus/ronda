import { GameIntro } from '@/components/ui/GameIntro';

export default function GranRondaPage() {
  return (
    <GameIntro
      slug="granronda"
      title="La Gran Ronda"
      kind="Tablero y rutas"
      players="2–7 jugadores"
      duration="15–25 min"
      mark="✦"
      summary="Recorre un tablero de rutas, administra tus Oros, compra Sellos y decide en cada bifurcación."
      steps={[
        'Tira el dado: los efectos normales se activan solo en la casilla donde terminas.',
        'En cada bifurcación elige entre dos rutas equilibradas que siempre continúan hacia delante.',
        'Pasa por tiendas para comprar poderes y llega al destino del Sello con 8 Oros.',
      ]}
      note="Modo de tablero original de Ronda, con nombres, contenido y reglas propios. Cada persona juega desde su móvil y la pantalla común enseña el mapa."
    />
  );
}
