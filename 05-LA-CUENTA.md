# La Cuenta en Ronda: investigación y alcance web

Investigación cerrada el **14 de agosto de 2026**. Este documento define cómo
encajaría el juego en la web actual; no autoriza el uso de su nombre, textos ni
ilustraciones.

## Decisión ejecutiva

**Sí encaja muy bien en Ronda**, especialmente en el formato actual de una sala
compartida donde cada persona usa su móvil y una tele o tableta puede actuar como
mesa pública. No debe implementarse como uno de los modos sociales existentes:
necesita un módulo propio porque tiene mazo privado, turnos, efectos persistentes,
una cuenta común y una fase de pago con respuestas.

La versión inicial debe ser:

- para **3–8 participantes humanos**, reunidos en la misma mesa;
- fiel a la **segunda edición de 2025** del reglamento;
- sin bots, matchmaking, chat, cuentas de usuario, variantes ni compras;
- jugable enteramente desde los móviles, con `/mesa` opcional;
- publicada con el nombre y material de *La Cuenta* solo si existe licencia o
  autorización escrita de 2Tomatoes Games.

Sin licencia, la alternativa segura de producto no es copiar las cartas cambiando
solo los dibujos: sería diseñar un modo original con otro nombre, tema, baraja,
textos, balance y presentación, y revisarlo antes de publicarlo.

## Identificación y señales de popularidad

El juego investigado es **La Cuenta**, diseñado por Litus/Carles Carreras,
ilustrado por Ariadna Altimira de los Reyes y editado por 2Tomatoes Games. La
editorial indica 3–8 participantes y partidas de 10–20 minutos. La edición
multilingüe figura como publicada en 2025 y el reglamento de segunda edición lleva
copyright de 2025.

Hay señales razonables de tracción: reseñas desde el verano de 2025, disponibilidad
en comercios de varios países y una pieza de Cadena SER de julio de 2026 que lo
describe como uno de los grandes fenómenos editoriales de los últimos meses. No se
han encontrado cifras públicas de ventas, usuarios o tiradas. Por tanto, se puede
hablar de **tracción editorial y mediática**, no cuantificar el “boom”.

Fuentes principales:

