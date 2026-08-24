# RONDA — Roadmap de juegos independientes y modo meta

> Documento de producto para los juegos que se incorporarán después de los
> juegos de cartas actuales. No es todavía un contrato de implementación. Antes
> de programar cada juego, su paquete correspondiente congelará los tipos, las
> reglas y los datos.

## Decisión principal

Los juegos de **Banderas**, **Cifras**, **Precio justo**, **Quién lo haría** y
**Completa la frase** son juegos independientes. Cada uno conserva su propia
partida completa, sus reglas y su puntuación. No se convertirán automáticamente
en un juego mixto ni se mezclará cualquier juego arbitrariamente dentro de una
sala normal.

Cada uno tendrá:

- su propia ficha en el catálogo;
- su propia configuración;
- su propio motor de puntuación;
- su propio conjunto de preguntas o contenidos;
- su propia pantalla de partida y de resultados;
- modo competitivo y, cuando tenga sentido, modo individual.

Solo compartirán la infraestructura de Ronda: sala, código o QR, anfitrión,
temporizador, reconexión, pantalla /mesa, estado autoritativo del servidor y
revancha.

La sala normal se crea eligiendo **un solo juego**. No habrá un selector
«mezcla estos cinco juegos» dentro del flujo de partidas independientes.

Además se planifica un modo de juego nuevo y separado: **La Gran Ronda**. No es
un selector genérico ni una segunda pantalla para jugar las partidas completas.
Es una partida de tablero con economía, movimiento por casillas y minijuegos
breves. Reutilizará contenido y variantes competitivas de algunos juegos
existentes mediante un contrato específico, sin alterar las reglas de sus
versiones independientes.

## Orden de construcción

El orden previsto es deliberado:

1. **Banderas** — el juego más sencillo de probar y de validar.
2. **Cifras** — reutiliza el flujo de respuestas simultáneas, pero necesita una
   puntuación por error relativo y datos bien definidos.
3. **Precio justo** — estimación de precios con producto visual, precio de
   referencia fijo y partidas fáciles de entender.
4. **Quién lo haría** — juego social sin respuesta correcta objetiva.
5. **Completa la frase** — requiere más trabajo editorial, normalización de
   respuestas y control de derechos sobre los textos.
6. **Playtest y pulido común** — revisar temporizadores, resultados, contenido,
   accesibilidad y comportamiento con móviles reales.
7. **La Gran Ronda** — primero un prototipo vertical con un tablero y un grupo
   pequeño de minijuegos breves; después se ampliarán los mapas, los eventos y
   las variantes compatibles.

No se implementará el siguiente juego hasta que el anterior tenga preguntas
reales, tests del motor y una partida completa jugable en una sala.

La Gran Ronda se empezará cuando exista un primer conjunto estable de
minijuegos competitivos cortos. No bloqueará ni sustituirá la entrega de los
juegos independientes: será un modo adicional con su propio contrato y su
propia definición de terminado.

## Flujo común de los juegos de preguntas

~~~text
catálogo → configuración → lobby/QR → pregunta → respuesta privada
        → bloqueo o fin del tiempo → revelación → puntuación → siguiente ronda
        → resultado final → revancha
~~~

Reglas comunes:

- Todos reciben la misma pregunta y el mismo orden de preguntas.
- El servidor decide cuándo empieza y termina cada fase.
- Una respuesta enviada queda bloqueada y no se puede editar.
- Las respuestas privadas no viajan a otros jugadores antes de la revelación.
- El temporizador es configurable por partida: sin límite, 10, 20 o 30 segundos
  como valores iniciales.
- El número de rondas es configurable. Valores iniciales: 5, 10 o 20.
- El tiempo sirve para dar ritmo, no para convertir el juego en una carrera de
  dispositivos. La velocidad no añade puntos salvo que un contrato futuro lo
  decida expresamente.
- El modo de bebida no forma parte de las reglas de puntuación de estos juegos.
  La mesa puede usar sus propias reglas externas.

---

## Juego 1 — Banderas

### Idea

Se muestra una bandera y el jugador debe identificarla escogiendo una de cuatro
opciones. No se escribe la respuesta en la primera versión: es un quiz visual
rápido y relajado.

### Ronda

1. Aparece una bandera grande.
2. Debajo aparecen cuatro botones con nombres.
3. El jugador pulsa una respuesta y la confirma con «OK».
4. La respuesta queda bloqueada. El primer bloqueo abre una cuenta atrás de 5
   segundos para el resto de jugadores.
5. Cuando todos responden o se acaba el tiempo, se revela la correcta.
6. Se suma un acierto o un fallo y comienza la siguiente bandera.

