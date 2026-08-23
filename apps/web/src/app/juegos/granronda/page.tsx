import { GameIntro } from '@/components/ui/GameIntro';

export default function GranRondaPage() {
  return (
    <GameIntro
      slug="granronda"
      title="La Gran Ronda"
      kind="Tablero y minijuegos"
      players="3–7 jugadores"
      duration="15–25 min"
      mark="✦"
      summary="Recorre un tablero de rutas, administra tus Oros, compra Sellos y supera los pulsos rápidos de cada ronda."
      steps={[
        'Tira el dado por turnos y deja que el servidor resuelva tu casilla.',
        'En cada bifurcación elige entre una ruta segura y otra más arriesgada.',
        'Llega al destino del Sello con 8 Oros y responde al minijuego final de la ronda.',
      ]}
      note="Modo de tablero original de Ronda, con nombres, contenido y reglas propios. Cada persona juega desde su móvil y la pantalla común enseña el mapa."
    />
  );
}
