// Reglas del Mus. Mismo criterio que /reglas (Chinchón) y /reglas/pocha:
// texto propio a partir de 01-CONTRATOS.md §12, con ejemplos. Los números de
// las tablas (3/2/1 piedras, 40 piedras el juego) no cambian por sala; lo que
// sí es variante -- ocho reyes, juegos de la vaca, cuánto vale el punto -- se
// nombra como tal al final.
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface Section {
  title: string;
  body: string;
  example?: string;
}

const SECTIONS: Section[] = [
  {
    title: 'La baraja y las parejas',
    body: 'Baraja española de 40 cartas, sin comodines. Se juega exactamente entre cuatro, en dos parejas fijas: los compañeros se sientan enfrentados, así que los asientos 1 y 3 son una pareja y los asientos 2 y 4 la otra. El marcador es de la pareja, nunca de cada jugador.',
  },
  {
    title: 'Piedras, amarrakos y juegos',
    body: 'Lo que se gana son piedras. Cinco piedras hacen un amarrako y cuarenta piedras (ocho amarrakos) ganan el juego. Una partida puede ser a un juego o a varios: eso lo elige quien crea la sala.',
  },
  {
    title: 'El mano y el reparto',
    body: 'El mano habla primero en todo. El postre, sentado inmediatamente antes en el orden de juego, pulsa Repartir y sirve cuatro cartas a cada uno. Los dos puestos rotan un asiento cada mano. Cuando dos manos empatan, gana quien esté más cerca del mano.',
  },
  {
    title: 'Mus y descarte',
    body: 'Empezando por el mano, cada uno dice «mus» o corta. Si los cuatro dicen mus, cada jugador descarta entre una y cuatro cartas, roba otras tantas, y se vuelve a preguntar. En cuanto uno corta, se juega la mano con las cartas que cada uno tenga.',
    example: 'Tienes 4, 5, 6 y 7: nada que hacer. Dices mus, y si los otros tres también, te deshaces de las cuatro.',
  },
  {
    title: 'Los cuatro lances',
    body: 'Se juegan siempre en el mismo orden. Grande: gana la mano más alta. Chica: la más baja. Pares: solo juegan quienes tengan al menos una pareja, y hay que declarar en voz alta si se tiene o no. Juego: solo juegan quienes sumen 31 o más, contando Rey, Caballo y Sota como 10 y el resto por su número. Si nadie tiene juego, ese lance se sustituye por el punto, que gana la suma más alta por debajo de 31.',
    example: 'Rey, Caballo, Sota y As suman 31: el mejor juego que hay. Rey, Rey, Rey y Sota suman 40, y pierde contra ese 31.',
  },
  {
    title: 'Qué vale cada cosa',
    body: 'En pares: dos parejas o cuatro iguales (duples) valen 3 piedras, tres iguales (medias) 2, y una pareja suelta 1. En juego: el 31 vale 3 piedras y cualquier otro juego 2. Estas piedras se cobran aunque el lance se haya jugado en paso, y las cobra cada jugador de la pareja que las tenga.',
  },
  {
    title: 'Envidar, querer y no querer',
    body: 'En cada lance puedes pasar, envidar (el envido simple son dos piedras), cantar una cantidad concreta o subir la apuesta contraria. Cinco piedras son un amarrako. La subida se registra como nueva cantidad total. La otra pareja puede querer, no querer o volver a subir. Si pasan los cuatro, el lance vale una piedra para quien lo gane.',
    example: 'Envidas 2 en grande y la contraria dice «no quiero»: te llevas 1 piedra en el acto y nadie enseña nada.',
  },
  {
    title: 'El órdago',
    body: 'En lugar de envidar puedes lanzar un órdago: apuestas el juego entero. Si la contraria no lo quiere, ganas una piedra y la mano continúa. Si lo quiere, se descubren las cartas de los cuatro, se resuelve ese lance ahí mismo y quien lo gane gana el juego completo, esté como esté el marcador.',
  },
  {
    title: 'El recuento',
    body: 'Al acabar la mano se descubren las cartas y se resuelven los lances en orden, sumando a cada pareja lo envidado y lo que valgan sus pares y su juego. Si una pareja llega a 40 a mitad del recuento, el juego termina ahí: lo que quedaba por contar ya no se cuenta.',
    example: 'Vais 39 y ganáis la grande en paso: esa piedra os pone en 40 y el recuento se para, aunque tuvierais medias por cobrar.',
  },
];

export default function ReglasMusPage() {
  return (
    <main className="app-page rules-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col gap-2">
        <Link href="/juegos/mus" className="glass-button mb-3 w-fit px-3.5 text-14 font-semibold">
          <Icon name="arrow-left" size={17} /> Mus
        </Link>
        <span className="eyebrow">Guía completa</span>
        <h1 className="font-display text-40 leading-display text-hueso">Reglas del Mus</h1>
        <p className="text-16 text-humo">4 jugadores, por parejas · 30–60 min</p>
      </header>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section, index) => (
          <section key={section.title} className="rules-section flex flex-col gap-2">
            <span className="text-11 font-bold uppercase tracking-wider text-oro">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="text-20 font-semibold text-hueso">{section.title}</h2>
            <p className="text-15 leading-relaxed text-hueso">{section.body}</p>
            {section.example ? (
              <p className="rules-example p-3 text-14 leading-relaxed text-humo">
                Ejemplo: {section.example}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <p className="text-14 text-humo">
        Los ocho reyes (los Treses valen como Rey y los Doses como As), cuántos juegos hacen falta
        para ganar la partida y si el punto paga una piedra o dos son variantes: quien crea la sala
        puede cambiarlas antes de empezar. También se indica si la mesa es presencial u online. En
        presencial podéis hablar; en ambos modos cada paso se confirma en el móvil para que la app
        pueda resolver los lances y sumar el tanteo. La app no implementa señas.
      </p>

      <Link
        href="/crear/mus"
        className="primary-action mt-auto flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-6 text-16 font-semibold text-white"
      >
        <Icon name="plus" size={18} /> Crear partida
      </Link>
    </main>
  );
}