En el móvil se muestran los cuatro botones. En /mesa se muestra la bandera,
el temporizador y, después del bloqueo, el resultado de la pregunta.

### Opciones de respuesta

Las cuatro opciones no se elegirán al azar sin control editorial. Cada pregunta
llevará un grupo de distractores adecuado:

- países de la misma zona geográfica;
- países del mismo continente;
- banderas con colores o composición parecidos;
- banderas que suelen confundirse entre sí;
- comunidades autónomas de España;
- provincias o territorios, solo cuando el paquete lo indique claramente;
- selecciones nacionales, sin escudos ni logotipos de federaciones.

Una pregunta de banderas de comunidades autónomas no mezclará sin avisar una
comunidad con tres países. El tipo de entidad será coherente dentro de cada
paquete.

### Configuración

- España — comunidades autónomas;
- Europa;
- África;
- América;
- Asia y Oceanía;
- Mundo;
- Banderas parecidas;
- dificultad fácil, normal o difícil;
- número de preguntas;
- temporizador.

### Competitivo

Regla única y visible:

- respuesta correcta: **1 punto**;
- respuesta incorrecta o tiempo agotado: **0 puntos**;
- bloquear antes no da puntos extra, pero sí reduce a 5 segundos la ventana
  disponible para quienes aún están pensando;
- gana quien consigue más aciertos al terminar las rondas.

No habrá bonus por responder antes. Si hay empate, se mostrará empate. El
desempate será una opción posterior, no una obligación del MVP.

### Contenido y validación

Cada pregunta tendrá:

- bandera original en SVG o un recurso con licencia clara;
- entidad correcta;
- exactamente tres distractores;
- continente, región y tipo de entidad;
- nivel de dificultad;
- explicación breve opcional de por qué puede confundirse;
- alias válidos del nombre, aunque en el juego se use selección por botones.

La baraja inicial debe evitar preguntas injustas: si una diferencia solo se ve
con zoom, irá a experto o no se publicará.

### Modo individual

- 20 preguntas por sesión;
- porcentaje de aciertos;
- racha máxima;
- desglose por región y dificultad;
- modo contrarreloj opcional.

---

## Juego 2 — Cifras

### Idea

Se muestra una pregunta cuantitativa y cada jugador escribe una estimación.
Gana quien se acerque más a lo largo de las rondas, no necesariamente quien
acierte una cifra exacta.

### Ronda

1. Aparece la pregunta.
2. Se muestra la unidad obligatoria: metros, kilómetros, habitantes, etc.
3. Cada jugador introduce una cifra.
4. La respuesta se confirma y queda bloqueada.
5. Se revela el valor de referencia.
6. Se calcula el error y se asignan los puntos.

El campo será numérico, con teclado adecuado para móvil y separadores tolerantes
para miles. La unidad no se escribe libremente: la pregunta la fija.

### Categorías iniciales

- altura de torres, edificios y monumentos;
- longitud de puentes, ríos y carreteras;
- distancia entre dos ciudades;
- habitantes de países y ciudades;
- superficie de países, islas y parques;
- profundidad de lagos, mares y cuevas;
- altura de montañas;
- capacidad de estadios y edificios;
- peso o tamaño de animales y objetos.

No se utilizarán fechas como respuesta ni como tema de pregunta.

### Definiciones obligatorias

La pregunta debe fijar qué se está midiendo:

- distancia entre ciudades: en línea recta o por carretera, nunca ambiguo;
- altura: hasta la punta, antena o tejado según la definición elegida;
- población: valor de referencia con fuente y tolerancia;
- longitud: recorrido total, tramo visible o distancia oficial;
- superficie: unidad y perímetro geográfico exactos.

La fecha de actualización de un dato de población se guardará en los metadatos
para mantener el contenido, pero no aparecerá en el texto de la pregunta.

### Puntuación

No se usará la diferencia absoluta. Se usará el error relativo:

~~~text
errorRelativo = abs(respuesta - valorCorrecto) / valorCorrecto
~~~

La primera curva de puntuación propuesta es:

| Error relativo | Puntos |
|---:|---:|
| 0 % | 100 |
| hasta 1 % | 98 |
| hasta 5 % | 90 |
| hasta 10 % | 80 |
| hasta 25 % | 50 |
| 50 % o más | 0 |

La curva queda parametrizada para poder ajustarla por playtest sin reescribir
las preguntas. Una pregunta puede llevar un perfil de precisión normal,
generosa o exigente si la naturaleza del dato lo exige.

### Competitivo

