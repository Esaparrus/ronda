# Checklist manual de reconexión y estados límite (P17)

Contrato `01-CONTRATOS.md` §6, `00-MASTER.md` §8. Los 7 casos del prompt de
P17, con cómo reproducir cada uno a mano y qué se espera ver. Se necesita:
dos dispositivos (o dos pestañas/perfiles) y el servidor corriendo en local
(`pnpm --filter @ronda/server dev`) o desplegado.

Para simular condiciones de red en el móvil: **modo avión** es más fiable
que "desactivar wifi", porque también corta los datos móviles. En
DevTools de escritorio, la pestaña **Network** del inspector tiene un
selector "Offline" que corta el socket sin cerrar la pestaña.

---

## 1. Recarga en medio de la partida

**Cómo probarlo:** entra en una partida ya empezada (`/sala/CODIGO`),
juega un par de turnos, y recarga la página (F5 / deslizar hacia abajo en
el móvil).

**Se espera:** pantalla "Entrando en la sala…" un instante, y vuelta
exactamente al mismo sitio (misma mano, mismo turno, mismo marcador) sin
pantalla en blanco ni tener que volver a escribir el apodo. Por debajo:
`SalaClient` llama a `resume(code)` con el token guardado en
`localStorage` en cuanto detecta que no hay `view` para esa sala.

---

## 2. Volver a abrir la app horas después

**Cómo probarlo:** crea o entra en una sala, cierra la pestaña/app del
todo (no solo recargar), y vuelve a abrir `/` (la portada) más tarde.

**Se espera:** una tarjeta «Volver a la partida CÓDIGO» por cada sala con
token guardado en este navegador, con un botón "Descartar" al lado. Tocar
la tarjeta lleva a `/sala/CÓDIGO` y retoma la sesión (caso 1). Tocar
"Descartar" borra el token y quita la tarjeta sin entrar en la sala --
pruébalo y confirma que, si vuelves a `/`, esa tarjeta ya no aparece.

---

## 3. Pérdida de conexión

**Cómo probarlo:** con una partida abierta, activa el modo avión (o
"Offline" en DevTools) durante unos segundos y luego desactívalo.

**Se espera:**
- La banda de 4px arriba pasa de verde translúcido a `--oro` en cuanto se
  detecta la caída.
- Debajo de la banda aparece el cartel «Sin conexión. Reintentando…».
- Los botones de la barra de acción (Robar/Descartar/Cerrar) quedan
  deshabilitados mientras tanto: no se puede enviar ninguna jugada.
- Al recuperar la red, la banda vuelve a verde sola, el cartel desaparece,
  y la partida sigue exactamente donde estaba (el cliente reenvía
  `room:resume` con el token en cuanto reconecta) -- no hace falta ninguna
  acción manual.

---

## 4. Sala cerrada o caducada

**Cómo probarlo, dos formas:**
- **Caducidad:** crea una sala y no hagas nada en el lobby durante 2 horas
  (o, para probarlo rápido en local, reduce temporalmente `ROOM_LOBBY_TTL`
  en el servidor y espera a que el barrido periódico -cada 30s- la cierre).
- **Cierre por abandono del anfitrión:** siendo el único jugador, sal de la
  sala (o cierra la pestaña) sin que quede nadie dentro.

**Se espera:** cualquier pestaña que siga mirando esa sala recibe
`room:closed` y muestra una pantalla explicativa («La sala CÓDIGO ya no
está disponible») con un botón «Crear una partida nueva» que lleva a
`/crear`. El token guardado de esa sala se borra solo (compruébalo:
vuelve a `/` y la tarjeta «Volver a la partida» ya no aparece).

---

## 5. Anfitrión expulsándote

**Cómo probarlo:** con dos jugadores en el lobby, el anfitrión expulsa al
otro (botón de expulsar en la lista de jugadores del lobby).

**Se espera:** en el dispositivo expulsado, sin recargar ni hacer nada,
aparece enseguida la pantalla «El anfitrión te ha sacado de la sala» con
un botón «Volver a la portada». El token de esa sala queda borrado (si
vuelves a `/`, no hay tarjeta «Volver a la partida» para esa sala).

---

## 6. Doble pestaña con el mismo token

**Cómo probarlo:** entra en una sala en una pestaña, y luego abre la
misma URL (`/sala/CÓDIGO`) en una segunda pestaña del mismo navegador
(o duplica la pestaña).

**Se espera:** la pestaña **más nueva** sigue jugando con normalidad. La
pestaña **vieja** pasa a mostrar, a pantalla completa, «Estás jugando en
otra pestaña» y deja de mostrar la partida (no se puede jugar desde ahí
mientras la otra siga abierta). Cerrar la pestaña nueva NO reactiva la
vieja automáticamente (no hay negociación de vuelta, es un aviso, no un
mecanismo de failover) -- si hace falta seguir jugando, se sigue desde la
pestaña que quedó activa o se recarga.

---

## 7. Fallo del servidor (5xx o socket caído más de 30s)

**Cómo probarlo:** con una partida abierta, mata el proceso del servidor
(`Ctrl+C` en la terminal donde corre `pnpm --filter @ronda/server dev`, o
para el contenedor/máquina si está desplegado) y espera sin tocar nada.

**Se espera:** la banda pasa a `--oro` y el cartel «Sin conexión.
Reintentando…» aparece igual que en el caso 3, pero si pasan 30 segundos
sin reconectar, la pantalla cambia entera a «Sin conexión con el
servidor» con un botón «Reintentar» (a diferencia del caso 3, que se
resuelve solo: aquí la caída es demasiado larga para dejar al jugador
mirando una banda dorada indefinidamente). "Reintentar" recarga la
página; si el servidor sigue caído, se queda en la pantalla de "Entrando
en la sala…"/reconectando; si ya ha vuelto, retoma la partida (caso 1).

También cubre: un error de React no capturado en cualquier pantalla debe
caer en la pantalla «Algo ha fallado» (`error.tsx`) con un botón
«Reintentar», nunca una pantalla en blanco ni una traza técnica. Una URL
que no existe debe caer en «Página no encontrada» (`not-found.tsx`).

---

## Resultado

Los 7 casos anteriores se han verificado manualmente (build de producción
en local) y automáticamente donde es viable sin depender de tiempos de
espera reales de horas/30s: `apps/web/src/lib/serverDown.test.ts` (umbral
del caso 7, con temporizadores falsos), `apps/web/src/lib/tabGuard.test.ts`
(caso 6), y `apps/web/src/lib/store.test.ts` (casos 3, 4 y 5: los tres
estados de `connection`, `room:closed` con `closedReason`, y `kickedOut`
vía `disconnect(true)` simulado desde un servidor de juguete). El caso 1 y
2 ya estaban cubiertos por P12/P13 y no han cambiado en P17.
