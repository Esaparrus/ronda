// Pantalla a pantalla completa cuando esta pestaña ha quedado inactiva
// porque la misma sala se abrió en otra más nueva. Contrato P17: "la
// pestaña vieja se marca como inactiva y muestra «Estás jugando en otra
// pestaña»." Deliberadamente sin botón: no hay nada que reintentar aquí
// (la sesión sigue viva, solo que en la otra pestaña), así que la única
// acción razonable es cerrar o cambiar de pestaña, no algo que la interfaz
// pueda hacer por el jugador.
export function InactiveTabScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-16 text-hueso">Estás jugando en otra pestaña.</p>
      <p className="text-14 text-humo">
        Cierra esta pestaña o vuelve a la otra para seguir jugando.
      </p>
    </main>
  );
}