- todos responden las mismas preguntas;
- se suman los puntos de cada ronda;
- gana quien tenga más puntos al llegar al número configurado de rondas;
- no hay bonus de velocidad;
- se muestra la respuesta de cada jugador y su porcentaje de error.

### Modalidad Ordena

Es una modalidad de Cifras, no un juego independiente. Se muestran entre tres
y cinco elementos y el jugador debe colocarlos en orden ascendente o
descendente:

- alturas de edificios o montañas;
- población de ciudades o países;
- distancias entre ciudades;
- superficie de territorios;
- longitudes o profundidades.

En el móvil se reordenan con arrastrar y soltar o con controles de subir y
bajar. Todos reciben el mismo conjunto y la misma dirección: «de menor a mayor»
o «de mayor a menor».

Puntuación inicial:

- 1 punto por cada elemento colocado en su posición correcta;
- 1 punto extra si el orden completo es correcto;
- sin bonus de velocidad.

La clasificación se calcula sumando esos puntos a lo largo de las rondas. La
modalidad podrá jugarse sola o mezclarse con preguntas de estimación dentro de
una partida de Cifras si el anfitrión lo activa.

### Modo individual

- práctica por categoría;
- diez preguntas con puntuación de precisión;
- racha de estimaciones dentro del 10 %;
- récord personal;
- explicación del valor correcto después de cada pregunta.

---

## Juego 3 — Precio justo

### Idea

Se muestra un producto con una imagen y una ficha sencilla. Cada jugador
introduce cuánto cree que cuesta. Al terminar las rondas, gana quien acumula más
puntos por acercarse al precio real.

La experiencia debe parecer una partida de estimación, no una tienda: no se
mostrará una página de Amazon completa ni se permitirá comprar desde la pantalla
de juego.

### Ronda

1. Aparece la imagen del producto.
2. Se muestran un nombre breve y una categoría.
3. Cada jugador introduce un precio en euros.
4. La respuesta se confirma y queda bloqueada.
5. Se revela el precio de referencia.
6. Se muestran la diferencia, el porcentaje de error y los puntos.

Todos reciben el mismo producto, la misma variante y el mismo precio de
referencia. El número de rondas y el temporizador son configurables.

### Catálogo y precio de referencia

La pregunta no usará un precio en directo que pueda cambiar durante la partida.
Cada producto tendrá un registro estable con:

- título breve;
- imagen;
- categoría;
- marca y modelo, si se decide mostrarlo;
- variante exacta: tamaño, color, capacidad o pack;
- marketplace y moneda;
- precio objetivo en céntimos;
- vendedor u oferta de referencia;
- condiciones incluidas o excluidas, como envío, cupones o suscripción;
- fuente y fecha de captura para mantener el catálogo.

La partida usará inicialmente precio en España, en euros, con IVA incluido,
sin cupones personalizados, sin Prime y sin gastos de envío salvo que la
pregunta diga expresamente lo contrario.

### Imágenes y Amazon

El juego puede inspirarse en el aspecto de un producto visto en Amazon, pero no
debe copiar su página, marca visual ni utilizar imágenes descargadas sin
permiso. Se priorizarán imágenes propias, del fabricante o con licencia.

Si se obtiene autorización y una cuenta adecuada, se podrá integrar el catálogo
mediante la API oficial de Amazon. El dato recibido seguirá congelándose en una
pregunta para que todos jueguen con el mismo precio, porque el precio mostrado
puede variar según marketplace, dirección, vendedor u oferta.

### Categorías iniciales

- hogar y cocina;
- tecnología sencilla;
- ocio y juegos;
- deporte;
- accesorios;
- productos absurdos o curiosos;
- productos baratos;
- productos de precio medio.

Las categorías no deben revelar demasiado el precio. Una pregunta de «producto
barato» será un modo configurado, no una etiqueta visible por defecto si hace
demasiado fácil la estimación.

### Puntuación

No se usará solo la diferencia en euros: fallar 2 € en un producto de 5 € es
muy distinto de fallar 2 € en uno de 200 €. Se calculará el error relativo:

~~~text
errorRelativo = abs(precioPropuesto - precioReferencia) / precioReferencia
~~~

Curva inicial:

| Error relativo | Puntos |
|---:|---:|
| 0 % | 100 |
| hasta 5 % | 90 |
| hasta 10 % | 80 |
| hasta 20 % | 60 |
| hasta 35 % | 30 |
| 50 % o más | 0 |

La curva podrá ajustarse con playtests. No habrá bonus por velocidad en la
primera versión.

### Competitivo e individual

