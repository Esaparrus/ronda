export interface ClassicGameCopy {
  slug: 'brisca' | 'escoba' | 'sieteymedia' | 'tute' | 'cinquillo';
  title: string;
  kind: string;
  players: string;
  duration: string;
  mark: string;
  summary: string;
  steps: string[];
  sections: { title: string; body: string }[];
}

export const CLASSIC_GAMES: Record<ClassicGameCopy['slug'], ClassicGameCopy> = {
  brisca: {
    slug: 'brisca',
    title: 'Brisca',
    kind: 'Bazas con triunfo',
    players: '2–4 jugadores',
    duration: '10–25 min',
    mark: '3',
    summary: 'Tres cartas, un triunfo y 120 tantos escondidos en la baraja. Decide cuándo gastar tus ases y tus treses.',
    steps: [
      'Cada persona recibe tres cartas y se revela el triunfo.',
      'En tu turno puedes jugar cualquier carta de tu mano.',
      'Gana la baza el triunfo más fuerte o, si no hay, la mayor del palo de salida.',
      'Quien gana roba primero y abre la baza siguiente.',
      'Al terminar, gana quien reúna más tantos.',
    ],
    sections: [
      { title: 'Reparto', body: 'Se usa la baraja española de 40 cartas. Cada jugador recibe tres. La última carta del mazo queda visible y marca el triunfo.' },
      { title: 'Las bazas', body: 'Puedes jugar cualquier carta. Si aparece un triunfo, gana el triunfo de mayor fuerza; si no, gana la carta más fuerte del palo que abrió la baza. El ganador roba primero y vuelve a salir.' },
      { title: 'Fuerza y tantos', body: 'El orden es as, tres, rey, caballo, sota, siete, seis, cinco, cuatro y dos. El as vale 11; el tres, 10; rey, 4; caballo, 3; sota, 2. Las demás valen cero.' },
      { title: 'Final', body: 'Cuando se agotan el mazo y las manos, se suman las cartas capturadas. La versión inicial es individual y no incluye señas ni intercambio de la carta de triunfo.' },
    ],
  },
  escoba: {
    slug: 'escoba',
    title: 'Escoba',
    kind: 'Capturas que suman 15',
    players: '2–4 jugadores',
    duration: '15–25 min',
    mark: '15',
    summary: 'Combina una carta de tu mano con las de la mesa para sumar quince y barrerlas antes que los demás.',
    steps: [
      'Recibes tres cartas y se colocan cuatro boca arriba.',
      'Juega una carta y selecciona cartas de la mesa que, con ella, sumen 15.',
      'Si no capturas, tu carta se queda en el centro.',
      'Vaciar por completo la mesa concede una escoba.',
      'Puntúan las escobas, las mayorías y el siete de oros.',
    ],
    sections: [
      { title: 'Valor de las cartas', body: 'As a siete conservan su número; sota vale 8, caballo 9 y rey 10. La baraja tiene 40 cartas.' },
      { title: 'Jugar y capturar', body: 'Elige una carta de tu mano. Puedes recoger con ella cualquier subconjunto de la mesa cuya suma total sea exactamente 15. Si no eliges una captura válida, la carta queda en la mesa.' },
      { title: 'Escobas', body: 'Si una captura deja la mesa vacía, consigues una escoba. Si las cuatro cartas iniciales suman 15, la escoba es del repartidor.' },
      { title: 'Puntuación', body: 'Cada escoba vale un punto. También dan un punto la mayoría de cartas, la mayoría de oros, la mayoría de sietes y tener el siete de oros. En una mayoría empatada nadie puntúa.' },
    ],
  },
  sieteymedia: {
    slug: 'sieteymedia',
    title: 'Siete y media',
    kind: 'Tentar la suerte',
    players: '2–7 jugadores',
    duration: '10–20 min',
    mark: '7½',
    summary: 'Pide otra carta o plántate. Acércate a siete y media sin pasarte y derrota a la banca.',
    steps: [
      'Cada jugador comienza con una carta privada.',
      'Por turnos, pide cartas o plántate.',
      'Las figuras valen medio punto; las demás, su número.',
      'Después juega la banca, que gana los empates.',
      'La banca rota hasta que todos hayan ocupado ese puesto.',
    ],
    sections: [
      { title: 'Objetivo', body: 'Acércate a 7,5 sin superar esa cifra. As a siete valen su número y sota, caballo y rey valen medio punto.' },
      { title: 'Turnos', body: 'Los jugadores contrarios a la banca actúan uno a uno. Pueden pedir tantas cartas como quieran o plantarse. Llegar exactamente a 7,5 planta automáticamente; superar la cifra pierde el duelo. Mientras sigues jugando, tu mano permanece oculta.' },
      { title: 'La banca', body: 'Cuando todos terminan, actúa la banca con las mismas opciones. La banca gana los empates.' },
      { title: 'Cartas visibles', body: 'Al plantarte o pasarte, tus cartas se revelan a toda la mesa. Así se ve qué ha ocurrido sin enseñar información de una mano que todavía sigue en juego.' },
      { title: 'Partida', body: 'Cada rival que supera a la banca consigue un punto. La banca consigue uno por cada rival al que vence. El puesto de banca rota y, cuando todos lo han ocupado una vez, gana la mayor puntuación.' },
    ],
  },
  tute: {
    slug: 'tute',
    title: 'Tute',
    kind: 'Bazas y cantes',
    players: '2 jugadores',
    duration: '20–35 min',
    mark: 'T',
    summary: 'La profundidad de la Brisca con ocho cartas, obligación de asistir y cantes de veinte y cuarenta.',
    steps: [
      'Cada jugador recibe ocho cartas y se revela el triunfo.',
      'Mientras hay baceta se juega y se roba después de cada baza.',
      'Al agotarse, es obligatorio asistir al palo de salida.',
      'Rey y caballo del mismo palo cantan 20, o 40 si son triunfo.',
      'Gana quien sume más tantos, cantes y las diez últimas.',
    ],
    sections: [
      { title: 'Modalidad', body: 'Esta primera versión implementa Tute para dos jugadores con baraja española de 40 cartas. Se reparten ocho cartas a cada uno.' },
      { title: 'Bazas y triunfo', body: 'La fuerza y los tantos son los de Brisca: as, tres, rey, caballo y sota. Mientras quedan cartas en la baceta se puede jugar libremente; después es obligatorio asistir al palo de salida si se tiene.' },
      { title: 'Cantes', body: 'Tras ganar una baza, tener rey y caballo del mismo palo suma automáticamente 20 puntos; si son del triunfo, suma 40. Se registra como máximo un cante por baza.' },
      { title: 'Final', body: 'La última baza añade 10 puntos. Gana quien tenga más tantos entre cartas capturadas, cantes y las diez últimas.' },
    ],
  },
  cinquillo: {
    slug: 'cinquillo',
    title: 'Cinquillo',
    kind: 'Descarte por palos',
    players: '2–6 jugadores',
    duration: '10–20 min',
    mark: '5',
    summary: 'Abre los palos con los cincos y construye hacia arriba o hacia abajo hasta quedarte sin cartas.',
    steps: [
      'Se reparten todas las cartas entre los jugadores.',
      'Comienza obligatoriamente quien tiene el cinco de oros.',
      'Cada palo se abre con su cinco.',
      'Después solo se colocan cartas consecutivas por arriba o por abajo.',
      'Si no tienes una jugada legal, pasas; gana quien vacía su mano.',
    ],
    sections: [
      { title: 'Reparto', body: 'Se reparten las 40 cartas, de una en una. Si el reparto no es exacto, algunos jugadores reciben una carta más.' },
      { title: 'Primera carta', body: 'Empieza la persona que tenga el cinco de oros y debe jugarlo. Los demás palos solo pueden abrirse jugando también su cinco.' },
      { title: 'Construir los palos', body: 'Desde cada cinco se baja hacia as y se sube hacia rey. En la baraja de 40, después del siete viene la sota, seguida de caballo y rey.' },
      { title: 'Pasar y ganar', body: 'Si tienes alguna carta legal estás obligado a jugar. Solo puedes pasar cuando ninguna encaja. Gana inmediatamente quien se queda sin cartas.' },
    ],
  },
};
