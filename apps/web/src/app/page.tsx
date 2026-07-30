// Portada provisional. Contrato P10 (P13 la completa con catálogo, salas
// guardadas, etc.). Solo tokens: nada de color a mano (regla de ESLint).
export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 text-center">
      <h1 className="font-display text-40 leading-display text-hueso">Ronda</h1>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          className="min-h-14 rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear partida
        </button>
        <button
          type="button"
          className="min-h-14 rounded-lg border border-linea px-6 text-16 font-semibold text-hueso"
        >
          Unirse a una partida
        </button>
      </div>
    </main>
  );
}
