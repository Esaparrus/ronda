# CONTEXTO — pégalo al principio de CADA sesión

Estás trabajando en **Ronda**, una web-app instalable (PWA) para jugar a juegos de cartas con un grupo de personas que están juntas alrededor de una mesa, cada una con su móvil como mano privada, y opcionalmente una tele como tablero público. El primer y único juego del MVP es el **Chinchón**.

## Arquitectura (no la cuestiones)

```
apps/web      Next.js App Router + Tailwind v4 + Zustand   (solo pinta vistas)
apps/server   Node 22 + node:http + socket.io + pg         (autoridad total)
packages/protocol   zod: mensajes, vistas, config, errores (contrato compartido)
packages/engine     TypeScript puro y determinista         (reglas del juego)
db/migrations       SQL plano
```

- El cliente **nunca** decide nada. Dice «quiero hacer X» y el servidor responde con el estado nuevo.
- Ninguna carta privada de un jugador viaja jamás al socket de otro. Ni oculta, ni «solo para animaciones».
- El motor es puro: sin `Math.random`, sin `Date`, sin red, sin base de datos. El RNG lleva semilla dentro del estado.
- Se envía siempre el estado completo ya censurado (`PlayerView` / `TableView`), nunca diferencias.

## Reglas de trabajo

1. **Implementa exactamente lo que dice el contrato que te he pegado.** Si algo te parece mejorable, escríbelo como comentario `// TODO(unai): ...` y sigue con lo especificado. No lo cambies por tu cuenta.
2. **No toques ficheros que no pertenezcan a tu paquete.** Si necesitas cambiar un tipo de `packages/protocol` o `packages/engine`, **para y pregunta**.
3. **Antes de escribir código, lista los ficheros que vas a crear y espera confirmación.**
4. **Solo estas dependencias:** `zod`, `socket.io`, `socket.io-client`, `pg`, `next`, `react`, `react-dom`, `zustand`, `tailwindcss`, `qrcode`, `vitest`, `typescript`, `eslint`, `prettier`. Cualquier otra, pídela y espera.
5. TypeScript `strict`. Prohibidos `any`, `!` de no-nulo y `@ts-ignore`.
6. Nombres de código en inglés. Textos de interfaz en castellano, con la voz definida en el contrato §8.5.7: frase corta, verbo activo, sin exclamaciones, sin disculpas, siempre diciendo qué hacer.
7. Cada entregable incluye sus tests. Un paquete no está hecho si `pnpm typecheck && pnpm lint && pnpm test` no pasa limpio.
8. Sin `console.log` en producción. Sin código comentado. Sin ficheros «por si acaso».

## Lo que NO existe en el MVP

Chat, voz, reacciones, amigos, cuentas, login, email, avatares personalizados, estadísticas históricas, equipos, torneos, rankings, IA rival, juego offline, Bluetooth, editor de juegos, segundo juego, otros idiomas.

Si un requisito te lleva ahí, es que lo has entendido mal. Vuelve al contrato.

El roadmap posterior al MVP para juegos independientes está en
`06-ROADMAP-JUEGOS.md`. Solo se trabaja en esos juegos cuando la sesión lo
autorice expresamente y después de leer ese documento: Banderas, Cifras, Precio
justo, Quién lo haría y Completa la frase no se mezclan con Chinchón ni se
implementan como un modo improvisado.

## Diseño en una frase

No es un casino: es una mesa de bar con una baraja bien impresa. Fondo tinta `#14161F`, papel hueso `#EDE6D8`, acción bermellón `#D4462F`, y los cuatro palos con su color. Cartas dibujadas en SVG por código, nunca imágenes. Una sola acción principal visible en cada momento.
