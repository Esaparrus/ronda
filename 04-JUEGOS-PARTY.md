# Modos de mesa para Ronda

Este documento concreta los cuatro modos sociales que se van a añadir a Ronda.
La web reparte información privada, arbitra las reglas y enseña el resultado en
el centro; la conversación y las decisiones del grupo siguen ocurriendo en la
mesa.

## Decisiones comunes

- La partida se crea con una sala y QR, como los juegos de cartas actuales.
- Cada móvil recibe solo sus secretos. La pantalla `/mesa` y la zona pública
  de cada móvil muestran únicamente información ya revelada.
- Las respuestas se envían al servidor. El servidor es quien revela, puntúa y
  decide el orden de llegada.
- Una ronda queda bloqueada mientras se revela el resultado. Después se pulsa
  «Siguiente»; basta con que lo haga una persona para evitar esperas eternas.
- Primera versión: todos contra todos. Los equipos quedan como variante
  posterior para los modos que los soporten sin cambiar sus reglas básicas.
- Los textos, preguntas, extremos y colores serán contenido propio de Ronda;
  no se copian cartas ni listas protegidas de otros juegos.

## 1. Orden

Nombre de interfaz: **Orden**. Es el modo de cartas simultáneas que sustituye
la necesidad de tener una baraja numerada.

### Flujo

1. Se generan cartas propias con los números del 1 al 100 y el anfitrión elige
   cuántas recibe cada persona en cada reparto.
2. Todos pueden jugar en cualquier momento. No hay turnos.
3. Un jugador arrastra una carta hacia la mesa o la toca para jugarla. La carta
   desaparece de su mano y aparece boca arriba en el centro para todos.
4. Las cartas deben salir de menor a mayor. El servidor compara la carta con
   la última válida que ya está en el centro.
5. Si dos móviles juegan a la vez, gana la petición que el servidor procese
   primero. La otra ve una versión antigua y recibe `STALE_VERSION`; no se
   aceptan dos primeras cartas ni se usa el reloj del móvil.
6. Si se juega una carta menor que la última válida, se marca como fallo y se
   descarta; no hay vidas y la ronda continúa. Si se vacían todas las manos,
   el reparto se completa.
7. El anfitrión puede cambiar el número de cartas del siguiente reparto.
   Cualquier jugador puede pulsar «Repartir»; la partida termina cuando ya no
   queda un reparto completo posible con los números restantes.

### Estado público y privado

- Público: ronda, cartas del reparto, cartas restantes del mazo, última carta
  válida, cartas ya jugadas, fallos y jugadores que aún conservan cartas.
- Privado: números de la mano de cada jugador.
- No hay ganador individual: es cooperativo. El resultado final es la ronda
  alcanzada y las cartas restantes del mazo.

### Decisiones de producto iniciales

- 2–7 jugadores.
- 1–10 cartas iniciales por persona.
- Sin vidas: los fallos solo quedan visibles y la carta fallida se descarta.
- La carta que provoca el fallo sí se revela en el centro.
- Tocar una carta también la juega para que el modo sea accesible; arrastrarla
  hacia arriba será el gesto principal en móvil.

## 2. Colores

Nombre de interfaz: **Colores**.

1. La web muestra una pregunta: «¿De qué color es…?» o «¿Qué colores tiene…?».
2. Cada jugador selecciona uno o varios colores en privado.
3. Las respuestas se revelan a la vez.
4. Se muestra la respuesta válida y la puntuación depende de la cercanía del
   color: 4 exacto, 3/2/1 parecido y 0 lejano.
5. La partida termina al alcanzar el objetivo de puntos elegido (con un máximo
   de seguridad de rondas).

La batería inicial debe tener al menos 100 preguntas, con preguntas de una
respuesta y preguntas de varias respuestas. Los colores serán fichas visuales
con nombre accesible, no texto libre.

## 3. Mayoría

Nombre de interfaz: **Mayoría**.

1. Sale una pregunta subjetiva: «Nombra una salsa», «¿Qué se come en un
   cine?» o «¿Cuál es el mejor sabor de helado?».
2. Todos escriben una respuesta sin verla de los demás.
3. Se revelan las respuestas juntas y se agrupan ignorando mayúsculas,
   tildes, espacios duplicados y puntuación básica.
4. Las respuestas más repetidas forman la mayoría y cada jugador que haya
   dado una de ellas gana un punto.
5. Si hay empate entre varias respuestas máximas, esa ronda no tiene mayoría y
   no puntúa.
6. La partida termina al alcanzar el objetivo de puntos elegido (con un máximo
   de seguridad de rondas).

La batería inicial debe tener al menos 100 preguntas, separadas por temas:
comida, planes, viajes, cultura popular, vida cotidiana y preguntas de la
propia cuadrilla. Más adelante se podrán añadir preguntas personalizadas para
cada grupo sin cambiar el motor.

## 4. Escala

Nombre de interfaz: **Escala**. La mecánica es la de una línea entre dos
extremos, similar a los juegos de «leer la mente», pero con contenido y reglas
propias.

1. Se muestra un eje, por ejemplo «frío — caliente», «aburrido — divertido» o
   «plan de 5 € — plan de 100 €».
2. Un jugador recibe en privado una posición secreta entre 0 y 100.
3. Ese jugador da una pista hablando con el grupo, sin enseñar el número.
4. El resto coloca su estimación en una barra de 0 a 100 en su móvil.
5. Se revelan el objetivo y las estimaciones. Cada jugador puntúa por cercanía:
   4 puntos a 0–10, 3 a 11–20, 2 a 21–30, 1 a 31–40 y 0 más lejos.
6. El jugador que conoce el objetivo rota cada ronda y no estima esa ronda.
7. La partida termina al alcanzar el objetivo de puntos elegido (con un máximo
   de seguridad de rondas).

La batería inicial debe tener al menos 80 pares de extremos, con categorías de
comida, planes, personalidad, precio, clima, ocio y situaciones absurdas. Se
evitarán por defecto ejes que conviertan identidades o características
personales en una broma.

## Orden de construcción

1. **Orden**: estado privado, acción simultánea, control de versión, carta
   central, reparto configurable y práctica contra IA.
2. **Base social compartida**: fases `input/reveal`, respuestas privadas,
   revelación sincronizada, botón de siguiente y puntuación.
3. **Colores**: selector visual y banco de preguntas.
4. **Mayoría**: respuesta de texto, normalización y cálculo de empate.
5. **Escala**: objetivo privado, barra de estimación, rotación del jugador guía
   y puntuación por distancia.
6. Pruebas con un grupo de 6–7 personas, primero en una mesa sin tele y luego
   con `/mesa` como pantalla pública.

## No se implementa en esta tanda

- Intruso o roles secretos de deducción: no aporta suficiente frente a las
  aplicaciones que ya existen.
- Modo online específico para Orden: pierde la gracia porque depende de hablar
  y reaccionar juntos en el mismo sitio.
- Equipos, preguntas creadas por usuarios y contenido adulto como variantes
  posteriores, una vez probado el flujo básico.
