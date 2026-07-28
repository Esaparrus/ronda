# RONDA — Documento maestro (v1)

> Nombre de trabajo del proyecto: **Ronda**. Repositorio: `ronda`. Se cambia en un solo sitio (`packages/protocol/src/brand.ts`).
> Este documento manda sobre cualquier otra cosa. Si un paquete de tarea contradice esto, gana esto.

---

## 0. Qué estamos construyendo (una frase)

Una web-app instalable donde un grupo entra a una sala con un código o un QR en menos de 15 segundos, cada móvil es su mano privada, y juegan una partida de **Chinchón** con las reglas aplicadas por el servidor — con la opción de poner una tele o tablet en el centro como tablero público.

**El MVP no es una plataforma.** Es un juego, bien hecho, sobre una arquitectura que admitirá más juegos sin reescribirse.

---

## 1. Cambios que he hecho sobre tu documento (y por qué)

Estos cambios son decisiones tomadas, no sugerencias. Están ya incorporados al resto del plan.

| # | Cambio | Por qué |
|---|--------|---------|
| 1 | **El servidor de partida NO va en Vercel.** Va como proceso Node independiente con Socket.IO (Fly.io o Railway). Vercel solo sirve el front. | Las funciones serverless no mantienen conexiones ni estado en memoria. Intentar hacer un motor autoritativo con Supabase Realtime obliga a meter la lógica en SQL o a hacer polling. Un solo proceso Node con las salas en memoria es más simple, más rápido y trivialmente correcto a esta escala. |
| 2 | **El motor de juego es un paquete puro de TypeScript**, sin red, sin base de datos, sin `Date.now()`, sin `Math.random()`. RNG con semilla guardada en el estado. | Se puede testear al 100% sin levantar nada, se pueden reproducir partidas exactas a partir de la semilla, y se pueden lanzar bots que juegan miles de partidas para encontrar bugs de reglas. Esto es lo que ahorra semanas. |
| 3 | **Nada de "declarar combinaciones" manualmente.** Al cerrar, el servidor calcula la mejor combinación posible de cada jugador automáticamente (resolver óptimo). | Es el punto donde las apps de cartas se vuelven insoportables. Agrupar cartas en la mano queda como algo puramente visual/opcional. Menos UI, menos reglas que explicar, cero discusiones. |
| 4 | **Las cartas se dibujan como SVG generado por código**, no como imágenes. Baraja de diseño propio: geometría + tipografía + color. | Cero riesgo de propiedad intelectual, cero presupuesto de ilustración, cero pipeline de assets, escala perfecta en tele y móvil, y da identidad propia. |
| 5 | **Se envía siempre el estado completo ya censurado** a cada cliente, no diferencias. | Una vista de Chinchón son ~1 KB. Los diffs son la primera fuente de bugs de sincronización. Cuando duela (no dolerá), se optimiza. |
| 6 | **La pantalla central existe desde el día 1** como ruta separada `/mesa/[code]`, solo lectura y solo información pública. | Es barata si se diseña desde el principio y es la parte más vendible de la idea. Añadirla después obliga a rehacer el modelo de vistas. |
| 7 | **Fuera del MVP:** chat, voz, reacciones, amigos, estadísticas, equipos, torneos, avatares personalizados, offline/Bluetooth, editor de juegos, IA. | Ya lo tenías, lo confirmo y lo endurezco: si no está en el §4 de este documento, no se construye. |
| 8 | **Dentro del MVP, aunque no estaba en tu lista:** simulador de partidas con bots (arnés de test), telemetría mínima de playtest, y transferencia de anfitrión. | Sin el simulador se depuran las reglas a mano con 4 móviles, que es insufrible. Sin telemetría, la Fase 8 de pruebas reales no genera datos. |
| 9 | **Las reglas de Chinchón quedan congeladas y escritas al detalle** en `01-CONTRATOS.md §5`, con variantes configurables y valores por defecto elegidos. | Es el punto donde una IA barata inventa. Si no está escrito con este nivel de detalle, generará una versión distinta cada vez. |
| 10 | **El orden de desarrollo cambia:** contratos → motor → servidor → interfaz. La maqueta visual no va primera. | Tu Fase 1 (pantallas con datos ficticios) tenía sentido, pero la forma de esos datos ficticios *es* el contrato de vistas. Definido el contrato (Paquete P1), la interfaz y el servidor pueden avanzar en paralelo sin bloquearse. |
| 11 | Base de datos: **Postgres accedido solo por el servidor** con `pg` y SQL plano. Nada de RLS complicado, nada de cliente Supabase en el navegador. | El navegador nunca habla con la base de datos. Superficie de ataque cero y migraciones legibles. Supabase se usa solo como Postgres gestionado (o Neon, da igual). |
| 12 | **Sin cuentas, sin login, sin email en el MVP.** Identidad = token opaco en `localStorage` ligado a una sala. | Tú ya lo decías. Lo blindo: no hay tabla de usuarios y no se recoge ningún dato personal. Solo un apodo escrito por el jugador. |

