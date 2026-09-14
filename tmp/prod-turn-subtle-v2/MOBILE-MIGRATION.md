# Roadmap de Ronda: web, Google Play y App Store

Este archivo es la **fuente única de verdad** para convertir Ronda en una
aplicación distribuible. Debe actualizarse al terminar cada sesión para que un
chat nuevo pueda continuar sin reinterpretar el proyecto.

La arquitectura y las reglas siguen estando gobernadas por `00-MASTER.md` y
`01-CONTRATOS.md`. Este documento solo gobierna el camino de publicación.

## Panel de control

| Campo | Estado |
|---|---|
| Última actualización | 9 de agosto de 2026 |
| Fase actual | **Fase 1 — producción online** |
| Próxima acción | Proporcionar Postgres de producción, autenticación de Fly.io/Vercel y dominio; después desplegar y completar una partida desde dos redes móviles |
| Android | Preparado a nivel de arquitectura; proyecto nativo aún no creado |
| iPhone | Preparado a nivel de arquitectura; proyecto nativo aún no creado |
| Bloqueo externo actual | `.env` solo apunta a localhost; no hay Postgres local escuchando, `flyctl` no está instalado y el token Vercel disponible responde 403 |
| Estado Git | Hay cambios locales de varias sesiones; revisar `git status` antes de editar |

Leyenda:

- `[x]` terminado y comprobado.
- `[ ]` pendiente.
- `BLOQUEADO` necesita una cuenta, dato o acción del usuario.
- Una fase no se considera terminada hasta cumplir su **puerta de salida**.

## Resumen de fases

| Fase | Resultado esperado | Estado |
|---|---|---|
| 0. Base app-ready | PWA y código preparados para una futura capa nativa | Terminada |
| 1. Producción online | Ronda funciona por Internet con HTTPS/WSS | Siguiente |
| 2. Beta web estable | Partidas reales, privacidad y recursos definitivos | Pendiente |
| 3. Base móvil compartida | Proyecto Capacitor y decisión de empaquetado cerrada | Pendiente |
| 4. Google Play | `.aab`, prueba cerrada y publicación Android | Pendiente |
| 5. App Store | Build iOS, TestFlight y publicación iPhone/iPad | Pendiente |
| 6. Operación | Actualizaciones, monitorización y mantenimiento | Pendiente |

## Decisiones ya tomadas

Estas decisiones no deben volver a debatirse en cada chat salvo que aparezca
evidencia técnica nueva:

1. **Una sola lógica de juego.** `packages/engine` y `packages/protocol` se
   comparten entre web, Android e iOS.
2. **Online primero.** No se crea el binario móvil hasta verificar partidas
   reales en producción.
3. **Capacitor es la ruta prevista.** Permitirá añadir Android/iOS y funciones
   nativas conservando la base web.
4. **No activar `output: 'export'` todavía.** Las rutas dinámicas
   `/sala/[code]`, `/mesa/[code]` y `/unirse/[code]` dependen de Next.js.
5. **Una sola instancia del servidor.** Las salas activas viven en memoria;
   escalar horizontalmente requiere antes un rediseño.
6. **Sin anuncios, pagos ni analítica de terceros por ahora.** Añadirlos cambia
   privacidad, formularios de tienda y revisión.
7. **Las APIs de dispositivo pasan por una capa común.** La UI no debe importar
   directamente APIs de Android/iOS. El punto de entrada es
   `apps/web/src/lib/app-platform.ts`.

## Fase 0 — Base app-ready

Objetivo: conservar la web actual y evitar que la futura versión móvil obligue
a rehacer la aplicación.

- [x] Manifest PWA con identidad estable.
- [x] Service worker limitado al shell y recursos; nunca cachea el estado vivo
  de una partida.
- [x] Aviso de instalación PWA cuando el navegador lo permite.
- [x] Metadata compatible con pantalla completa y web app de Apple.
- [x] Capa `app-platform.ts` preparada para compartir, hápticos y futuros
  plugins nativos.
- [x] Validación de `NEXT_PUBLIC_SERVER_URL`; HTTPS obligatorio en el navegador
  de producción.
- [x] Configuración de tracing de Next.js fijada a la raíz del monorepo.
- [x] Typecheck correcto.
- [x] Build web de producción correcto.
- [x] 298 tests correctos y 4 pruebas de base de datos omitidas por diseño.
- [ ] Crear un punto de control Git limpio cuando el usuario pida
  commit/staging. No hacerlo automáticamente desde otro chat.

**Puerta de salida:** cumplida. Se puede comenzar la producción online.

## Fase 1 — Producción online