- todos estiman los mismos productos;
- se suman los puntos de cada ronda;
- gana quien tenga más puntos al terminar;
- se muestra el precio de cada jugador y su porcentaje de error;
- el modo individual guarda precisión media, mejor racha y récord personal.

Más adelante puede añadirse una variante «sin pasarse», donde solo puntúan las
respuestas que no superen el precio real, pero no forma parte del primer
contrato.

---

## Juego 4 — Quién lo haría

### Idea

Juego social de votación. Aparece una pregunta y cada persona selecciona a uno
de los participantes pulsando su botón.

### Ronda

1. Se muestra una pregunta para todos.
2. Aparecen botones con los nombres de los jugadores.
3. Cada jugador pulsa una persona.
4. El voto queda oculto y bloqueado.
5. Al terminar el tiempo, se muestran los votos agrupados.
6. Se pasa a la siguiente pregunta.

No hay una respuesta correcta objetiva y no se elimina a nadie.

### Configuración

- número de rondas;
- temporizador;
- permitir o no votarse a uno mismo, desactivado por defecto;
- paquete de preguntas;
- mostrar resultados después de cada pregunta o solo al final.

Paquetes previstos:

- Ligero: situaciones absurdas y fáciles;
- Fiesta: planes, amigos y salir;
- Incómodo: preguntas que generan discusión y vergüenza;
- Parejas: preguntas sobre la relación;
- Adulto: contenido explícitamente separado y controlado.

### Resultado final

No se llamará necesariamente «puntuación», porque lo que se mide son votos
recibidos. El resumen puede mostrar:

- quién ha sido elegido más veces;
- quién ha sido elegido menos veces;
- quién ha recibido más votos en una sola ronda;
- cuántos votos ha recibido cada persona;
- qué preguntas han producido empate.

El juego está pensado para la conversación y la risa. La mesa puede aplicar sus
propias reglas sociales, pero la aplicación no asigna automáticamente acciones
ni bebida a ningún jugador.

### Modo competitivo opcional

Si se quiere una clasificación, cada jugador gana un punto cuando vota a la
persona que acaba siendo la más votada de esa ronda. Es un modo de «leer al
grupo», no una respuesta verdadera.

El modo social sin puntos será el predeterminado.

### Seguridad de contenido

- botón para descartar una pregunta;
- no eliminar jugadores;
- no preguntas que obliguen a revelar información privada;
- no retos físicos, llamadas, mensajes ni contacto no consentido;
- paquetes de contenido claramente separados.

---

## Juego 5 — Completa la frase

### Idea

Se muestra una frase con un hueco y el jugador debe completar una palabra o
una expresión breve que tenga sentido.

No se buscarán huecos arbitrarios de artículos, letras o palabras irrelevantes.
La palabra retirada debe ser una parte reconocible de la frase: un verbo,
sustantivo, adjetivo o expresión con contenido.

Ejemplos de formato:

- «En abril, aguas ____».
- «Más vale pájaro en mano que ciento ____».
- «El hábito no hace al ____».
- «No hay mal que por bien no ____».

### Paquetes de contenido

- refranes españoles;
- expresiones populares;
- frases de dominio público;
- frases originales creadas para el juego;
- frases licenciadas, si en el futuro se obtiene permiso.

No se utilizarán letras de canciones, diálogos de películas, frases de libros
modernos ni citas cuya licencia no esté clara.

### Respuestas

Cada pregunta tendrá una respuesta canónica y una lista de respuestas
aceptadas. Se normalizarán:

- mayúsculas y minúsculas;
- tildes;
- signos de puntuación;
- singular y plural cuando proceda;
- variantes ortográficas previamente aprobadas.

Si una frase admite varias respuestas razonables, no entrará en el paquete
competitivo. Podrá existir más adelante un modo creativo en el que vote la mesa,
pero no será parte de la primera versión.

### Competitivo

- respuesta aceptada: 1 punto;
- respuesta no aceptada o tiempo agotado: 0 puntos;
- número de rondas configurable;
- gana quien acumula más puntos.

### Modo individual

- racha de frases acertadas;
- práctica por tipo de frase;
- pista opcional que resta puntos;
- revisión de respuestas falladas.

---

## Modo meta — La Gran Ronda

### Idea y posición dentro del producto

**La Gran Ronda** es una partida nueva inspirada en los juegos de tablero de
fiesta. El grupo entra en una sala, conserva los nombres que ya ha introducido
y recorre un mapa tirando dados. Las casillas producen recursos o cambian la
ruta. Al terminar el movimiento de todos los jugadores se juega un minijuego
breve y se reparten oros.

