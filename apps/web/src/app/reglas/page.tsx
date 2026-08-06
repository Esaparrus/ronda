// Reglas del Chinchón. Contrato P18 / §7: "Texto propio, redactado de
// cero" a partir de 01-CONTRATOS.md §5 -- ninguna frase de esta pantalla
// es una copia de esa sección, solo la misma sustancia contada con
// palabras propias y ejemplos, en menos de 600 palabras (contrato
// explícito). Los números citados (5, 10, 100...) son los valores POR
// DEFECTO de la config: se dicen así, con la salvedad al final, porque
// config es ajustable por sala (§2.7) y esta pantalla no sabe en qué sala
// se está leyendo.
import Link from 'next/link';

interface Section {
  title: string;
  body: string;
  example?: string;
}

const SECTIONS: Section[] = [
  {
    title: 'La baraja',
    body: 'Se juega con la baraja española de 40 cartas: oros, copas, espadas y bastos, del 1 al 7 más sota, caballo y rey. Sin ochos, sin nueves y sin comodines.',
  },
  {
    title: 'Reparto',
    body: 'Cada jugador recibe 7 cartas. Se levanta una carta para empezar el descarte; el resto forma el mazo. Empieza quien tiene el asiento a la izquierda del repartidor.',
  },
  {
    title: 'Tu turno',
    body: 'Un turno tiene dos pasos, siempre en el mismo orden: robas una carta (del mazo o del descarte) y descartas una. Con eso, tu mano vuelve a 7 cartas y le toca al siguiente. Si robas del descarte, esa carta suele quedar bloqueada para ese mismo turno: no puedes tirarla hasta el turno siguiente.',
    example:
      'Robas el 7 de oros del descarte. Ahora tienes 8 cartas en mano. Eliges la que te sobra y la tiras. Turno terminado.',
  },
  {
    title: 'Combinaciones',
    body: 'Puedes agrupar tus cartas en grupos (3 o 4 cartas del mismo número, cada una de un palo distinto) o escaleras (3 o más cartas seguidas del mismo palo). Como la baraja no tiene ochos ni nueves, del 7 se pasa a la sota: 6-7-sota es escalera. El rey no enlaza con el as. Las cartas que no encajan en ninguna combinación son tus puntos sueltos: valen su número, salvo sota, caballo y rey, que valen 10.',
    example:
      'El 4, el 5 y el 6 de bastos forman una escalera. El 7 de oros, copas y espadas forman un grupo.',
  },
  {
    title: 'Cerrar la ronda',
    body: 'Si tras robar te quedan 5 puntos sueltos o menos (ya sin contar la carta que vas a descartar), puedes cerrar: tiras esa carta y la ronda termina ahí mismo, sin que nadie más juegue. Si cierras sin que te sobre ningún punto (0 sueltos), es un cierre en seco: en vez de sumar 0, restas 10.',
    example:
      'Tienes dos escaleras completas y solo te sobra un 4. Cierras con esa carta: te anotas 4 puntos.',
  },
  {
    title: 'Chinchón',
    body: 'Si tus 7 cartas forman una única escalera del mismo palo, es un chinchón. Lo normal es que gane la partida entera al instante, sin que importe el marcador de nadie.',
  },
  {
    title: 'Puntuación y eliminación',
    body: 'Al final de cada ronda, todos suman sus puntos sueltos (quien cerró, los suyos o la resta del cierre en seco). Pasar de 100 puntos totales elimina a un jugador. Cuando solo queda uno en pie, esa persona gana.',
  },
  {
    title: 'Si se acaba el mazo',
    body: 'Si nadie ha cerrado y el mazo se agota, se recoge el descarte (menos la carta de arriba), se baraja y sigue la partida con ese mazo nuevo. Si vuelve a agotarse sin que nadie cierre, la ronda termina ahí: todos suman sus puntos sueltos, sin restas ni bonificaciones para nadie.',
  },
];

export default function ReglasPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-40 leading-display text-hueso">Reglas del Chinchón</h1>
        <p className="text-16 text-humo">2–4 jugadores · 15–30 min</p>
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
        Estos números (5, 10, 100…) son los valores por defecto. Quien crea la sala puede cambiarlos
        antes de empezar.
      </p>

      <Link
        href="/crear/chinchon"
        className="mt-auto flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
      >
        Crear partida
      </Link>
    </main>
  );
}
