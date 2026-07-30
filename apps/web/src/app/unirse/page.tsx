// Unirse a una sala por código. Contrato P13.
import { JoinForm } from './_components/JoinForm';

export default function UnirsePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-40 leading-display text-hueso">Unirse a una partida</h1>
      <JoinForm />
    </main>
  );
}