No se jugarán partidas completas de Chinchón, Mus, Pocha, Brisca o Tute dentro
del tablero. La Gran Ronda tendrá versiones cortas y competitivas de juegos
adecuados para durar segundos, no otra capa que intente controlar todos los
turnos y reglas de una partida clásica.

La primera versión será individual. Los equipos y las reglas especiales se
añadirán solo después de comprobar que el bucle básico funciona con un grupo
real.

### Identidad provisional

El mapa representará una ruta por cuatro zonas inspiradas en los palos de la
baraja: **Oros**, **Copas**, **Espadas** y **Bastos**.

- **Oros**: moneda que se gana en minijuegos y casillas y se gasta en el mapa.
- **Sellos de Ronda**: objetivo principal de la partida.
- **La Gran Ronda**: nombre provisional del modo completo.

Los nombres son provisionales y se validarán con el diseño visual y el primer
playtest. Se buscará una identidad propia de Ronda, sin copiar personajes,
tableros, nombres ni recursos visuales de otros juegos.

### Objetivo y duración

- 3–7 jugadores.
- 15–25 minutos como objetivo inicial.
- 6–8 rondas configuradas por la partida.
- Un solo tablero inicial de aproximadamente 25–30 casillas.
- Gana quien consigue más **Sellos de Ronda**.
- Los oros sirven como desempate y como recurso durante la partida.

En cada tablero habrá una casilla o destino de sello. Cuando un jugador llega a
ella y puede pagar el coste configurado, obtiene el sello. Después, el destino
se mueve a otra posición para obligar a elegir entre el camino más corto y los
caminos que proporcionan más oros. El número de sellos disponibles, el coste y
la posición inicial serán datos de configuración del tablero, no reglas
dispersas por la interfaz.

### Flujo de una ronda

~~~text
lobby → preparar tablero → turno de movimiento de cada jugador
      → resolver casillas → seleccionar minijuego compatible
      → jugar variante corta → revelar clasificación
      → repartir oros → siguiente ronda → resultado final
~~~

1. El servidor fija el orden de movimiento y el jugador activo.
2. El jugador tira un dado de seis caras desde su móvil.
3. Si llega a una bifurcación, elige el camino desde su móvil; el tablero
   público muestra el movimiento confirmado.
4. El servidor resuelve la casilla: oros, pérdida de oros, sello, tienda,
   atajo, tirada extra o evento sencillo.
5. Cuando todos han movido, el servidor filtra los minijuegos válidos por
   número de jugadores, modo y contenido disponible.
6. Se elige un minijuego sin repetir innecesariamente el anterior. La ruleta o
   carrusel que ve el grupo es una animación de presentación: no decide el
   resultado ni puede seleccionar un juego incompatible.
7. Se juega una variante de una tarea o de pocas preguntas, con una duración
   máxima inicial de 90 segundos.
8. El servidor revela el resultado y convierte la clasificación propia del
   minijuego en una recompensa común de oros.

### Casillas del primer tablero

La primera versión solo tendrá un conjunto pequeño y legible:

- **Oros**: añade una cantidad pequeña de monedas.
- **Pérdida**: resta una cantidad limitada de monedas.
- **Sello**: permite comprar o reclamar el sello si se cumplen sus condiciones.
- **Tienda**: ofrece una cantidad muy pequeña de objetos sencillos.
- **Bifurcación**: permite elegir entre dos rutas con riesgos y recompensas
  diferentes.
- **Atajo o tirada extra**: modifica el movimiento sin crear una cadena de
  reglas complejas.
- **Evento**: aplica una regla breve y visible, siempre resuelta por el
  servidor.

No habrá robos de monedas, teletransportes frecuentes ni una gran colección de
objetos en el MVP. Esas mecánicas se reservarán para una expansión posterior,
si el tablero básico demuestra que las decisiones de ruta son divertidas.

### Minijuegos compatibles

Cada juego independiente mantendrá su puntuación normal. La Gran Ronda usará
una variante corta que devuelva una clasificación y una recompensa normalizada.

#### Primera selección

- **Banderas**: tres preguntas rápidas y clasificación por aciertos.
- **Cifras**: una estimación o una prueba de ordenar.
- **Precio justo**: un producto y una estimación.
- **Mayoría**: una pregunta social y revelación agrupada.
- **Matiz**: un reto de color de una sola ronda.
- **Ordena**: variante competitiva de Orden en la que todos ordenan los mismos
  elementos. El modo Orden cooperativo seguirá existiendo por separado y no se
  puntuará como si fuese competitivo.

#### Incorporación posterior

