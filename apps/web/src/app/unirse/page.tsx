// Unirse a una sala por código. Contrato P13.
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { JoinForm } from './_components/JoinForm';

export default function UnirsePage() {
  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5">
      <Link href="/" className="glass-button w-fit px-3.5 text-14 font-semibold">
        <Icon name="arrow-left" size={17} /> Inicio
      </Link>
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Entrar en la mesa</span>
        <h1 className="font-display text-40 leading-display text-hueso">Unirse a una partida</h1>
        <p className="text-15 leading-relaxed text-humo">
          Pide el código de cuatro letras a quien haya creado la sala.
        </p>
      </header>
      <JoinForm />
    </main>
  );
}