---

## 2. Arquitectura

```
                 ┌──────────────────────┐
   móvil ────────┤  apps/web (Next.js)  │  Vercel · PWA
   móvil ────────┤  React + Zustand     │  solo pinta vistas
   tele  ────────┤  /mesa/[code]        │
                 └──────────┬───────────┘
                            │ WebSocket (Socket.IO)
                            │ mensajes validados con zod
                 ┌──────────┴───────────┐
                 │  apps/server (Node)  │  Fly.io · 1 instancia
                 │  autoridad total     │  salas en memoria
                 │  RoomManager         │
                 └─────┬──────────┬─────┘
                       │          │
        ┌──────────────┴──┐   ┌───┴─────────────────┐
        │ packages/engine │   │ Postgres (snapshots)│
        │ TS puro y       │   │ rooms · players     │
        │ determinista    │   │ matches · events    │
        └─────────────────┘   └─────────────────────┘

        packages/protocol  ← tipos y esquemas zod compartidos por los tres
```

**Regla de oro:** el cliente nunca decide nada. El cliente dice *"quiero hacer X"*, el servidor responde con el estado nuevo. Ninguna carta privada de un jugador viaja jamás al socket de otro jugador, ni oculta, ni cifrada, ni "para animaciones".

### Monorepo

```
ronda/
├─ apps/
│  ├─ web/          Next.js 15 (App Router) + Tailwind
│  └─ server/       Node 22 + node:http + socket.io + pg
├─ packages/
│  ├─ protocol/     zod: mensajes, vistas, errores, config, marca
│  └─ engine/       motor puro: baraja, reglas, reducer, vistas, solver
├─ db/migrations/   *.sql aplicadas por un script propio
├─ pnpm-workspace.yaml
└─ package.json
```

Gestor: **pnpm**. TypeScript **strict** en todo. ESM en todo. Node **22 LTS**.

---

## 3. Decisiones tecnológicas cerradas

| Área | Decisión | Prohibido |
|------|----------|-----------|
| Front | Next.js App Router, React, Tailwind CSS v4, Zustand | Redux, MUI, shadcn, cualquier librería de componentes |
| Transporte | Socket.IO (cliente y servidor) | tRPC, GraphQL, SSE, polling |
| Validación | zod en los dos extremos | validación manual con `if` |
| Servidor | `node:http` + `socket.io` | Express, Fastify, NestJS |
| BD | Postgres + `pg` + SQL plano | ORM (Prisma, Drizzle), cliente supabase-js |
| Tests | Vitest | Jest |
| QR | `qrcode` (generación en cliente, canvas/SVG) | servicios externos de QR |
| Iconos | SVG inline propio | librerías de iconos |
| PWA | `manifest.webmanifest` + `sw.js` escritos a mano | next-pwa y similares |
| Fechas | timestamps numéricos (`number`), UTC | dayjs, moment, date-fns |
| Estilos | Tailwind + tokens CSS en `globals.css` | CSS-in-JS, styled-components |