**Escala**, **Quién lo haría**, **Completa la frase** y **Musical** podrán entrar
cuando tengan una variante que respete el límite de tiempo, la privacidad de las
respuestas y la claridad de la clasificación. Los juegos de cartas podrán
aportar micro-retos específicos —por ejemplo, una prueba rápida de suma,
parejas o captura—, pero no se incrustarán partidas completas de Chinchón,
Mus, Pocha, Brisca, Tute o similares.

Un minijuego solo será elegible si declara explícitamente:

- número mínimo y máximo de jugadores;
- si admite juego individual o por equipos;
- duración máxima;
- tipo de respuesta y fase de revelación;
- forma de desempatar sin premiar la velocidad del dispositivo;
- función que transforma su resultado en clasificación y recompensa.

### Recompensas y equilibrio

La primera tabla de recompensas será parametrizable. Como referencia para una
partida individual:

| Clasificación | Oros |
|---:|---:|
| 1.º | 8 |
| 2.º | 5 |
| 3.º | 3 |
| Resto | 1 |

La tabla se adaptará a dos, tres o más jugadores y a los empates. Dos jugadores
empatados recibirán la misma recompensa de posición; no se usará el tiempo de
respuesta como desempate por defecto.

Las casillas darán cantidades pequeñas frente a los minijuegos, para que ganar
sea importante sin que una tirada de dado decida por sí sola la partida. Se
mantendrá una posibilidad razonable de remontada: el líder no debe acumular una
ventaja irreversible durante las primeras rondas y quien va último no debe
quedar sin capacidad de decisión.

### Equipos

El modo predeterminado será todos contra todos. Un modo por equipos posterior
creará los equipos en el lobby y solo elegirá minijuegos que declaren
`supportsTeams`. No se forzará a un minijuego cooperativo a producir un ganador
individual: si aparece un reto cooperativo, será un evento común con una
recompensa compartida o una variante específica, no una clasificación falsa.

### Decisiones explícitamente fuera del MVP

- No usar los oros como única condición de victoria.
- No incluir todos los juegos del catálogo desde el primer día.
- No seleccionar minijuegos solo con azar visual.
- No convertir un juego cooperativo en competitivo sin una regla nueva.
- No dar bonus por responder antes.
- No incluir más de una tarea principal o unas pocas preguntas por minijuego.
- No añadir robos, tiendas complejas, muchos objetos ni eventos difíciles de
  explicar.
- No hacer que una partida de cartas completa interrumpa el ritmo del tablero.

### MVP de La Gran Ronda

La primera entrega jugable tendrá:

1. un tablero fijo;
2. dado de seis caras y movimiento por turnos;
3. bifurcaciones sencillas;
4. oros, casillas de sello y resultado final por sellos;
5. seis rondas configurables;
6. los minijuegos Banderas, Cifras, Precio justo, Mayoría y Matiz, más la
   variante Ordena cuando esté validada;
7. una tabla de recompensas común;
8. pantalla pública `/mesa` con tablero, posiciones, ronda, ruleta y
   resultados;
9. móvil privado para tirar, escoger ruta y responder;
10. reconexión, temporizadores y estado autoritativo del servidor.

El MVP se considerará una experiencia separada de las partidas independientes,
aunque reutilice sala, QR, nombres, componentes de /mesa, temporizadores y
primitivas de reconexión.

### Modelo técnico de alto nivel

La Gran Ronda tendrá una identidad de modo propia y no cambiará el significado
del `gameId` de los juegos independientes. Su estado incluirá, como mínimo:

- configuración del tablero y semilla de aleatoriedad del servidor;
- grafo de casillas y rutas disponibles;
- posición, oros, sellos y objetos de cada jugador;
- orden de turnos y jugador activo;
- fase actual de la ronda;
- minijuego seleccionado y variante corta;
- respuestas privadas, resultado revelado y recompensa;
- historial suficiente para reconexión, auditoría y resultado final.

El minijuego se conectará mediante un adaptador, con una forma conceptual
similar a:

~~~text
seleccionar → crear ronda corta → recibir respuestas → resolver
           → producir clasificación → convertir a recompensa de La Gran Ronda
~~~

Así se podrán añadir minijuegos sin meter reglas de Banderas, Cifras o Precio
justo dentro del motor del tablero ni dentro de los motores de Chinchón, Pocha
o Mus.

---

## Roadmap técnico para generar los juegos

### P33 — Contrato común de juegos de preguntas

Definir el sobre compartido para partidas sin turnos: fases, temporizador,
respuesta privada, bloqueo, revelación, resultado, configuración de rondas y
reconexión. No implementar todavía los cinco conjuntos de contenido.

