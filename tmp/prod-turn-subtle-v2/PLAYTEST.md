# Protocolo de playtest

Contrato P20 (`02-PAQUETES.md`) / `00-MASTER.md` §7 y §10. Guion para tres
sesiones con grupos reales de 3-4 personas que **no hayan visto la app
antes**. Es la única forma de comprobar el **Hito 4** del proyecto (fin
P20): "tres grupos distintos que no conoces terminan una partida y piden
otra". Nada de esto se puede simular con bots (`pnpm sim`, P9) ni con
quien ya conoce la interfaz -- ambos ya saben qué botón tocar, que es
precisamente lo que hay que comprobar.

Este documento no lleva código (contrato explícito de este paquete): es
un guion para la persona que organiza y observa cada sesión.

---

## 1. Qué se necesita antes de empezar

- **Una tele o tablet grande** con `/mesa/CÓDIGO` abierto, a la vista de
  todo el grupo, conectada a la misma red que el servidor (o a Internet si
  el servidor ya está desplegado -- ver `DEPLOY.md`).
- **Los móviles de los participantes**, con datos móviles o wifi -- no
  hace falta instalar nada, es una PWA en el navegador.
- **Un QR impreso en papel**, no en una pantalla. Apuntando a
  `/unirse/CÓDIGO` de la sala que se crea al empezar la sesión (se genera
  e imprime justo antes: el código lo decide el servidor al crear la
  sala, no se puede preparar con antelación).
- **Un cronómetro** (el del móvil del observador vale) y la **plantilla de
  recogida de datos** de la sección 5, impresa o en una nota junto al
  observador -- no en el mismo dispositivo que se está cronometrando.
- Grupo de **3 o 4 personas**, sin nadie que ya haya jugado a esta app
  antes (si alguien ya la conoce, cuenta como observador, no como
  participante).

## 2. El rol del observador

**Regla dura: no ayudar.** Ni con el QR, ni con las reglas del Chinchón,
ni señalando qué botón tocar. Si alguien se atasca, se deja que se atasque
y se anota. La sesión mide si la interfaz explica sola lo que hace falta
-- ayudar a mitad de la prueba invalida exactamente lo que se quiere medir.

Excepciones donde SÍ se interviene (son fallos del entorno de prueba, no
de la app): el wifi de la sala se cae, alguien no tiene datos móviles, el
servidor está caído. Se anota igualmente como incidencia, pero no cuenta
como pregunta de "¿y ahora qué hago?" (sección siguiente).

**Qué anotar en todo momento:** cada vez que alguien pregunte, en voz alta
o a otro participante, algo del tipo "¿y ahora qué hago?", "¿esto para qué
es?", "¿le doy aquí?" -- literal o parafraseado. Un tally simple (palotes)
junto con qué pantalla estaban mirando basta; el detalle exacto de la
pregunta es opcional pero ayuda a decidir qué cambiar (sección 6). Esta es
la métrica 7 de `00-MASTER.md` §10 (objetivo: **< 2 por partida**), y es
la única de las 7 que **no** puede medir el servidor -- por eso hace falta
un observador humano (ver `apps/server/src/scripts/report.ts`, que lista
esta métrica explícitamente como "no medible desde aquí").

## 3. Qué cronometrar

Tres tiempos, con el mismo cronómetro:

1. **Escaneo del QR → dentro de la sala.** Arranca al ver a la primera
   persona apuntar la cámara al QR impreso; para en cuanto esa persona ve
   su pantalla de "Sala" (el lobby) con su apodo ya puesto. Mide esto
   **para cada participante que se une por QR**, no solo el primero --
   apunta los 3-4 tiempos por separado. Objetivo (§10): mediana **< 15 s**.
2. **Sala creada → partida empezada.** Arranca cuando el anfitrión toca
   "Crear partida"; para en cuanto la pantalla cambia de lobby a la
   partida en marcha (todos han tocado "Empezar" / el anfitrión ha
   pulsado el botón con 2+ jugadores). Un solo tiempo por sesión.
