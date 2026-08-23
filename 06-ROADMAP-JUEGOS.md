# RONDA — Roadmap de juegos independientes

> Documento de producto para los juegos que se incorporarán después de los
> juegos de cartas actuales. No es todavía un contrato de implementación. Antes
> de programar cada juego, su paquete correspondiente congelará los tipos, las
> reglas y los datos.

## Decisión principal

Los juegos de **Banderas**, **Cifras**, **Precio justo**, **Quién lo haría** y
**Completa la frase**
son juegos independientes. No forman un juego mixto ni una ronda común dentro de
la misma partida.

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

La sala se crea eligiendo **un solo juego**. No habrá un selector «mezcla estos
cinco juegos» en esta fase.

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

No se implementará el siguiente juego hasta que el anterior tenga preguntas
reales, tests del motor y una partida completa jugable en una sala.

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