Objetivo: que dos o más personas jueguen desde Internet sin depender de la
Wi-Fi de desarrollo.

### Infraestructura

- [ ] `BLOQUEADO` Crear o elegir la base de datos Postgres en Supabase, Neon u
  otro proveedor.
- [ ] Ejecutar las migraciones con la conexión directa de Postgres.
- [ ] Desplegar `apps/server` con HTTPS/WSS.
- [ ] Mantener exactamente una instancia del servidor viva.
- [ ] Configurar `DATABASE_URL` en el servidor.
- [ ] Configurar `CORS_ORIGIN=https://<dominio-web>` en el servidor.
- [ ] Comprobar `GET /health` y verificar `ok: true`.
- [ ] Desplegar `apps/web` en Vercel o equivalente.
- [ ] Configurar en la web:

  ```text
  NEXT_PUBLIC_SERVER_URL=https://<servidor-publico>
  ```

- [ ] Elegir un dominio estable. Es recomendable antes de crear enlaces
  universales, fichas de tienda y política de privacidad.

### Prueba de salida

- [ ] Móvil A crea una sala usando datos móviles.
- [ ] Móvil B se une desde otra red mediante código.
- [ ] El QR abre el enlace correcto.
- [ ] Se completa una partida de Chinchón.
- [ ] Se completa una partida de Pocha.
- [ ] Se completa una partida de Mus con cuatro jugadores.
- [ ] Cambiar de Wi-Fi a datos durante una partida recupera la conexión.
- [ ] Cerrar y volver a abrir la PWA recupera la sala cuando corresponde.
- [ ] La pantalla `/mesa/[code]` funciona en tablet o tele.

**Puerta de salida:** al menos una sesión completa sin errores críticos desde
dos redes externas y reconexión comprobada.

## Fase 2 — Beta web estable

Objetivo: probar el producto real antes de envolverlo en aplicaciones nativas.

### Calidad

- [ ] Ejecutar las sesiones definidas en `PLAYTEST.md`.
- [ ] Registrar errores reproducibles y corregir los bloqueantes.
- [ ] Verificar Chrome Android, Safari iPhone y una tablet.
- [ ] Comprobar tamaños pequeños, safe areas y modo horizontal de `/mesa`.
- [ ] Verificar sonido, vibración, suspensión y regreso desde segundo plano.
- [ ] Revisar consumo y estabilidad del servidor durante varias salas.

### Contenido y legal

- [ ] `BLOQUEADO` Confirmar titular público: persona o empresa.
- [ ] `BLOQUEADO` Confirmar email público de soporte y privacidad.
- [ ] Crear una página pública de política de privacidad.
- [ ] Documentar exactamente qué se almacena: apodo, token local, partidas,
  estadísticas y telemetría existente.
- [ ] Decidir cuánto tiempo se conservan partidas y telemetría.
- [ ] Sustituir todas las cartas de terceros con marca de agua por arte propio
  o con licencia comercial verificable.
- [ ] Confirmar licencias de fuentes, sonidos, iconos y demás recursos.
- [ ] Decidir público objetivo y edades; no marcar público infantil sin revisar
  las políticas específicas de familias.
- [ ] Decidir monetización: gratis, anuncios, compras o pago único. La opción
  inicial recomendada es gratis y sin SDKs publicitarios.

**Puerta de salida:** tres sesiones de playtest terminadas, cero errores que
impidan una partida y recursos/privacidad aptos para distribución pública.

## Fase 3 — Base móvil compartida

Objetivo: crear una sola capa móvil que pueda generar Android e iOS.

### Decisión técnica obligatoria

Antes de generar los proyectos nativos se hará un prototipo corto para elegir:

- **Opción A: contenedor conectado a la web pública.** Más rápido, pero depende
  totalmente de la URL remota y en Apple debe demostrar que no es una simple
  página web envuelta.
- **Opción B: shell web local dentro de Capacitor.** Más sólido para tiendas,
  pero exige adaptar el frontend de Next para que las rutas dinámicas funcionen
  sin un servidor Next embebido.

No activar ninguna opción en producción sin probar creación de sala, QR,
reconexión, segundo plano y enlaces entrantes.

### Tareas

- [ ] `BLOQUEADO` Elegir identificador definitivo, por ejemplo un dominio
  invertido propiedad del titular. No inventarlo en un chat.