- [Ficha y reglamentos de 2Tomatoes Games](https://2tomatoesgames.com/es/la-cuenta-8437027014796.html)
- [Reglamento de segunda edición](https://www.connexxion24.com/downloads/anleitungen/la-cuenta-spielregeln-auf-englisch-2.pdf)
- [Ficha de la edición 2025 en BoardGameGeek](https://boardgamegeek.com/boardgameversion/743131/catengfregerspa-edition)
- [Cadena SER: fenómeno editorial, julio de 2026](https://cadenaser.com/cmadrid/2026/07/13/tres-juegos-de-mesa-para-llevar-a-cualquier-parte-ser-madrid-sur/)
- [Reseña y explicación de Gameplay Mini](https://gameplaymini.com/la-cuenta-juego-de-mesa-2-tomatoes/)

## Cómo funciona el juego físico

### Objetivo y preparación

El grupo recorre bares; cada bar es una ronda. En cada ronda se añaden tapas,
vino y efectos a una cuenta común. Alguien acaba pagándola y pierde esa cantidad
de sus ahorros. La partida termina al final de un pago en el que al menos una
persona queda con ahorros iguales o inferiores a cero. Gana quien conserva más.

El juego contiene:

- 48 cartas de tapa, repartidas entre carne, pescado y vegetal;
- 10 cartas de vino;
- 42 cartas especiales;
- 20 fichas de aumento de mano, con caras `+1` y `+2`.

Cada persona empieza con cinco cartas. Sus ahorros dependen del tamaño del grupo:

| Participantes | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ahorros | 900 € | 1.000 € | 1.100 € | 1.200 € | 1.300 € | 1.400 € |

Empieza quien haya pagado una cuenta real más recientemente. Para la web se
sustituirá por el anfitrión en la primera ronda para que el criterio sea verificable.

### Turno y cartas normales

En su turno, la persona activa juega una carta y **no roba** después. La mano se
va agotando durante la ronda.

- **Tapas:** hay una pila por tipo. La primera tapa abre la pila con cualquier
  precio; las siguientes deben ser del mismo tipo y tener precio igual o superior
  al máximo de esa pila.
- **Vino:** se puede jugar siempre, salvo que un Café ya haya cerrado los pedidos.
  Se agrupa de cinco en cinco. El coste total de un grupo con 1, 2, 3, 4 o 5 vinos
  es 30 €, 60 €, 120 €, 180 € o 240 €. El sexto abre un segundo grupo.
- **Pedir la cuenta:** es obligatorio si la persona activa no tiene ninguna
  jugada legal. También se puede pedir voluntariamente, pero solo después de que
  la ronda tenga al menos tantas cartas jugadas como participantes.

### Cartas especiales de la segunda edición

La distribución oficial suma las 42 cartas especiales:

| Carta | Copias | Momento | Efecto |
| --- | ---: | --- | --- |
| Plato quemado | 8 | Turno | Cierra una pila de tapas durante la ronda; en segunda edición vale 0 €. |
| Cambio de sentido | 4 | Turno | Invierte el orden para lo que queda de ronda. |
| Premium | 4 | Junto a tapa o plato quemado | Duplica el precio de esa carta; ambas se juegan en una acción atómica. |
| Toilette | 5 | Turno | Hasta el siguiente turno no se puede ser objetivo, pedir ni pagar la cuenta. |
| Café | 10 | Turno | Requiere una tapa de cada tipo; desde entonces solo siguen siendo jugables Café y Toilette antes del pago. Vale 40 €. |
| Tarta de cumpleaños | 1 | Turno | Durante la ronda permite pasar y evita pedir o pagar. Vale 40 €. |
| A medias | 3 | Tras pedir la cuenta | Quien la pidió comparte el pago al 50 % con una persona elegible. |
| A pachas | 1 | Tras pedir la cuenta | Divide el pago entre todas las personas elegibles. |
| Propina | 6 | Tras pedir la cuenta | Añade a la cuenta el precio de la tapa más barata. |

Las personas en el Toilette o protegidas por cumpleaños no pueden ser elegidas
para pagar. El reglamento indica que, tras pedir la cuenta, se pueden jugar las
cartas especiales correspondientes antes de efectuar el cobro.

### Pago y siguiente ronda

Se calcula la cuenta, se aplican las cartas posteriores y se descuentan los pagos.
Un importe final negativo se trata como cero. Si nadie queda sin ahorros:

- si se habían jugado al menos tantas cartas como participantes, quien pidió la
  cuenta puede descartar las cartas que no quiera y aumenta su límite de mano en
  uno, hasta un máximo de diez;
- si la cuenta fue forzada antes de alcanzar ese número, descarta toda su mano y
  no aumenta su límite;
- todo el mundo roba hasta su límite (`5 + aumentos`);
- quien pidió la cuenta comienza el siguiente bar.

Si esa persona no tiene ninguna jugada legal al empezar el nuevo bar, descarta la
mano completa, vuelve a llenarla y empieza de nuevo. Es una corrección automática,
no un nuevo pago.

## Ambigüedades del reglamento y decisión digital

El reglamento físico es deliberadamente ligero y deja acuerdos que una mesa puede
resolver hablando. El servidor no puede dejarlos implícitos. El MVP adoptará estas
reglas deterministas:

1. **Edición canónica:** segunda edición de 2025. No se mezclan reglas o valores de
   fichas antiguas ni cartas promocionales de otras ediciones.
2. **Inicio:** empieza el anfitrión; después, siempre quien pidió la cuenta, incluso
   cuando el pago se compartió.
3. **Empate final:** victoria compartida. La regla física de mirar el efectivo real
   que lleva cada persona no se traslada a una aplicación.
4. **Dinero:** entero en céntimos, nunca `float`. Al dividir a pachas, las partes son
   iguales al céntimo y quien pidió la cuenta absorbe el céntimo o céntimos de resto.
5. **Saldo insuficiente:** se conserva el saldo negativo para el resultado y se
   termina la partida después de resolver el pago completo.
6. **Premium:** se envía junto a su tapa o plato quemado en una sola acción. No puede
   quedarse “pendiente” entre dos peticiones de red.
7. **Toilette:** se retira la protección al comenzar el siguiente turno de su dueño;
   ese turno se juega normalmente.
8. **Cumpleaños:** añade una acción `pasar` que no pide la cuenta. La protección acaba
   con la ronda.
9. **A medias y A pachas:** solo puede jugar una de las dos quien pidió la cuenta; son
   alternativas excluyentes.
10. **Propina:** puede jugarla cualquier participante que la tenga. La propina se
    calcula con el menor precio efectivo de una tapa tras Premium. Si no hay tapa,
    no es jugable.
11. **Orden tras pedir la cuenta:** primero quien la pidió elige pagar solo, A medias
    o A pachas. Después hay prioridad por turnos para jugar Propina o pasar. Cada
    Propina reinicia la cuenta de pases; el pago se ejecuta cuando todas las personas
    elegibles pasan consecutivamente. Esto evita carreras de red y permite varias
    Propinas de una misma mano.
12. **Cuenta visible:** el total mostrado antes de pedir es una previsualización. El
    importe queda cerrado solo después de las Propinas y antes del reparto.
13. **Descarte del pagador:** en el resumen de ronda, quien pidió la cuenta selecciona
    qué conservar. El resto solo confirma/espera; el servidor rellena todas las manos
    cuando esa selección queda bloqueada.

Las decisiones 4, 10 y 11 deberían validarse con la editorial si se obtiene licencia.
Son las únicas que pueden cambiar resultados de una partida respecto a una
interpretación distinta del reglamento.

## Experiencia web propuesta

### Flujo

```text
catálogo → ficha del juego → crear sala → lobby/QR
                                      ↓
                            pedidos de la ronda
                                      ↓
                    pedir cuenta (voluntaria o forzada)
                                      ↓
                     reparto del pago + propinas + pases
                                      ↓
                         resumen y ajuste de la mano
                               ↙                ↘
                     siguiente bar          fin de partida
```

### Móvil de cada participante

Una sola pantalla de juego, sin navegación ni scroll durante el turno:

- cabecera: bar/ronda, dirección, turno y conexión;
- franja de rivales: apodo, ahorros, cartas restantes, Toilette/cumpleaños y
  desconexión; nunca se muestran cartas ajenas;
- centro: pilas de carne, pescado y vegetal, grupo(s) de vino, efectos y total
  provisional de la cuenta;
- mano privada abajo: cartas grandes, estado jugable/no jugable y explicación
  breve al tocar una carta bloqueada;
- acción primaria contextual: `Jugar`, `Pedir la cuenta`, `Pasar`, `Elegir reparto`,
  `Añadir propina` o `Confirmar descartes`.

No se debe exigir arrastrar: tocar y confirmar es la interacción accesible. El
arrastre puede mantenerse como atajo visual. Al jugar Plato quemado se elige una de
las pilas abiertas; al jugar A medias se elige una persona elegible.

### Mesa pública opcional (`/mesa`)

La mesa muestra la cuenta con mucho más peso visual que las manos:

- las tres pilas de tapas y sus topes actuales;
- vinos agrupados y su coste acumulado;
- total provisional y animación del ticket al pedir la cuenta;
- turno, dirección, ahorros y estados públicos;
- durante el pago, modalidad elegida, Propinas y desglose por persona;
- resumen de ronda y ganador.

No muestra manos, opciones privadas, cartas descartadas sin jugar ni la existencia
de una carta especial en la mano de alguien.

### Aprendizaje

La ficha `/juegos/la-cuenta` debe explicar el bucle en tres pantallas: “pide”,
“esquiva” y “paga”. La primera partida añade ayudas contextuales, no un tutorial
separado. Cada carta incluye texto accesible y un icono además del color; carne,
pescado y vegetal no pueden distinguirse solo por color.

## Modelo del motor

La máquina de estados recomendada es:

```text
lobby → ordering → settlement → roundEnd → ordering | gameEnd
```

Campos mínimos de `CuentaState`:

- `gameId`, `status`, `phase`, `version`, `rng`, `round`;
- `players[]`: asiento, ahorros en céntimos, mano, aumento `0..5`, estados de
  Toilette/cumpleaños y conexión fuera del motor;
- `deck`, `discard` y manifiesto de las 100 cartas;
- `turnSeat`, `direction` (`1 | -1`) y persona que pidió la cuenta;
- pilas de tapas con carta, precio efectivo y Premium asociado;
- vinos jugados, otras cartas públicas y cierre por Café;
- contador de cartas jugadas en la ronda;
- `settlement`: modalidad, objetivo de A medias, Propinas, prioridad y pases;
- `roundResult`: total, pagos, saldos, descartes y aumento obtenido;
- ganador o lista de ganadores en caso de empate.

Invariantes obligatorias:

- las 100 cartas están exactamente en mazo, descarte, manos o mesa, sin duplicados;
- una vista nunca contiene cartas de otra mano;
- solo el servidor baraja, valida legalidad, avanza turnos y calcula dinero;
- ninguna acción parcial deja Premium, pago o descarte a medio aplicar;
- toda petición usa la versión esperada ya disponible en Ronda.

## Contrato de acciones y vistas

Acciones nuevas recomendadas:

- `playCuentaCard { cardId, targetTapasType?, premiumCardId? }`;
- `askBill`;
- `skipCuentaTurn`;
- `chooseBillMode { mode: 'solo' | 'half' | 'dutch', cardId?, targetPlayerId? }`;
- `playTip { cardId }`;
- `passBillResponse`;
- `confirmCuentaDiscards { cardIds }`;
- reutilizar `nextRound` solo para abandonar el resumen cuando el estado ya está
  completamente resuelto.

La vista del jugador incluye su mano, cartas legales, objetivos legales y acciones
disponibles. La vista de mesa usa el mismo estado público sin `me`. Conviene añadir
eventos específicos (`cuentaCardPlayed`, `billAsked`, `tipAdded`, `billPaid`) para
sonido, animación, registro de partida y diagnósticos sin inferirlos comparando dos
vistas.

## Encaje exacto en este repositorio

### Protocolo

- añadir `la-cuenta` a `GameId` y su `CuentaConfig` a la unión discriminada;
- definir acciones, eventos, errores y vistas propias;
- subir el límite absoluto de sala de 7 a 8;
- ampliar `PublicPlayer.colorIndex` y los tokens visuales para un octavo asiento;
- mantener `CardId` español separado de un `CuentaCardId` semántico, aunque ambos
  sean cadenas en red.

### Motor

Crear `packages/engine/src/games/la-cuenta/` con `cards.ts`, `state.ts`,
`legality.ts`, `billing.ts`, `reducer.ts`, `views.ts`, `index.ts` y pruebas. No
debe entrar en `games/party`: el parecido temático no compensa mezclar máquinas de
estado incompatibles.

El manifiesto exacto de las 48 tapas —identidad, tipo, precio y número de copias— no
aparece completo en el reglamento público. Es un **bloqueo de fidelidad**: hay que
obtenerlo de la editorial o inventar y probar una baraja propia si se hace un juego
independiente. No se debe inferir la distribución viendo fotografías parciales.

### Servidor

- `minPlayersFor('la-cuenta')` debe devolver 3;
- la capacidad máxima real será 8;
- reutilizar salas, versiones, reconexión, persistencia y difusión existentes;
- no necesita una migración SQL porque `game_id` es texto;
- no añadir reloj ni controlador de bots en el MVP;
- conservar una partida si alguien se desconecta; el grupo espera su reconexión.

### Web

- ficha y entrada en el catálogo;
- configuración mínima: solo apodo y sonido; el tamaño se determina por quienes
  entren antes de empezar;
- `CuentaGameScreen`, `CuentaRoundEndScreen` y `CuentaGameEndScreen` propios;
- `CuentaMesaBoard` para la pantalla pública;
- soporte de ocho asientos en móvil y mesa;
- iconos, reverso y cartas con assets licenciados o arte completamente original;
- texto corto de legalidad en cada carta bloqueada y modo de movimiento reducido.

### Estadísticas

Para la primera versión basta con partidas, victorias compartidas, rondas, cuentas
pagadas, euros pagados y mayor cuenta individual. No se publica clasificación global
ni telemetría por carta hasta tener consentimiento y una política de privacidad que
lo cubra.

## Plan de entrega acotado

### Fase 0 — permiso y material canónico

- confirmar por escrito nombre, reglas, textos, ilustraciones y canal de publicación;
- recibir manifiesto de las 100 cartas y assets de producción;
- resolver con la editorial las tres decisiones digitales señaladas arriba.

Sin completar esta fase solo se permite un prototipo local con placeholders, nunca
una ruta pública anunciada como *La Cuenta*.

### Fase 1 — motor y protocolo

- tipos, config 3–8, acciones, vistas y eventos;
- mazo determinista y legalidad de todas las cartas;
- cálculo de cuenta, reparto, aumento de mano y fin de partida;
- pruebas de reglas, conservación de cartas y censura de vistas.

### Fase 2 — partida desde móvil

- catálogo, creación/lobby y pantalla completa;
- turnos, selección de objetivos, pago, descartes y resultados;
- reconexión y errores de versión;
- pruebas completas con 3 y 8 navegadores.

### Fase 3 — mesa pública y pulido

- ticket, pilas, desglose y animaciones;
- accesibilidad, sonido/háptica opcional y movimiento reducido;
- playtest presencial con grupos de 3–4 y 7–8 personas.

## Criterios de aceptación del MVP

- una partida de 3–8 personas puede completarse sin intervención manual;
- todas las cartas de segunda edición tienen legalidad y efecto automatizados;
- ninguna mano ajena aparece en móvil, mesa, logs de cliente ni reconexión;
- el mismo `seed` y secuencia de acciones producen el mismo resultado;
- desconectar y recargar durante pedidos, reparto del pago o descarte recupera la
  fase exacta;
- dos acciones sobre la misma versión no se aceptan a la vez;
- los pagos compartidos conservan exactamente el total al céntimo;
- se soportan cero o varias Propinas y todas las combinaciones de protección;
- el límite de diez cartas nunca se supera;
- la UI cabe en un móvil de 360 px de ancho y ocho asientos son legibles en `/mesa`;
- teclado, lector de pantalla y toque permiten completar todas las acciones;
- el juego no se publica con marca o material de terceros sin autorización.

## Fuera del MVP

- bots o modo en solitario;
- juego asíncrono, matchmaking público o chat/voz;
- variantes caseras, barajas personalizadas y expansiones;
- cuentas de usuario, ranking, monedas, anuncios o compras;
- temporizadores por turno;
- editor de cartas;
- clon visual de las cartas físicas sin assets autorizados.

## Puerta legal antes de publicar

La Ley de Propiedad Intelectual española protege las expresiones originales, los
diseños y, cuando es original, el título de una obra; una obra nueva que incorpora
otra preexistente puede necesitar autorización. La EUIPO recuerda además que una
experiencia de juego puede acumular protección por derechos de autor, diseños y
marcas. Esto no es asesoramiento jurídico, pero sí suficiente para fijar una regla
de proyecto: **no reutilizar nombre comercial, ilustraciones, maquetación ni textos
de cartas sin permiso**.

- [Ley de Propiedad Intelectual consolidada, artículos 9 y 10](https://boe.es/buscar/act.php?id=BOE-A-1996-8930)
- [Centro de conocimiento de copyright de EUIPO](https://www.euipo.europa.eu/en/copyright-knowledge-centre)
- [Contacto de 2Tomatoes Games](https://2tomatoesgames.com/es/content/contacto)