3. **Duración de la partida completa.** Desde que empieza la partida hasta
   que hay un ganador (alguien queda eliminado y solo queda una persona en
   pie, o un chinchón termina la partida entera). Un solo tiempo por
   sesión; sirve también para planificar cuánto dura cada sesión completa
   (ver sección 4).

Estos tres tiempos son manuales porque son los únicos de `00-MASTER.md`
§10 que ocurren **antes** de que exista un socket abierto (el escaneo) o
que dependen del reloj de pared del grupo, no del servidor. Las otras
métricas de la tabla de §10 (revancha, reconexión, etc.) las calcula
`pnpm report` solo con lo que ya haya en `playtest_events` -- ejecútalo
después de la sesión, no hace falta anotarlo a mano.

## 4. Guion de la sesión (mismo guion para las tres)

Pensado para que quepa en 30-45 minutos por sesión, sin contar la charla
de después.

1. **Antes de que llegue el grupo:** arranca el servidor (local o
   desplegado), abre `/` en la tele/tablet grande, ten el QR ya impreso a
   mano (si el código de sala cambia cada vez, imprime uno nuevo justo
   antes o usa una sala fija de pruebas si el flujo lo permite).
2. **Instrucción inicial, literal y corta** (no expliques más de esto):
   > "Vais a jugar una partida de cartas con el móvil. Ahí tenéis un
   > código QR para entrar. A partir de ahí, jugad como os parezca -- no
   > os voy a ayudar, solo estoy mirando."
   > No expliques las reglas del Chinchón. Si preguntan, señala que hay un
   > enlace a "Reglas" dentro de la app (`/reglas`, P18) y no digas nada
   > más.
3. **Anfitrión crea la sala** (elige quién de forma neutra, o que se
   ofrezca alguien): cronómetro en marcha para el tiempo 2 de la sección 3.
4. **El resto escanea el QR impreso** uno a uno: cronómetro en marcha (y
   parado) para cada uno, tiempo 1 de la sección 3.
5. **Observador en silencio, anotando** tally de "¿y ahora qué hago?"
   (sección 2) durante todo el lobby y la partida.
6. **Partida hasta el final**, cronómetro para el tiempo 3.
7. **Las 5 preguntas** de la sección 5, inmediatamente después de la
   partida, con el grupo todavía delante -- no por WhatsApp al día
   siguiente, se pierde la espontaneidad de la respuesta.
8. **Rellena la plantilla de la sección 5** con el grupo aún delante
   mientras está fresco; el resumen y las decisiones (sección 6) se
   pueden dejar para después.
9. **Ejecuta `pnpm report`** (contrato P18) para tener las métricas
   automáticas de esta sesión junto a las manuales.

## 5. Después de la partida: 5 preguntas fijas

Las mismas 5 preguntas en las tres sesiones, en este orden, a **cada**
participante por separado (no en grupo: las respuestas en grupo se
contagian unas a otras):

1. ¿Jugarías otra partida ahora mismo? (sí / no, y por qué en una frase)
2. Durante la partida, ¿qué has mirado más: el móvil o a la gente de tu
   alrededor?
3. ¿Hubo algún momento en el que no supieras qué hacer o qué estaba
   pasando? ¿Cuál?
4. La pantalla de la tele, ¿te ha ayudado a seguir la partida o te ha dado
   igual que estuviera?
5. Si tuvieras que explicarle esto a un amigo en una sola frase, ¿qué le
   dirías?