- [ ] Crear `apps/mobile` como paquete del monorepo.
- [ ] Instalar `@capacitor/core` y `@capacitor/cli`.
- [ ] Añadir `@capacitor/android` y `@capacitor/ios`.
- [ ] Crear `capacitor.config.ts` con nombre, identificador y estrategia web.
- [ ] Añadir proyecto Android.
- [ ] Añadir proyecto iOS.
- [ ] Conectar compartir enlaces a la capa común.
- [ ] Conectar hápticos a la capa común.
- [ ] Tratar botón Atrás de Android sin abandonar una partida por accidente.
- [ ] Tratar safe areas, teclado, suspensión y regreso a primer plano.
- [ ] Configurar enlaces de invitación que abran la sala correcta.
- [ ] Documentar el proceso reproducible de sincronización y build.

Referencia: [documentación oficial de Capacitor](https://capacitorjs.com/docs).

**Puerta de salida:** una build Android y una build iOS de desarrollo completan
el flujo crear → unirse → jugar → reconectar usando el mismo servidor.

## Fase 4 — Google Play / Android

Objetivo: publicar Ronda en Google Play sin bifurcar el juego.

### Trabajo técnico

- [ ] Configurar el proyecto Android y el nivel de API exigido en la fecha de
  envío. Desde el 31 de agosto de 2026, las apps nuevas deben apuntar a Android
  16 / API 36 o posterior; volver a verificar antes de publicar.
- [ ] Configurar icono adaptativo, nombre, splash y colores.
- [ ] Mantener únicamente los permisos necesarios, inicialmente Internet.
- [ ] Probar teléfonos y tablets con varias versiones de Android.
- [ ] Probar instalación limpia, actualización y regreso desde segundo plano.
- [ ] Configurar Play App Signing y generar el `.aab` firmado.
- [ ] Guardar de forma segura la clave de subida y su procedimiento de copia.

### Play Console

- [ ] `BLOQUEADO` Crear/verificar la cuenta de desarrollador de Google Play.
- [ ] Crear la ficha: título, descripción, categoría, email y países.
- [ ] Crear icono, capturas y gráfico promocional definitivos.
- [ ] Publicar la URL de privacidad.
- [ ] Completar Seguridad de los datos.
- [ ] Completar declaración de anuncios.
- [ ] Completar audiencia y clasificación por edades.
- [ ] Proporcionar instrucciones de acceso al revisor si fueran necesarias.
- [ ] Subir la primera versión a prueba interna.
- [ ] Corregir errores del informe previo al lanzamiento.
- [ ] Si la cuenta personal está sujeta al requisito actual, mantener al menos
  12 testers en prueba cerrada durante 14 días. Conviene invitar a más de 12.
- [ ] Solicitar acceso a producción.
- [ ] Publicar de forma gradual y comprobar errores/reseñas.

El usuario debe realizar personalmente verificación de identidad, pagos,
aceptación de contratos y acciones legales de la cuenta. El trabajo técnico,
los textos y los archivos pueden prepararse desde el proyecto.

Referencias oficiales: [crear y configurar la app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=es),
[API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878?hl=es)
y [canales de prueba](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es).

**Puerta de salida:** versión pública instalable desde Google Play y una partida
real completa desde la build publicada.

## Fase 5 — App Store / iPhone e iPad

Objetivo: reutilizar la base móvil y publicar una experiencia válida para iOS.

### Trabajo técnico

- [ ] `BLOQUEADO` Disponer de un Mac con una versión de Xcode aceptada por App
  Store Connect, o configurar un servicio de build macOS.
- [ ] Configurar Bundle ID y equipo de firma.
- [ ] Configurar iconos y launch screen de iOS.
- [ ] Revisar safe areas, teclado, audio, hápticos y gestos del sistema.
- [ ] Probar suspensión prolongada y recuperación del socket.
- [ ] Probar invitaciones y apertura de enlaces de sala.
- [ ] Añadir suficiente integración y experiencia de juego para que no se
  presente como una simple web envuelta.
- [ ] Generar un Archive válido y subirlo a App Store Connect.

### App Store Connect

- [ ] `BLOQUEADO` Crear/verificar la cuenta de Apple Developer.
- [ ] Crear la ficha con nombre, categoría, soporte y privacidad.
- [ ] Completar App Privacy con datos coherentes con Google Play y la web.
- [ ] Preparar capturas de los tamaños de dispositivo exigidos.
- [ ] Subir una build a TestFlight.
- [ ] Realizar una beta con varios iPhone/iPad.
- [ ] Corregir fallos y enviar la versión a revisión.
- [ ] Responder a la revisión con instrucciones claras sobre salas y QR.
- [ ] Publicar y verificar la build descargada desde App Store.

Referencias oficiales: [subir builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
y [guías de revisión](https://developer.apple.com/app-store/review/guidelines/).

**Puerta de salida:** versión pública instalable desde App Store y una partida
real completa desde la build publicada.

## Fase 6 — Operación y actualizaciones

- [ ] Definir versión visible y número de build para web, Android e iOS.
- [ ] Documentar cómo actualizar sin romper salas activas.
- [ ] Monitorizar `/health`, errores del servidor y uso de base de datos.
- [ ] Crear copias de seguridad y probar restauración.
- [ ] Mantener dependencias, API objetivo de Android y Xcode al día.
- [ ] Revisar formularios de privacidad cuando cambie cualquier SDK o dato.
- [ ] Probar actualización desde la versión anterior antes de cada envío.
- [ ] Mantener notas de versión y un registro de incidencias de producción.

## Matriz mínima de aceptación móvil

Cada plataforma debe superar todos estos flujos antes de publicación:

| Flujo | Web/PWA | Android | iOS |
|---|---:|---:|---:|
| Crear sala | [ ] | [ ] | [ ] |
| Unirse por código | [ ] | [ ] | [ ] |
| Unirse por QR/enlace | [ ] | [ ] | [ ] |
| Completar Chinchón | [ ] | [ ] | [ ] |
| Completar Pocha | [ ] | [ ] | [ ] |
| Completar Mus | [ ] | [ ] | [ ] |
| Cambiar de red y reconectar | [ ] | [ ] | [ ] |
| Suspender y recuperar | [ ] | [ ] | [ ] |
| Pantalla de mesa | [ ] | [ ] | [ ] |
| Actualizar sin perder datos válidos | [ ] | [ ] | [ ] |

## Riesgos que ningún chat debe ignorar

1. **Cartas sin licencia:** bloquean una publicación comercial.
2. **Servidor en memoria:** dos instancias pueden dividir una misma sala.
3. **URL local:** `192.168.x.x` y `localhost` no sirven para usuarios externos.
4. **Privacidad incompleta:** apodos, tokens, estadísticas y telemetría deben
   estar declarados con precisión.
5. **Wrapper demasiado simple en Apple:** puede fallar la revisión por
   funcionalidad mínima.
6. **Claves de firma:** perderlas complica o impide futuras actualizaciones.
7. **Cambios locales ajenos:** el repositorio puede estar sucio; nunca descartar
   ni sobrescribir cambios sin identificarlos.

## Registro de avance

Añadir una línea por sesión; no borrar el historial.

- **2026-08-07:** auditada la arquitectura. Añadidos instalación PWA,
  metadata Apple, capa de plataforma futura, validación HTTPS del servidor,
  configuración de monorepo y tests de URL. Build y suite correctos.
- **2026-08-07:** convertido este documento en roadmap operativo para web,
  Google Play y App Store.
- **2026-08-07:** ejecutada la auditoría de la Fase 1. Typecheck, servidor y
  suite correctos (295 tests y 4 omisiones de BD); no se desplegó porque la
  configuración disponible es local, no hay Postgres escuchando en localhost,
  falta `flyctl` y Vercel requiere una autenticación válida. El lint global
  sigue incluyendo worktrees auxiliares de `.claude` y el build web local no
  finalizó dentro de cinco minutos durante la generación estática.
- **2026-08-09:** verificado el entorno local de nuevo: `/health` responde
  `ok: true`, el build web y del servidor terminan correctamente, y la suite
  pasa con 298 tests (4 omisiones de BD). El lint global queda limpio tras
  excluir los worktrees auxiliares de `.claude` y temporales de `tmp`; la
  producción sigue bloqueada por Postgres, `flyctl` y credenciales externas.

## Relevo para un chat nuevo

Pegar este texto al comenzar otra conversación:

```text
Continúa el roadmap de publicación de Ronda.

1. Lee completos 00-MASTER.md, 01-CONTRATOS.md y MOBILE-MIGRATION.md.
2. Lee DEPLOY.md si la fase actual es producción online.
3. Ejecuta git status y conserva todos los cambios ajenos o sin confirmar.
4. Mira el “Panel de control” de MOBILE-MIGRATION.md.
5. Trabaja solo en la “Próxima acción” y respeta las decisiones ya tomadas.
6. No actives output: 'export', anuncios, pagos, analítica ni escalado del
   servidor salvo que el roadmap se actualice con una decisión explícita.
7. Verifica el trabajo con pruebas proporcionales al cambio.
8. Al terminar, actualiza checkboxes, “Próxima acción”, fecha y registro de
   avance en MOBILE-MIGRATION.md.
9. Explica qué puede hacer el agente y qué necesita cuenta/acción del usuario.
```