Cualquier dependencia que no esté en esta tabla o en `01-CONTRATOS.md` requiere permiso explícito de Unai.

---

## 4. Alcance del MVP (contrato de alcance)

### Dentro
- Crear sala (elige juego = Chinchón, configura variantes, 2–4 jugadores).
- Unirse por código de 4 caracteres, por enlace o por QR. Solo apodo, sin registro.
- Sala de espera con lista de conectados, QR grande y botón de empezar (solo anfitrión).
- Partida de Chinchón completa: reparto, robar de mazo/descarte, descartar, cerrar, chinchón, puntuación, rondas sucesivas, eliminación, ganador.
- Mano privada: ver, ordenar (manual y "ordenar por palo/valor"), agrupar visualmente, marcar carta y confirmar acción.
- Resultado de ronda con las combinaciones de cada jugador reveladas y los puntos.
- Reconexión completa (bloqueo de móvil, recarga, pérdida de cobertura, cierre de app).
- Traspaso de anfitrión si el anfitrión desaparece.
- Expulsar jugador y abandonar partida, con consecuencias definidas.
- Pantalla central opcional `/mesa/[code]`, solo información pública.
- Revancha con los mismos jugadores.
- Instalable como PWA (icono, splash, manifest, offline shell).
- Vibración en tu turno y sonidos básicos (con interruptor).
- Simulador de partidas con bots y telemetría de playtest.

### Fuera (versión 1.1 o posterior)
Chat, voz, emojis/reacciones, lista de amigos, cuentas, avatares personalizados, estadísticas históricas, equipos, torneos, rankings, marketplace, editor de juegos, juego offline/Bluetooth, IA rival, segundo juego, i18n más allá del castellano.

### Fuera para siempre (hasta nueva orden)
Copiar diseño, nombres, ilustraciones o interfaz de barajas o apps existentes. Todo el material es original.

---

## 5. Definición de "terminado" (aplica a TODOS los paquetes)

Un paquete no está terminado hasta que:

1. `pnpm typecheck` pasa sin errores ni `any` implícitos ni `@ts-ignore`.
2. `pnpm lint` pasa.
3. `pnpm test` pasa, y los tests nuevos del paquete cubren los criterios de aceptación listados.
4. No se ha añadido ninguna dependencia fuera de la lista permitida.
5. No se ha modificado ningún fichero de `packages/protocol` ni de `packages/engine` fuera del paquete que lo tiene asignado (ver §6).
6. El README del paquete afectado explica en 5 líneas qué hace y cómo se usa.
7. No hay `console.log` en código de producción (usar el logger del servidor o borrarlo).

---

## 6. Propiedad de los ficheros (evita que la IA barata pise trabajo hecho)

| Zona | La puede crear/modificar | La demás sesiones solo la LEEN |
|------|-------------------------|-------------------------------|
| `packages/protocol/**` | P1 | resto |
| `packages/engine/src/core/**` | P2 | resto |
| `packages/engine/src/games/chinchon/**` | P3, P4 | resto |
| `apps/server/**` | P5–P9 | resto |
| `apps/web/src/components/ui/**` | P11 | resto |
| `apps/web/src/lib/**` | P12 | resto |
| `apps/web/src/app/**` | P13–P17 | resto |
| `db/migrations/**` | P7 | resto |

Si un paquete necesita cambiar un contrato que no le pertenece, **para y pregunta a Unai**. No lo cambia por su cuenta. Un cambio de contrato es una decisión de arquitectura, no un detalle de implementación.

---

## 7. Orden de ejecución y paralelismo

```
P0 bootstrap
 └─ P1 protocolo  ◄── cuello de botella, hazlo bien
     ├─ RAMA A (motor y servidor, secuencial)
     │   P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9
     └─ RAMA B (interfaz, puede ir en paralelo desde P1)
         P10 → P11 → P12 → P13 → P14 → P15 → P16
                                  └─ P17 (necesita P8)
 P18 pulido · P19 despliegue · P20 playtest   (al final, en orden)
```