El contrato debe permitir que cada juego tenga su propio tipo de respuesta y
puntuación sin meter condiciones de Banderas, Cifras, Precio justo o Quién lo haría en el
motor de Chinchón, Pocha o Mus.

### P34 — Banderas: contrato, contenido y motor

Definir FlagQuestion, los tipos de entidad, los paquetes geográficos, las
opciones visualmente parecidas, el acierto binario y el resultado final. Crear
un primer paquete validado de preguntas y tests de selección, temporizador,
empate y determinismo.

### P35 — Banderas: servidor e interfaz

Añadir creación de sala, ficha de catálogo, configuración, botones de cuatro
opciones, revelación en /mesa, marcador y modo individual.

### P36 — Cifras: contrato, datos y puntuación

Definir NumberQuestion y OrderQuestion, unidades, definición de medición, valor
de referencia, fuente, metadatos de actualización, perfiles de precisión,
cálculo de error relativo y puntuación de posiciones. Crear datos iniciales y
tests dorados con escalas pequeñas y grandes, órdenes ascendentes y descendentes
y empates de valor.

### P37 — Cifras: servidor e interfaz

Añadir campo numérico móvil, reordenación táctil, bloqueo de respuestas,
revelación de la cifra o del orden correcto, porcentaje de error, puntuación de
ronda, clasificación y modos individuales de estimación y Ordena.

### P38 — Precio justo: contrato, catálogo y puntuación

Definir PriceQuestion, producto, imagen, variante, moneda, precio de referencia,
fuente, vendedor y captura estable del dato. Definir la puntuación por cercanía
relativa, la configuración de categorías, el temporizador y las rondas. Crear
un catálogo inicial pequeño y validado.

La primera versión usará precios de referencia congelados por pregunta, no una
consulta en directo durante la partida. El producto, la variante, la moneda,
el precio incluido y las condiciones de envío deben quedar definidos para que
todos jueguen contra el mismo valor.

Las imágenes de Amazon solo se usarán mediante una vía autorizada o con licencia
clara. No se hará scraping de páginas ni se copiarán imágenes arbitrariamente.
Si se integra el catálogo de Amazon, se hará mediante la API oficial disponible
en ese momento y se respetarán sus condiciones. La alternativa inicial será un
catálogo curado con imágenes propias, del fabricante o con licencia.

### P39 — Precio justo: servidor e interfaz

Añadir ficha de producto con imagen, nombre y categoría; campo de precio en
euros; confirmación y bloqueo de respuestas; revelación del precio de
referencia; puntos de cercanía; clasificación; temporizador; modo individual y
revancha.

### P40 — Quién lo haría: contrato y contenido

Definir votación privada, empate, abstención, autovoto, resumen de votos,
estadísticas sociales y modo opcional de predicción de la mayoría. Crear los
paquetes de preguntas con control de contenido.

### P41 — Quién lo haría: servidor e interfaz

Añadir botones de participantes, confirmación de voto, temporizador, resultado
agrupado, resumen final y opción de jugar sin marcador.

### P42 — Completa la frase: contrato y contenido

Definir respuesta libre normalizada, respuestas aceptadas, control de
ambigüedad, tipos de frase, licencias y validación editorial. Crear el primer
paquete competitivo solo con frases propias, refranes o material con derechos
claros.

### P43 — Completa la frase: servidor e interfaz

Añadir campo de texto, confirmación, bloqueo, normalización, revelación de la
respuesta canónica, puntos y modo individual.

### P44 — Playtest común y control de calidad

Probar los cinco juegos con grupos reales. Medir comprensión sin explicación,
tiempo hasta la primera respuesta, preguntas descartadas, empates, errores de
contenido y si los jugadores quieren repetir.

### P45 — La Gran Ronda: contrato de partida y fases

Definir el contrato propio del modo meta: configuración del tablero, casillas,
rutas, posiciones, dado, turnos, oros, sellos, objetos, fases, minijuego activo,
recompensas, reconexión y resultado final. El servidor será la autoridad sobre
el dado, el movimiento, la resolución de casillas, la selección del minijuego y
la puntuación.

Las fases iniciales serán `lobby`, `movement`, `spaceResolution`,
`minigameSelection`, `minigame`, `payout`, `nextRound` y `gameEnd`. El contrato
deberá impedir que una respuesta privada del minijuego se filtre antes de la
revelación.

### P46 — La Gran Ronda: tablero, movimiento y casillas

Crear el primer mapa como un grafo de casillas con bifurcaciones, coste de
movimiento y destino de sello. Implementar dado de seis caras, orden de turnos,
elección de ruta, casillas de oros, pérdida, sello, tienda, atajo, tirada extra
y evento sencillo. Añadir tests de movimiento, límites, reconexión, resolución
determinista y cambio de ubicación del sello.

