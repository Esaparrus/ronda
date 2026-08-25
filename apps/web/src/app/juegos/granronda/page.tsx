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
        'Tira el dado y toca la casilla exacta donde quieres caer: el mapa ilumina todo el recorrido.',
        'Las bifurcaciones son rutas largas que cruzan el jardín y siempre continúan hacia delante.',
        'Pasa por tiendas para comprar poderes y llega al destino del Sello con 8 Oros.',
      ]}
      note="Cada persona juega desde su móvil y la pantalla común enseña el mapa. Los minijuegos rápidos tienen tres pruebas y muestran la solución y las respuestas de toda la mesa."
    />
  );
}