Por qué estas 5 y no otras: la 1 y la 4 del enunciado del contrato
("¿jugarías otra?" y "móvil o gente") son las dos peticiones explícitas
del prompt de P20. Las otras tres completan lo que el servidor no puede
medir por sí solo: la 3 es un auto-informe que se contrasta con el tally
del observador (sección 2) -- si alguien dice que no se ha perdido nunca
pero el observador anotó dos preguntas suyas, esa discrepancia es un dato
en sí; la 4 comprueba si `/mesa` (la pantalla central, "la parte más
vendible de la idea" según `00-MASTER.md` §1.6) aporta algo de verdad o es
un adorno; la 5 es una prueba rápida de si el concepto se entiende y se
recomendaría, sin hacer una encuesta larga que nadie quiere responder
después de jugar a cartas.

## 6. Plantilla de recogida de datos

Copia esta tabla (o el bloque de abajo) una vez por sesión.

**Sesión N -- fecha: ______ -- grupo: (relación entre participantes, p.ej.
"compañeros de piso", "familia") ______**

| Dato                                                                  | Valor |
| --------------------------------------------------------------------- | ----- |
| Nº de participantes                                                   |       |
| Dispositivo/red de la tele                                            |       |
| Tiempo QR → sala (participante 1)                                     |       |
| Tiempo QR → sala (participante 2)                                     |       |
| Tiempo QR → sala (participante 3)                                     |       |
| Tiempo QR → sala (participante 4, si aplica)                          |       |
| Tiempo sala creada → partida empezada                                 |       |
| Duración de la partida                                                |       |
| Nº de preguntas "¿y ahora qué hago?" (tally)                          |       |
| Incidencias de entorno (red, servidor caído, etc., no cuentan arriba) |       |

**Respuestas a las 5 preguntas**, una fila por participante:

| Participante | P1 ¿jugaría otra? | P2 móvil/gente | P3 momento perdido | P4 ¿ayudó la tele? | P5 en una frase |
| ------------ | ----------------- | -------------- | ------------------ | ------------------ | --------------- |
| 1            |                   |                |                    |                    |                 |
| 2            |                   |                |                    |                    |                 |
| 3            |                   |                |                    |                    |                 |
| 4            |                   |                |                    |                    |                 |

**Salida de `pnpm report` para esta sesión** (pega aquí el resultado, o
al menos las 4 métricas que sí calcula):

```
(pegar salida de `pnpm report` aquí)
```

## 7. Sección de decisiones: qué cambiar antes de la siguiente sesión

Se rellena **después de cada sesión, antes de la siguiente** -- el sentido
de hacer tres sesiones en vez de una es poder corregir algo entre medias
y comprobar si funcionó. Si una sesión no deja ningún cambio claro, se
anota igualmente "sin cambios" y por qué (puede ser una señal de que ya
está bien, o de que el grupo no dio suficiente información).

**Después de la sesión 1:**

- Qué se ha visto (1-3 frases, lo más repetido o lo más sorprendente).
- Qué se cambia antes de la sesión 2 (o "sin cambios" y por qué).

**Después de la sesión 2:**

- Qué se ha visto, y si el cambio de la sesión 1 tuvo el efecto esperado.
- Qué se cambia antes de la sesión 3 (o "sin cambios" y por qué).

**Después de la sesión 3 -- balance final de las tres:**

- Las 7 métricas de `00-MASTER.md` §10, agregadas las tres sesiones:
  ¿cuáles cumplen el objetivo y cuáles no?
- Si la métrica de "¿y ahora qué hago?" falla, el problema es de
  interfaz, no de reglas (00-MASTER.md §10, última línea). Si falla la de
  revancha, el problema es el juego, no el código -- son diagnósticos
  distintos y piden arreglos distintos.
- ¿Se cumple el Hito 4 (00-MASTER.md §7): las tres terminan una partida y
  piden otra? Si no, con qué grupo(s) falló y en qué paso concreto.
- Próximos pasos: si el MVP se sostiene, la siguiente parada es la lista
  de "Después del MVP" de `02-PAQUETES.md` (Pocha, reacciones,
  estadísticas...), en ese orden y no antes.