### P47 — La Gran Ronda: adaptador de minijuegos

Definir el contrato `PartyMiniGameAdapter` o equivalente para que cada variante
declare compatibilidad por número de jugadores, duración, equipos, tipo de
respuesta, estado privado, resolución y recompensa. Crear primero los modos
cortos de Banderas, Cifras, Precio justo, Mayoría y Matiz. Añadir la variante
competitiva de Ordena sin cambiar el modo cooperativo de Orden.

El adaptador debe impedir que se seleccione un juego sin contenido, incompatible
con el número de jugadores o sin una función de clasificación válida. La ruleta
será una presentación cliente del resultado ya elegido por el servidor.

### P48 — La Gran Ronda: economía y equilibrio

Implementar oros, sellos, costes, recompensas y tabla parametrizable por número
de jugadores. Crear reglas para empates, participación mínima, cantidades de
casillas y coste del sello. Probar que los oros sirven para tomar decisiones,
pero no sustituyen el objetivo de sellos ni convierten la partida en una carrera
decidida por una sola tirada.

Los objetos de la primera versión se limitarán a uno o dos efectos sencillos,
como repetir el dado o modificar ligeramente el movimiento. La tienda y los
eventos más complejos quedan fuera hasta el primer playtest.

### P49 — La Gran Ronda: sala y servidor

Añadir la creación de una sala con el modo meta, lobby con nombres y QR,
transiciones entre movimiento y minijuego, temporizadores, acciones privadas,
reconexión, cierre de ronda, reparto de oros y resultado final. Reutilizar la
infraestructura común de Ronda sin hacer que una sala independiente pueda entrar
accidentalmente en el estado del tablero.

### P50 — La Gran Ronda: interfaz pública y móvil

Crear el lobby del modo, tablero público en `/mesa`, ficha del jugador activo,
animación del dado, selección de bifurcación, indicador de oros y sellos,
animación de selección de minijuego, briefing corto, revelación de resultados y
marcador final. En el móvil se mostrarán únicamente las acciones del jugador:
tirar, elegir ruta, comprar o responder.

La animación de ruleta deberá ser corta, omitir juegos no disponibles y no
bloquear el flujo si un jugador se desconecta. Los textos de cada minijuego
deberán explicar en pocos segundos qué hay que hacer y cuánto dura.

### P51 — La Gran Ronda: playtest y control de calidad

Probar primero con 3–6 personas y después con el máximo configurado. Medir
duración de movimiento, espera entre turnos, tiempo de cada minijuego,
frecuencia de repetición, ventaja del primer jugador, capacidad de remontada,
claridad del objetivo, uso de las bifurcaciones, valor percibido de los oros y
si el grupo quiere volver a jugar.

No ampliar el catálogo de minijuegos ni añadir objetos hasta que un tablero
completo sea jugable, comprensible y estable en móviles reales.

## Definición de terminado

Cada juego estará terminado solo cuando:

1. tenga un contrato propio y no dependa de reglas de otro juego;
2. tenga contenido inicial revisado y sin preguntas ambiguas;
3. tenga tests del motor y de la puntuación;
4. funcione en una sala real con móviles distintos;
5. tenga /mesa, resultados y revancha;
6. soporte el temporizador configurado;
7. tenga modo competitivo claramente explicado;
8. no copie textos, ilustraciones, marcas ni interfaces de otros juegos;
9. pnpm typecheck, pnpm lint y pnpm test pasen en verde.

### Definición adicional de terminado para La Gran Ronda

La Gran Ronda estará terminada para una primera publicación solo cuando:

1. se pueda crear y terminar una partida completa con 3–7 jugadores;
2. el servidor controle dado, movimiento, rutas, casillas, minijuego y
   recompensas;
3. exista un tablero inicial con rutas que ofrezcan decisiones reales;
4. haya al menos cuatro minijuegos cortos compatibles y uno de ellos pueda ser
   Ordena sin romper el Orden cooperativo;
5. cada minijuego tenga reglas de empate y una recompensa normalizada;
6. se entienda que los oros son recursos y los sellos son el objetivo;
7. la pantalla `/mesa` y los móviles muestren siempre la misma fase pública;
8. una desconexión o reconexión no duplique movimientos, respuestas ni pagos;
9. la partida objetivo dure entre 15 y 25 minutos en el playtest;
10. existan tests de fases, movimiento, economía, compatibilidad y transición
    entre minijuegos;
11. `pnpm typecheck`, `pnpm lint` y `pnpm test` pasen en verde.
