// Reglas de la Pocha. Mismo criterio que /reglas (Chinchón): texto propio a
// partir de 01-CONTRATOS.md §9, con ejemplos, en menos de 600 palabras. Los
// números (10, etc.) son los del cálculo de puntos, que no cambia por sala;
// las variantes (triunfo, orden de fuerza, jugadores) sí son ajustables y se
// nombran como tales.
import Link from 'next/link';

interface Section {
  title: string;
  body: string;
  example?: string;
}

const SECTIONS: Section[] = [
  {
    title: 'La baraja',
    body: 'Se juega con una baraja española de 40 cartas: oros, copas, espadas y bastos, del 1 al 7 y del 10 al 12 (sin el 8 ni el 9).',
  },
  {
    title: 'La pirámide de rondas',
    body: 'La partida no tiene un número fijo de rondas: empieza con manos de 1 carta, sube de una en una hasta un máximo (depende de cuántos jugáis) y vuelve a bajar hasta 1 otra vez. El repartidor rota una ronda cada vez.',
    example: 'Con 4 jugadores, el máximo es 9: las manos van 1, 2, 3… hasta 9, y luego 8, 7… hasta 1.',
  },
  {
    title: 'Reparto y triunfo',
    body: 'Se reparten las cartas de esa ronda a cada jugador, empezando por quien tiene el asiento a la izquierda del repartidor. Si la sala tiene el triunfo activado, se revela una carta más: su palo manda esa ronda.',
  },
  {
    title: 'Cantar',
    body: 'Antes de jugar, cada uno dice en voz alta (canta) cuántas bazas cree que va a ganar esa ronda, un número entre 0 y el tamaño de la ronda. Se canta en el mismo orden en que se va a jugar, así que el repartidor siempre canta el último. Al repartidor no se le deja cantar el único número que dejaría la suma de todos los cantes exactamente igual al número de bazas disponibles.',
    example:
      'Ronda de 4 bazas, los otros tres ya cantaron 1, 1 y 1 (suman 3). Al repartidor no se le deja cantar 1, porque dejaría la suma en 4.',
  },
  {
    title: 'Jugar las bazas',
    body: 'Empieza quien tiene el asiento a la izquierda del repartidor. Si tienes una carta del palo que ha salido, tienes que jugarla; si no tienes ninguna, puedes tirar lo que quieras, incluido el triunfo. Gana la baza quien juega el triunfo más fuerte, si hay alguno en la baza; si no, quien juega la carta más fuerte del palo que salió. Quien gana lleva la siguiente baza.',
  },
  {
    title: 'Puntuación',
    body: 'Si aciertas exactamente el número de bazas que cantaste, te anotas 10 más las bazas ganadas. Si te pasas o te quedas corto, no te anotas nada esa ronda. Los puntos se van sumando ronda a ronda: aquí nadie queda eliminado a mitad de partida.',
    example: 'Cantaste 3 y ganaste 3 bazas: 13 puntos. Cantaste 2 y ganaste 1: 0 puntos.',
  },
  {
    title: 'Fin de la partida',
    body: 'Se juegan todas las rondas de la pirámide, sin final anticipado. Gana quien tenga más puntos acumulados al terminar la última.',
  },
];

export default function ReglasPochaPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Reglas de la Pocha</h1>
        <p className="text-16 text-humo">2–6 jugadores · 20–45 min</p>
      </header>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-20 font-semibold text-hueso">{section.title}</h2>
            <p className="text-16 text-hueso">{section.body}</p>
            {section.example ? (
              <p className="rounded-md border border-linea bg-mesa p-3 text-14 text-humo">
                Ejemplo: {section.example}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <p className="text-14 text-humo">
        El triunfo, el orden de fuerza de las cartas y el número de jugadores son variantes: quien
        crea la sala puede cambiarlos antes de empezar.
      </p>

      <Link
        href="/crear/pocha"
        className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
      >
        Crear partida
      </Link>
    </main>
  );
}
