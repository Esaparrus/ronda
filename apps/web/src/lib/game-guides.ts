import type { GameId } from '@ronda/protocol';

export interface GameGuideStep {
  title: string;
  body: string;
}

export interface GameGuide {
  title: string;
  kind: string;
  mark: string;
  objective: string;
  steps: readonly GameGuideStep[];
  victory: string;
  keyRule: string;
}

/**
 * Explicación breve que ve todo el mundo antes de entrar en una partida.
 * Es deliberadamente más concreta que el texto comercial del catálogo:
 * objetivo, acciones en orden, victoria y el error que conviene evitar.
 */
export const GAME_GUIDES = {
  chinchon: {
    title: 'Chinchón',
    kind: 'Clásico de cartas',
    mark: '7',
    objective:
      'Forma escaleras del mismo palo y grupos del mismo número para quedarte con el menor valor posible en cartas sueltas.',
    steps: [
      {
        title: 'Ordena tus 7 cartas',
        body: 'Busca combinaciones de 3 o más cartas: números iguales o cartas consecutivas del mismo palo.',
      },
      {
        title: 'Roba una carta',
        body: 'Cuando llegue tu turno, toma la carta superior del mazo o la que está visible en el descarte.',
      },
      {
        title: 'Descarta una carta',
        body: 'Vuelve a quedarte con 7. La carta que tires será la opción de robo de la siguiente persona.',
      },
      {
        title: 'Cierra en el momento justo',
        body: 'Si después de descartar te quedan 5 puntos sueltos o menos, puedes terminar la ronda.',
      },
    ],
    victory:
      'Gana la última persona que no supera 100 puntos. Un chinchón —7 cartas seguidas del mismo palo— gana la partida al instante.',
    keyRule:
      'Robar siempre va antes de descartar. Si tomas la carta visible, no puedes devolver esa misma carta inmediatamente.',
  },
  pocha: {
    title: 'Pocha',
    kind: 'Bazas y predicción',
    mark: '♠',
    objective:
      'Predice cuántas bazas ganarás en cada ronda y consigue exactamente esa cantidad: ni una más ni una menos.',
    steps: [
      {
        title: 'Mira tu mano y el triunfo',
        body: 'El número de cartas cambia en cada ronda. El palo de triunfo gana a los demás palos.',
      },
      {
        title: 'Canta tus bazas',
        body: 'Antes de jugar, elige cuántas bazas crees que podrás llevarte con esas cartas.',
      },
      {
        title: 'Juega una carta por baza',
        body: 'Debes asistir al palo de salida si tienes. Si no tienes, puedes jugar cualquier carta.',
      },
      {
        title: 'Comprueba tu predicción',
        body: 'Al acabar la mano, compara las bazas ganadas con el número que cantaste.',
      },
    ],
    victory:
      'Cada acierto suma 10 puntos más las bazas conseguidas. Tras completar toda la pirámide de rondas, gana quien tenga más puntos.',
    keyRule: 'No basta con ganar muchas bazas: pasarte de tu predicción también es fallar.',
  },
  mus: {
    title: 'Mus',
    kind: 'Dos parejas',
    mark: 'M',
    objective:
      'Suma piedras con tu pareja leyendo las cartas, los envites y las decisiones de la pareja rival.',
    steps: [
      {
        title: 'Forma dos parejas',
        body: 'Jugáis exactamente 4 personas. Tu compañero se sienta frente a ti y comparte tu marcador.',
      },
      {
        title: 'Decidid si hay mus',
        body: 'Cada cual recibe 4 cartas. Si los cuatro quieren mus, podéis descartar y recibir cartas nuevas.',
      },
      {
        title: 'Jugad los cuatro lances',
        body: 'Al cortar el mus se resuelven, en orden: grande, chica, pares y juego —o punto si nadie tiene juego—.',
      },
      {
        title: 'Pasad, envidad u ordenad',
        body: 'En cada lance puedes pasar, aceptar, subir la apuesta o lanzar un órdago por toda la partida.',
      },
    ],
    victory:
      'Los lances ganados y aceptados suman piedras. La primera pareja que alcanza 40 piedras gana.',
    keyRule:
      'Las cartas solo se comparan al final de la mano; un envite no aceptado se cobra sin enseñar quién llevaba la mejor jugada.',
  },
  brisca: {
    title: 'Brisca',
    kind: 'Bazas con triunfo',
    mark: '3',
    objective:
      'Captura las cartas que dan tantos —sobre todo ases y treses— usando el palo de triunfo en el momento adecuado.',
    steps: [
      {
        title: 'Recibe 3 cartas',
        body: 'Se deja una carta visible bajo el mazo: su palo será el triunfo durante toda la partida.',
      },
      {
        title: 'Juega cualquier carta',
        body: 'Cada persona pone una carta. No es obligatorio seguir el palo de salida.',
      },
      {
        title: 'Resuelve la baza',
        body: 'Gana el triunfo más fuerte; si nadie juega triunfo, gana la carta más fuerte del palo que abrió.',
      },
      {
        title: 'Roba y vuelve a salir',
        body: 'Quien gana la baza roba primero, después roba el resto y esa persona inicia la siguiente.',
      },
    ],
    victory:
      'Cuando se agotan el mazo y las manos, se suman los tantos capturados. Gana quien tenga más.',
    keyRule:
      'El orden fuerte es as, tres, rey, caballo y sota. Las cartas numéricas restantes no dan tantos.',
  },
  escoba: {
    title: 'Escoba',
    kind: 'Capturas que suman 15',
    mark: '15',
    objective:
      'Combina una carta de tu mano con cartas de la mesa para sumar exactamente 15 y capturarlas.',
    steps: [
      {
        title: 'Mira tu mano y la mesa',
        body: 'Recibes 3 cartas y empiezan 4 cartas boca arriba en el centro.',
      },
      {
        title: 'Busca una suma de 15',
        body: 'Elige una carta de tu mano y las cartas de mesa que, juntas, alcancen exactamente 15.',
      },
      {
        title: 'Captura o deja tu carta',
        body: 'Si la combinación es válida, te llevas todas esas cartas. Si no capturas, tu carta queda en la mesa.',
      },
      {
        title: 'Barre la mesa',
        body: 'Si una captura deja el centro completamente vacío, consigues una escoba.',
      },
    ],
    victory:
      'Puntúan las escobas, varias mayorías y el siete de oros. Al final, gana quien reúna más puntos.',
    keyRule:
      'Sota, caballo y rey valen 8, 9 y 10 al formar una suma; no valen sus tantos de otros juegos.',
  },
  sieteymedia: {
    title: 'Siete y media',
    kind: 'Tentar la suerte',
    mark: '7½',
    objective: 'Acércate a 7,5 puntos sin pasarte y termina con una mano mejor que la banca.',
    steps: [
      {
        title: 'Recibe una carta',
        body: 'Las cartas del as al siete valen su número; sota, caballo y rey valen medio punto.',
      },
      {
        title: 'Pide o plántate',
        body: 'Puedes pedir otra carta tantas veces como quieras o conservar el total que ya tienes.',
      },
      {
        title: 'Evita pasarte',
        body: 'Si superas 7,5 pierdes ese duelo inmediatamente. Llegar a 7,5 te planta de forma automática.',
      },
      {
        title: 'Juega contra la banca',
        body: 'Cuando terminan los demás, la banca pide o se planta y compara su mano con cada rival.',
      },
      {
        title: 'Cartas visibles',
        body: 'Mientras una persona sigue jugando, su mano permanece oculta. Al plantarse o pasarse, sus cartas y su total se muestran al resto de la mesa.',
      },
    ],
    victory:
      'Cada duelo ganado suma un punto. Cuando todas las personas han sido banca una vez, vence la puntuación más alta.',
    keyRule: 'La banca gana los empates: para vencerla necesitas un total estrictamente mejor.',
  },
  tute: {
    title: 'Tute',
    kind: 'Bazas y cantes',
    mark: 'T',
    objective: 'Captura cartas valiosas y suma cantes con rey y caballo del mismo palo.',
    steps: [
      {
        title: 'Recibe 8 cartas',
        body: 'Se revela un palo de triunfo. Mientras quede baceta, después de cada baza volveréis a robar.',
      },
      {
        title: 'Juega la baza',
        body: 'Cada persona juega una carta. El triunfo más fuerte gana; si no hay, manda el palo de salida.',
      },
      {
        title: 'Asiste cuando se acabe el mazo',
        body: 'Sin cartas en la baceta, debes jugar el palo de salida siempre que tengas una carta de ese palo.',
      },
      {
        title: 'Suma los cantes',
        body: 'Tras ganar una baza, rey y caballo del mismo palo añaden 20 puntos, o 40 si son del triunfo.',
      },
    ],
    victory:
      'Se suman cartas capturadas, cantes y 10 puntos por la última baza. Gana quien tenga más tantos.',
    keyRule: 'La obligación de asistir empieza solo cuando la baceta se ha agotado.',
  },
  cinquillo: {
    title: 'Cinquillo',
    kind: 'Descarte por palos',
    mark: '5',
    objective:
      'Sé la primera persona en vaciar su mano construyendo los cuatro palos alrededor de sus cincos.',
    steps: [
      {
        title: 'Repartid toda la baraja',
        body: 'Las cartas se distribuyen entre todos. Empieza quien tenga el cinco de oros.',
      },
      {
        title: 'Abre cada palo con su cinco',
        body: 'Ningún palo puede crecer hasta que alguien haya colocado primero su cinco.',
      },
      {
        title: 'Construye por los extremos',
        body: 'Añade una carta inmediatamente inferior o superior a las que ya están colocadas en ese palo.',
      },
      {
        title: 'Juega o pasa',
        body: 'Si tienes una carta legal, debes ponerla. Solo pasas cuando ninguna de tus cartas encaja.',
      },
    ],
    victory: 'La partida termina en cuanto una persona coloca su última carta: esa persona gana.',
    keyRule:
      'En la baraja de 40 cartas, después del siete viene la sota; no existen ochos ni nueves.',
  },
  orden: {
    title: 'Orden',
    kind: 'Cooperativo',
    mark: '↑',
    objective: 'Vaciad todas las manos jugando las cartas del 1 al 100 en orden ascendente.',
    steps: [
      {
        title: 'Mira solo tus números',
        body: 'Cada persona recibe cartas secretas. No hay turnos: cualquiera puede jugar cuando crea que toca.',
      },
      {
        title: 'Hablad del ritmo, no del número',
        body: 'Coordinad el momento de jugar sin revelar el valor exacto de vuestras cartas.',
      },
      {
        title: 'Lanza la menor cuando toque',
        body: 'Toca o arrastra una carta al centro. La siguiente carta válida siempre debe ser mayor.',
      },
      {
        title: 'Seguid incluso si falláis',
        body: 'Una carta demasiado baja queda marcada y se descarta. No perdéis vidas; la ronda continúa.',
      },
    ],
    victory:
      'No hay ganador individual. El grupo intenta completar cada reparto y alcanzar la ronda más alta posible.',
    keyRule: 'No esperes un turno: si crees que tienes la carta más baja de toda la mesa, juégala.',
  },
  colores: {
    title: 'Colores',
    kind: 'Memoria visual',
    mark: '●',
    objective: 'Elige en secreto el color o los colores exactos que responden a cada pregunta.',
    steps: [
      {
        title: 'Lee cuántos colores pide',
        body: 'Cada pregunta indica el número exacto de fichas que debes seleccionar.',
      },
      {
        title: 'Elige tu combinación',
        body: 'Marca las fichas en privado y confirma cuando estés seguro de que no falta ni sobra ninguna.',
      },
      {
        title: 'Vigila la cuenta atrás',
        body: 'La primera respuesta bloqueada inicia 15 segundos para todas las personas que faltan.',
      },
      {
        title: 'Revelad a la vez',
        body: 'Solo acierta quien envía la combinación completa y exacta.',
      },
    ],
    victory:
      'Quien acierta suma un punto por cada rival que falla. La primera persona que alcanza el objetivo de puntos gana.',
    keyRule: 'Si todo el mundo acierta, nadie puntúa y el bote crece para la siguiente pregunta.',
  },
  mayoria: {
    title: 'Mayoría',
    kind: 'Pensar como la mesa',
    mark: '≋',
    objective: 'Responde lo mismo que crees que contestará la mayoría, sin copiar ni coordinarte.',
    steps: [
      {
        title: 'Lee la pregunta',
        body: 'Verás una propuesta abierta como “nombra una salsa” o “un plan de domingo”.',
      },
      {
        title: 'Escribe en secreto',
        body: 'Da una respuesta breve y concreta. Nadie verá lo escrito hasta que todo el mundo termine.',
      },
      {
        title: 'Revelad las respuestas',
        body: 'Cuando todo el mundo termina, todas las respuestas aparecen a la vez y se pueden comparar.',
      },
      {
        title: 'Agrupa y puntúa',
        body: 'El anfitrión une las respuestas que significan claramente lo mismo. El grupo más grande gana una vaca para cada persona que lo escribió.',
      },
    ],
    victory:
      'La primera persona que llega a 8 vacas sin tener la vaca rosa gana. El objetivo se puede cambiar al crear la partida.',
    keyRule:
      'Si hay empate por el grupo más grande, nadie puntúa. Si solo una persona queda fuera de la mayoría, recibe la vaca rosa y no puede ganar mientras la tenga.',
  },
  escala: {
    title: 'Escala',
    kind: 'Pistas e intuición',
    mark: '↔',
    objective: 'Interpreta una pista para adivinar una posición secreta entre dos extremos.',
    steps: [
      {
        title: 'Descubre los dos extremos',
        body: 'La ronda muestra una escala como “frío — caliente” o “plan barato — plan caro”.',
      },
      {
        title: 'La persona guía da una pista',
        body: 'Solo ella conoce el punto secreto de 0 a 100 y lo describe hablando, sin decir el número.',
      },
      {
        title: 'El resto coloca su apuesta',
        body: 'Cada participante mueve su marcador al lugar de la escala que mejor encaja con la pista.',
      },
      {
        title: 'Revelad y medid la distancia',
        body: 'Aparecen el objetivo y todas las apuestas. Cuanto más cerca estés, más puntos recibes.',
      },
    ],
    victory:
      'La cercanía concede de 0 a 4 puntos. La guía rota cada ronda y gana quien llegue antes al objetivo de puntos.',
    keyRule:
      'La persona guía no coloca una apuesta en su propia ronda; su trabajo es dar una pista útil para todo el grupo.',
  },
  musical: {
    title: 'Musical',
    kind: 'Música y oído',
    mark: '♪',
    objective: 'Reconoce artista y canción antes de que el fragmento se haga largo.',
    steps: [
      {
        title: 'Escucha el primer corte',
        body: 'Empiezas con 2 segundos. Puedes repetir el fragmento sin gastar una oportunidad.',
      },
      {
        title: 'Escribe tu respuesta',
        body: 'Indica artista y canción; el año es opcional y sirve como dato extra de comprobación.',
      },
      {
        title: 'Pide más segundos',
        body: 'Si fallas, el anfitrión puede abrir 5, 10 y hasta 20 segundos para toda la sala.',
      },
      {
        title: 'Corrección y siguiente ronda',
        body: 'El primer acierto se lleva los puntos de ese corte. Si nadie acierta, se revela la canción.',
      },
    ],
    victory:
      'Gana quien acumule más puntos tras las canciones configuradas. Los aciertos tempranos valen 5, 4, 3 o 2 puntos.',
    keyRule:
      'La respuesta permanece oculta hasta acertar o llegar al último fragmento; el servidor decide quién llegó primero.',
  },
  laronda: {
    title: 'La Ronda',
    kind: 'Cartas y pique',
    mark: '€',
    objective:
      'Conserva más ahorros que el resto mientras la mesa llena una cuenta común de tapas, vino y extras.',
    steps: [
      {
        title: 'Añade algo a la cuenta',
        body: 'En tu turno juega una tapa legal, vino o una carta especial. Las tapas deben igualar o superar el precio anterior de su tipo.',
      },
      {
        title: 'Decide cuándo pedir la cuenta',
        body: 'Cuando ya se haya jugado al menos una carta por persona —o no puedas jugar— puedes cerrar los pedidos.',
      },
      {
        title: 'Elige cómo pagar',
        body: 'Quien pide la cuenta puede asumirla, compartirla a medias o repartirla si tiene la carta necesaria.',
      },
      {
        title: 'Responde y prepara otra ronda',
        body: 'La mesa puede añadir propinas. Después se paga, se descarta y empieza una ronda nueva con una mano mayor.',
      },
    ],
    victory:
      'Cuando alguien se queda sin ahorros tras un pago, la partida termina. Gana quien conserve más dinero.',
    keyRule: 'Pedir la cuenta no significa librarte de ella: por defecto la paga quien la pide.',
  },
} satisfies Record<GameId, GameGuide>;