Estimación con IA generadora y tú revisando: **P0–P9 ≈ 3 semanas**, **P10–P17 ≈ 3 semanas**, **P18–P20 ≈ 1 semana**. Hitos:

- **Hito 1 (fin P4):** una partida completa de Chinchón se juega por consola con bots. Sin interfaz. Si esto funciona, el proyecto es viable.
- **Hito 2 (fin P9):** cuatro procesos bot juegan una partida completa a través del socket real, con desconexiones simuladas.
- **Hito 3 (fin P16):** cuatro móviles reales terminan una partida en el salón de casa.
- **Hito 4 (fin P20):** tres grupos distintos que no conoces terminan una partida y piden otra.

---

## 8. Riesgos y cómo los desactivamos

| Riesgo | Desactivación concreta |
|--------|------------------------|
| Convertirlo en plataforma demasiado pronto | El registro de juegos existe (`GameModule`) pero solo hay una entrada. Nadie toca `core/` para "generalizar" hasta que exista el segundo juego. |
| Mirar demasiado el móvil | Regla de diseño dura: **en tu turno solo hay una acción principal visible**. Cero texto largo. El resultado de cada acción se celebra en la pantalla central, no en el móvil. Máximo 2 toques por turno. |
| Mala conexión | Versión de estado + `clientActionId` idempotente + reintento automático + banda de estado de conexión + acciones bloqueadas mientras haya una en vuelo. |
| Variantes regionales | 8 opciones configurables antes de empezar, con valores por defecto (`01-CONTRATOS.md §5.9`). La partida guarda la config usada. |
| Derechos de terceros | Baraja SVG generada por código, reglas redactadas de cero, tipografías de licencia abierta, sin nombres de marcas. |
| La IA barata "mejora" cosas por su cuenta | Cada prompt termina con la sección **NO HAGAS**. Los contratos están congelados. Propiedad de ficheros del §6. |
| Ambigüedad en las reglas al puntuar | Resolver óptimo determinista + 40 tests dorados escritos a mano en `03` con manos concretas y su puntuación exacta. |

---

## 9. Cómo trabajar con la IA generadora

1. Abre una sesión **nueva por paquete**. No arrastres contexto de paquetes anteriores.
2. Pega siempre, en este orden: `03-CONTEXTO-PEGABLE.md` → la sección de `01-CONTRATOS.md` que el paquete indica → el prompt del paquete de `02-PAQUETES.md`.
3. Pídele que **primero liste los ficheros que va a crear** y espere confirmación. Revisa esa lista contra el paquete. Si no coincide, corrígela antes de que escriba una línea.
4. Cuando entregue, ejecuta tú `pnpm typecheck && pnpm lint && pnpm test`. Pega los errores tal cual, sin resumirlos.
5. Haz commit al terminar cada paquete, con el mensaje `P<n>: <título del paquete>`. Una rama por paquete si te apetece, pero commit obligatorio.
6. Si un paquete te lleva más de 2 sesiones largas, está mal cortado: pártelo y avísame para reescribirlo.

---

## 10. Qué mides en el playtest (Fase 8 de tu documento, ahora medible)

El servidor emite eventos de telemetría anónimos a la tabla `playtest_events`. Métricas objetivo del MVP:

| Métrica | Objetivo |
|---------|----------|
| Tiempo desde escanear el QR hasta estar en la sala | < 15 s (mediana) |
| Salas creadas que llegan a empezar partida | > 80 % |
| Partidas empezadas que llegan al final | > 70 % |
| Grupos que piden revancha | > 60 % |
| Latencia acción → estado nuevo en el móvil | < 250 ms (p95) |
| Reconexiones que recuperan la partida | > 95 % |
| Preguntas del tipo "¿y ahora qué hago?" por partida | < 2 |

Si la última métrica falla, el problema es de interfaz, no de reglas. Si falla la de revancha, el problema es el juego, no el código.
