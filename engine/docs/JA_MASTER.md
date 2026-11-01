## Regla permanente de continuidad — 2026-10-29

Por solicitud expresa del propietario, después de cada modificación o entrega del proyecto, incluir en la respuesta un prompt actualizado, autocontenido y listo para copiar en un chat nuevo, sin esperar a que el usuario lo pida ni a agotar la conversación. Resumir objetivo, repositorio, rama, PR, HEAD conocido, último cambio funcional, CI con enlace y estado realmente verificado, aceptación Windows, pendientes y siguiente paso concreto. Incluir las reglas de conservación, lectura de documentos maestros y verificación de GitHub antes de actuar. Si CI sigue en curso o falta validación física, decirlo explícitamente; no presentar pruebas pendientes como aprobadas. Conservar todo el backlog y no reiniciar el desarrollo. Actualizar también la documentación maestra para que la continuidad no dependa de la memoria de un chat.

**Estado al registrar:** último cambio funcional `312f2a52dab84ee01d078964adafd426f3f38945` (controles del centro en MainLayout); Actions #40914729997 en curso al consultar. Pausa de YouTube en una/varias pantallas confirmada por usuario; panel central nuevo aún pendiente Windows. Esta entrega sólo modifica documentación y no requiere instalador nuevo (paths-ignore del workflow). PR #2 permanece draft y main intacta.

---

## 2026-10-30 — RV1909: reparación conservadora del fallo de CI

**Causa confirmada por logs:** Actions #41097868170 (HEAD 241e677) aprobó 24/24 pruebas y falló en preparación de Biblia RV1909, antes de construir Windows. El servidor oficial eBible entregó ZIP con SHA-256 f0b20b2473b3ed30dcee584b2311b6a1db27b32e714f1a2b0e97d01ba179f284, distinto del esperado c901a31a89421eafa54e82a0a2ad94962c6889e3c5556c2a0834529789c4ac76. No se detectó fallo de las mejoras de Presentaciones.

**Cambio de seguridad:** en scripts/ja/build_rv1909.py se mantiene política cerrada de SHA-256, admitiendo solo esos dos archivos ZIP identificados en el URL oficial, sin permitir valores nuevos automáticamente. Se refuerzan controles semánticos de la edición RV1909 contra fuentes públicas: Génesis 1:1, Salmos 23:1 y Juan 3:16, normalizados por mayúsculas/tildes; siguen vigentes controles de 66 libros, 1189 capítulos, rangos de versículos y existencia de contenido. Un cambio no autorizado sigue fallando. La auditoría externa de huellas de VPL interna #41100795150 continúa pendiente para diseñar una huella estable de texto que resista reempaquetados futuros, sin relajar seguridad.

**Verificación pendiente:** Actions del nuevo commit y aceptación física Windows. Si se vuelve a regenerar el ZIP, debe fallar de forma segura y exigirse auditoría antes de aceptar. Conservar actualizaciones M1-03 de Presentaciones del commit 241e677, PR #2 draft, main intacta, y todos los pendientes M1-03/04/05/06/07, H1/T1/F1.


## 2026-10-30 — Diagnóstico seguro de error en preparación RV1909

Actions #41097868170 (HEAD 241e677) falló tras aprobar 24/24 pruebas, **antes de compilar**, porque el ZIP público de eBible RV1909 llegó con SHA-256 f0b20b2473b3ed30dcee584b2311b6a1db27b32e714f1a2b0e97d01ba179f284 en lugar del hash de ZIP fijo c901a31a89421eafa54e82a0a2ad94962c6889e3c5556c2a0834529789c4ac76. No es evidencia de regresión de Presentaciones. Se mantienen intactos todos los controles. No se ha aceptado nuevo ZIP ni levantado verificación de integridad.

Se añade flujo independiente de auditoría en Ubuntu `ja-rv1909-source-audit.yml`, que lista la huella de las entradas internas VPL y su estructura desde el sitio fuente sin compilar ni publicar. Objetivo: identificar una huella del contenido real estable pese a metadatos variables de ZIP; comparar con edición de dominio público y preservar verificaciones canónicas antes de habilitar nuevas compilaciones. Siguiente tarea: revisar resultado y corregir `build_rv1909.py` basándose en contenido validado; ejecutar CI y verificar artefacto. PR #2 draft, main intacta, pendientes M1-03/04/05/06/07, H1, T1, F1.


## 2026-10-30 — M1-03: restaurar panel central al volver a Presentaciones

**Evidencia Windows:** el operador muestra la presentación Hola seleccionada en el catálogo y el centro en Supervisando: Primario tras proyectar un video. El parche previo de Abrir sólo cubría el menú contextual. ShowButton devolvía temprano si el show ya estaba activo; Drawer y TopButton tampoco salían de supervisión.

**Corrección:** nueva función restoreJAPresentationWorkspace en jaControlledOutput.ts que limpia sólo el monitor elegido para supervisión. Se conecta al clic en Presentaciones del drawer (incluso si es la pestaña activa), a ShowButton para cualquier presentación incluyendo la ya seleccionada, al botón superior Presentación y a la acción contextual Abrir. No modifica outputs, slide, background, audio, reproducción, selección principal, grupos ni controles manuales de Controlar.

**Pruebas y aceptación:** prueba jaControlledOutput.test.ts añadida a CI para restaurar desde Primario/iPad e idempotencia. CI de este nuevo cambio y ensayo Windows pendientes. Probar video de Himnario/Multimedia/YouTube en Primario -> Controlar -> Presentaciones -> Hola, incluso con Hola ya seleccionada. Deben reaparecer diapositivas, conservarse reproducción y audio principal y no variar las otras salidas. Volver a Controlar debe funcionar; flechas y Enviar a… se deben conservar. Mantener PR #2 draft, no tocar main, preservar M1-03/04/05/06/07, H1, T1 y F1. Último CI anterior confirmado verde #40930709811 del commit f337ead.


## 2026-10-29 — M1-03: presentaciones con capa reversible, «Enviar a…» y navegación independiente

**Validación previa del operador:** «Abrir» ya funciona tras `333a96d` (CI #40925757434 verde). Reporta texto de presentación sobre videos/imágenes, valora esa composición pero solicita opción para mostrar solo el contenido, envío explícito a otros monitores y flechas como Biblia.

**Implementación propuesta en este cambio:** `OutData.jaSlideLayer.showOverMedia` es una preferencia específica de salida y `Output.svelte` oculta el render de la capa de diapositiva solo mientras hay un fondo multimedia, **sin borrar la diapositiva ni detener reproducción**. Botón contextual «Solo contenido»/«Texto + contenido» en cada vista de salida de `MultiOutputs.svelte`, visible cuando coinciden fondo+diapositiva; valor inicial preserva el comportamiento de superposición de FreeShow. En `ShowHeader.svelte` se reutilizan `JADestinationChooser` y `sendToJAOutputs("slide")` para emitir la presentación a uno o varios outputs elegidos, más botones anterior/siguiente. `jaPresentationNavigation.ts` conserva temporalmente la elección explícita por presentación y filtra destinos que realmente conservan ese show; `OutputHelper.advanceOutputs` respeta grupo, supervisión individual y principal JA, mientras `Slides.svelte` mantiene clic normal solo principal. Biblia conserva su controlador y prioridad previa. Sin reescribir motores ni alterar política principal-audio/auxiliar-silenciosa.

**Pruebas:** `jaPresentationNavigation.test.ts` incluido en el workflow (principal, grupo, supervisión, salida desconectada, Biblia, no fallbacks). CI/Windows no validados todavía. **Criterios de aceptación Windows:** «Hola» y video juntos, alternar visibilidad sin pausar video ni cambiar índice, pantalla secundaria intacta; solo principal/solo secundaria/grupo principal+auxiliar con otro medio en tercera pantalla; flechas físicas y botones anteriores/siguientes; un clic normal vuelve a ruta principal; cambios rápidos, screen hotplug, transiciones, Biblia, Himnario/Multimedia/YouTube y audio; verificar sincronía de diapositivas y sin envío colateral. No declarar completo hasta CI verde y prueba física. Pendientes M1-03 restante/M1-04/05/06/07, H1, T1 y F1 intactos.


## 2026-10-29 — M1-03: corregir «Abrir» para presentaciones mientras «Controlar» está activo

**Reporte y reproducción por lectura de código:** el operador muestra «Hola» en Presentaciones > menú contextual > «Abrir»; la vista central sigue supervisando video y no aparecen las diapositivas. `contextMenus.ts` resuelve «Abrir» como `preview`; `menuClick.ts` selecciona `activeShow`, pero `MainLayout.svelte` prioriza `jaControlledOutputId` y sustituye `Show` por `PreviewOutput`. Es un bloqueo de navegación/visibilidad, no evidencia de fallo del formato PPT ni del motor de diapositivas.

**Corrección mínima:** solo en `menuClick.ts`, acción `preview` con `sel.id === "show_drawer"`, validar que el show existe y salir del modo supervisión con `jaControlledOutputId.set("")` antes de invocar `openShow(showId)`. `Abrir` vuelve a presentar las diapositivas en el centro; «Controlar» permanece disponible para reactivarse expresamente. No llamar a `setOutput`, `clearSlide`, `VideoPlayer` ni alterar destino principal, audio o sesiones multipantalla.

**Validación:** revisión estática de causa, ruta del menú y cambio acotado realizada. GitHub Actions del nuevo commit y aceptación en Windows **pendientes**: iniciar YouTube o Himnario en principal, pulsar Controlar, menú contextual «Abrir» en «Hola», comprobar que aparecen sus diapositivas y que el video sigue reproduciéndose en principal con sonido; elegir una diapositiva y verificar proyección solo al principal. Probar también «Abrir» sin supervisión, «Editar», presentación ya seleccionada, retorno manual a Controlar, diferentes pantallas y presentación fuera de proyecto. Si el show no carga aun con la vista central libre, diagnosticar por separado caché/lectura de `showsCache`; si abre pero no proyecta, diagnosticar enrutamiento/capas de M1-03. No confundir CI verde con prueba física.

**Estado / continuidad:** unidad de reparación de M1-03; PR #2 draft, `main` intacta; conservar commit funcional anterior `312f2a5` y CI previo verde #40914729997. Pendientes M1-03/04/05/06/07, H1, T1 y F1 no eliminados. Tras esta corrección, revisar Actions/Windows antes de abordar el resto de Presentaciones y «Enviar a…».


## 2026-10-29 — M1: controles ausentes en el monitor central de «Controlar»

**Evidencia del operador:** con la versión basada en `2792ca1`, YouTube ya pausa en una y varias pantallas. El centro reproduce la imagen pero no muestra pausa ni barra de tiempo; también afecta la supervisión de Multimedia e Himnario. Audio funcional; medidor iframe sigue como mejora independiente.

**Causa confirmada:** `MainLayout.svelte` sustituye `Show` por `PreviewOutput` cuando existe `jaControlledOutputId` activo. Esa rama sólo tenía encabezado y monitor espejo, sin `MediaControls`. El espejo deshabilita interacción de sus contenidos por diseño. Cambiar `VideoShow` o la API de YouTube no añade controles a esta rama.

**Cambio acotado:** el monitor seleccionado conserva su imagen y añade debajo la instancia nativa `MediaControls big` con `currentOutput` y `outputId` de la misma salida supervisada. Área de 64 px fuera del lienzo recortado, siempre visible para fondos video/player, sin depender de hover. Se recrea al cambiar destino/medio para evitar arrastrar duración/estado de otro clip; se oculta para salida vacía, imagen, Biblia o stage. No se añade motor, polling propio, cambios de selección principal, ni se habilitan clics en todos los espejos. No se modifica el transporte YouTube ya validado ni el audio.

**Validación:** revisión de la ruta MainLayout → PreviewOutput y del contrato de MediaControls → VideoPlayer/videoSync por outputId. CI del nuevo commit y aceptación Windows pendientes. Pruebas existentes de CI conservadas; esta integración visual requiere comprobar el panel real. En Windows: Controlar Primario con YouTube, Multimedia e Himnario muestra pausa/reanudar, slider y ±10 s; ambos paneles reflejan el mismo estado. Controlar secundaria con otro clip afecta sólo esa sesión; grupo compartido obedece junto, audio sólo Primario. Cambiar destino/contenido, borrar, desconectar y volver a Vista previa normal no deja controles obsoletos. Revisar ancho reducido del panel. No declarar estos escenarios aceptados sin prueba.

**Continuidad:** conservar aceptación de pausa una/varias pantallas del operador y mantener pendiente el panel central hasta prueba de esta entrega. No avanzar de módulo. Backlog M1-03/04/05/06/07, H1, T1, F1 intacto; PR #2 draft, sin tocar main.

---

## 2026-10-29 — M1-03: restauración del control nativo de YouTube y panel central (CI y Windows pendientes)

**Evidencia Windows:** audio sí funciona, el equipo estaba silenciado; medidor del iframe no registra amplitud como la de archivos locales (UI pendiente, no falla de sonido). Sin embargo, el usuario sigue sin poder pausar YouTube desde los controles laterales ni interactuar normalmente con la vista previa central tras los commits anteriores, aunque CI estuviera verde. **No volver a trabajar sobre audio como si fuera causa.**

**Comparación con código conocido:** antes de la integración online (`a7ccd86`), `YouTubePlayer.svelte` reenviaba el evento nativo `ready` de IFrame API, con `event.target` = `YT.Player` (getPlayerState, pauseVideo, seekTo, isMuted *síncronos*). Los intentos previos lo cambiaron a la interfaz de promesas `youtube-player`, agregaron cola y `sessionActive` obligatorio para iniciar playback, y una capa `HoverButton` que ocultaba el botón pero seguía bloqueando al no haber salida proyectada. Esas modificaciones retiraron controles que FreeShow ya tenía.

**Solución de recuperación estructural:** volver a reenviar `ready` nativo en `YouTubePlayer.svelte` y al manejo síncrono nativo de `YouTube.svelte`, con un pequeño adaptador `decideYouTubeTransport` (play/pause solo si el estado real difiere del reloj de JA), sin colas de promesas. El iframe de proyección solo sigue el transporte cuando existe `videoSync`; la vista previa sin sesión vuelve a reproducir/controlar video de forma local, y cuando hay sesión vinculada puede dirigir acciones al `VideoPlayer` existente. `Player.svelte` sustituye explícitamente el objeto `videoData` al cambiar pausa/mute/loop para asegurar la actualización reactiva real de YouTube y del panel. `youtubeAudio.ts` pasa a adaptador nativo (en lugar de Promises), mantiene Primario audible/auxiliares y vista previa silenciados sin tocar flujo de audio que ya funciona. `VideoShow.svelte` deja de cubrir el iframe con el overlay de proyección cuando es online y presenta botón pequeño «Proyectar» fuera de los controles nativos; mantiene clic normal en principal. `jaOnlinePreviewOutput` del hito anterior mantiene destino del monitor seleccionado mediante Controlar, sin cambiar cuál es principal. No modifica multimedia local, Himnario, Biblia, `main` ni políticas audio.

**Pruebas unitarias nuevas `youtubeTransport.test.ts`:** cambio de estado si el iframe sigue reproduciendo cuando JA ordena pausa, reanudar si está detenido, no enviar órdenes duplicadas mientras estado coincide; `youtubeAudio.test.ts` prueba API nativa y las reglas de silencio; se conservan pruebas de rutas del panel central. Se añaden a Actions antes del build.

**Windows:** en versión nueva, comprobar YouTube en Primario: pausa, reanudar y adelantar por MediaControls; en vista previa central antes de proyectar, interacción nativa YouTube con el clip silenciado; durante proyección, sus controles play/pause deben afectar la sesión de JA; Controlar iPad y repetir solo salida seleccionada; grupo Primario+iPad con sonido solo Primario; cambio rápido, seek sin bucles y sin afectar reproducción local. **CI compilando no prueba transporte real**; dejar regresión abierta hasta confirmar en Windows. El medidor del audio iframe queda pendiente como limitación técnica, no inventar barras ni silenciar todo. Conservar pendientes M1-03/04/05/06/07, Himnario, T1, F1, PR #2 draft, no tocar main.

---

## 2026-10-29 — M1-03 YouTube: el audio sí llega; restaurar controles de consola y vista previa (CI/Windows pendientes)

**Nueva evidencia del usuario:** el sonido de YouTube sí se escuchaba; el ordenador estaba silenciado. La ausencia de movimiento en el medidor JA provocó una falsa impresión de falta de audio. **Mantener la política de sonido actual y no forzar audio en secundarias.** Audio del iframe YouTube no pasa por un `HTMLAudioElement` propio ni por el `AudioAnalyser` local de JA, por lo que el medidor existente no puede mostrar amplitud real sin captura/loopback separada. No dibujar barras simuladas. Registrar como limitación de UI (indicador de audio en línea o integración de medición real solo tras estudio técnico).

**Falla restante Windows:** pausa/reanudar/seek de YouTube desde `MediaControls` no actúan confiablemente y el iframe de la vista previa central dejó de responder a clics. Auditoría directa revela una causa concreta de la vista previa: `VideoShow.svelte` contiene `HoverButton` con `hide={playingInOutput}`, pero `HoverButton.svelte` ocultaba visualmente `.overlay.hidden` sin `pointer-events:none`. La capa invisible interceptaba clics sobre los controles nativos de YouTube. Aparte, `VideoShow.svelte` elegía la primera `linkedOutputIds[0]` de cualquier sesión para el video actual e ignoraba `jaControlledOutputId`, por lo que el panel central podía manipular una pantalla diferente de la que el operador pulsó Controlar. `YouTube.svelte` guardaba `commandedPlayback` para ignorar ecos de comandos; el marcador podía permanecer obsoleto y ocultar un clic real posterior.

**Corrección acotada:** `HoverButton.svelte` pone `pointer-events:none` únicamente en el overlay oculto, devolviendo el clic al contenido subyacente; visible sigue funcionando. `VideoShow.svelte` conserva el comportamiento anterior para medios locales y usa `resolveJAOnlinePreviewOutput()` solo para player YouTube/Vimeo: prioriza Controlar cuando realmente hay sesión de ese clip, luego Primario si reproduce ese mismo clip, luego la salida de sesión existente; sin sesión, recurre a la principal seleccionada. Pruebas unitarias de rutas separadas/conjuntas y prioridades en `jaOnlinePreviewOutput.test.ts`. `YouTube.svelte` deja de utilizar el marcador de eco acumulable; en el iframe de vista previa solo reenvía play/pause cuando difiere del estado autoritativo `videoData.paused`; el iframe de proyección vuelve a sincronizarse si se pausa sin que el reloj lo indique. No se cambia `VideoPlayer` de archivos, `videoSync`, `youtubeAudio`, ventanas Electron, Biblia, Himnario, estilos ni monitor principal JA.

**Aceptación:** CI del HEAD nuevo; prueba Windows en primaria: controlar YouTube mediante pausa/reanudar en barra lateral; adelantar desde slider; controlar desde botones nativos del video central (capa invisible ya no intercepta clic), comprobar que se detiene realmente en salida. Enviar el mismo clip a Primario+iPad y confirmar control de sesión compartida y audio solo Primario; enviar dos clips independientes, pulsar Controlar iPad y operar solo ese clip desde centro/lateral; volver a Primario y comprobar su clip; sustitución/limpieza y video local Himnario deben permanecer correctos. Medidor local puede quedarse sin lectura real para iframe — no etiquetar como mute cuando hay audio. El build verde no reemplaza la prueba física. Conservar M1-03/04/05/06/07, H1, T1, F1 y pendientes previos; PR #2 draft y main intacta.

---

**Protección contra colas de órdenes de YouTube:** `videoSync` refresca el mismo objeto `videoData` con frecuencia; el transporte del iframe ya no encola `getPlayerState/playVideo/pauseVideo` por cada tick, sino solo cuando cambia efectivamente `paused` (o se detecta inicio involuntario). Esto evita colas crecientes, latencia de pausa y consumo innecesario en PCs modestos. Sin cambios en audio o reproductor local.

## 2026-10-28 — M1-03 reparación conjunta: sonido + pausa + control desde vista previa YouTube (CI/Windows pendientes)

**Problema Windows:** usuario confirma YouTube sin sonido, pausa del controlador no afecta iframe y la vista previa central perdió controles; captura con iPad proyectando y Primario vacío, además de pruebas previas con Primario. No confundir silencio esperado de vista previa/auxiliar con fallo de Primario. Previo commit `2c8e37f` pasó Actions #40812158506 pero no resolvió función física.

**Causa de código verificable:** `YouTubePlayer.svelte` creaba el proxy `youtube-player` pero reenviaba `onReady(e)` de la API nativa, cuyo `e.target` es el `YT.Player` crudo, no el proxy. `YouTube.svelte` lo trataba como proxy asíncrono (ver `youtubeAudio.ts`), causando inconsistencia de contratos. Además `playerVars.autoplay=1` arrancaba un iframe independientemente del reloj virtual `VideoPlayer`, y `onReady()` sobrescribía `videoData.paused` con `focusMode`. Los eventos play/pause del iframe de la vista previa no estaban conectados al controlador global. El programa puede mostrar icono ▶ mientras YouTube reproduce, y no responder a Pausa.

**Solución localizada:** `YouTubePlayer.svelte` entrega siempre el proxy `youtube-player` en ready. `Player.svelte` marca `sessionActive` solo al recibir `videoSync` para esa salida; sin sesión activa, YouTube no puede autoiniciarse ni emitir sonido. `YouTube.svelte` usa `autoplay:0`, respeta el estado de pausa del reloj de JA y serializa comandos play/pause; en vista previa, cuando existe sesión sincronizada, retransmite cambios manuales del iframe a `VideoPlayer.play/pause(id,outputId)` sin duplicar los eventos generados por comandos de JA. La vista previa permanece silenciada, mientras el iframe de una salida física real solo puede sonar con sesión activa y `videoData.muted=false`. La política `shouldMuteYouTube` tiene nuevas pruebas unitarias. No cambia transporte audiovisual local, Biblia, selector universal, cambios de pantallas, `main` ni Vimeo.

**Windows requerido:** CI del HEAD final; Primario solo con Yo voy debe oírse; iPad solo no debe sonar; Primario+iPad debe sonar solo en Primario; pausar/reanudar desde MediaControls tanto en una pantalla como en ambas; play/pause en iframe de vista previa central debe actualizar reloj de pantalla controlada; seek, cambio de video y volumen deben responder; proyección local de Himnario con audio no debe interrumpirse al enviar YouTube a secundaria; desconexiones y pantallas secundarias independientes. Tomar estado de icono mute de la vista previa como normal; verificar físicamente la ventana Primario, no solo una miniatura. Si el sonido sigue mudo con Primario proyectando, registrar estado `videoData.muted` vs `player.isMuted()` y ventana de salida para identificar causa restante. No marcar cerrado hasta prueba física. Proteger M1-03 universal restante, M1-04/05/06/07, H1/T1/F1 y todos pendientes previos; PR #2 continúa draft sin fusionar.

---

## 2026-10-28 — M1-03 regresión YouTube: incompatibilidad confirmada con API asíncrona (CI y Windows pendientes)

**Windows:** el operador volvió a confirmar que los videos YouTube siguen silenciados incluso en Primario tras el intento `65cf1b9`. Auditoría de `YouTube.svelte` y **documentación de la dependencia real `youtube-player`** (github.com/gajus/youtube-player) identifica el error concreto: a diferencia del `YT.Player` nativo, cada método `player.isMuted()`, `getVolume()`, `getCurrentTime()`, `getPlayerState()` retorna **Promise**. El componente los usaba como booleano/número inmediato; por tanto el condicional `if (!player.isMuted())` no funciona y el polling/seek tampoco operan como se creía. No se debe seguir cambiando flags de Electron o silencios globales sin resolver esta incompatibilidad.

**Implementación:** nuevo adaptador tipado `youtubeAudio.ts`, con `await player.isMuted()` antes de decidir `mute()/unMute()`; en primera inicialización audible restaura `getVolume()===0` a 100 una sola vez, sin anular posteriores ajustes manuales. `YouTube.svelte` serializa las operaciones de audio para que un cambio asíncrono antiguo no desmute una salida secundaria, conserva `shouldBeMuted` original basado en ventana y el estado audiovisual JA. El sondeo de tiempo, duración y búsqueda ahora esperan los métodos Promise, con una sola lectura en vuelo para no cargar PCs modestos. No cambia vídeo local, `VideoPlayer.isOutputMuted`, destinos, pantalla principal ni audio de Vimeo. `youtubeAudio.test.ts` cubre primaria audible, volumen cero, secundarias y comandos redundantes; GitHub Actions ejecuta esa prueba junto a migración existente.

**Validación física obligatoria:** CI verde del HEAD final + Windows: YouTube Primario tiene audio, YouTube enviado a Primario+iPad solo suena en Primario, auxiliar único no altera audio de video local principal, controles internos de silencio y volumen, cambio rápido de cantos, pausa/reanudación, scrubbing desde control y 3 monitores. Si falla, inspeccionar logs e iframe/autoplay sin inventar causa; CI no equivale a sonido real. No declarar cerrada la incidencia sin prueba. Preservar M1-03 universal restante, M1-04/05/06/07, H1, T1, F1, diseño JA, rendimiento y backlog. PR #2 draft; no tocar `main`.

---

## 2026-10-28 — M1-03 online: YouTube silenciado incluso en Primario (pendiente CI y Windows)

**Incidente reportado:** tras integrar YouTube/Vimeo en «Enviar a…», la reproducción online aparece silenciada en Primario, además de secundarias. Captura muestra el control mute del iframe de YouTube. La salida secundaria DEBE permanecer silenciosa, pero Primario DEBE tener audio.

**Causa revisada en código:** `Player.svelte` crea `videoData` inicialmente con `muted:true`. `VideoPlayer.createAudio(isOnline)` esperaba secuencialmente `getYouTubeData` (oEmbed + página watch) o `getVimeoData` antes de registrar una sesión virtual y publicar `playingVideoState` para desbloquear Primario. Esas solicitudes de metadatos pueden tardar o fallar por red; no deberían bloquear el reloj ni el cambio de estado a `muted:false` de la salida primaria. `YouTube.svelte` enviaba `unMute()` solo en una actualización reactiva y no volvía a conciliar el mute real al empezar a reproducirse el iframe. Electron ya tiene `autoplayPolicy: "no-user-gesture-required"` para ventanas de salida, por lo que no se toca la configuración de seguridad ni los flags globales.

**Corrección limitada:** `VideoPlayer.createAudio(isOnline)` devuelve inmediatamente el reloj virtual; las consultas de duración siguen sin bloquear el arranque, actualizan solo el objeto existente y reactivan sincronización únicamente si la sesión continúa viva. `YouTube.svelte` reconcilia `player.isMuted()` con `shouldBeMuted` al cargar, al recibir el estado JA y al entrar en reproducción, sin emitir audio en vista previa ni en secundarios. No se modifican `isOutputMuted`, `getJAMainOutput`, la selección universal, el motor HTMLAudioElement de multimedia local ni `main`.

**Criterios de aceptación Windows:** reproducir uno de los cantos juveniles por clic normal solo en Primario y comprobar que aparece y se escucha; «Enviar a…» Primario+iPad debe tener sonido solo en Primario; enviar solo a Samsung debe mostrar video sin interferir con el audio de Primario; cambiar videos seguidos, pausa/reanudación y opción de mute del operador; luego probar Vimeo con una entrada existente. Comprobar fallos/red lenta de metadatos y permisos de inserción del video; CI verde no garantiza audio físico. M1-03/M1-05/M1-06/M1-07/H1/T1/F1 conservados. PR #2 draft; sin tocar `main`.

---

**Cobertura en GitHub Actions:** `.github/workflows/validate-ja-base.yml` ejecuta ahora `npx vitest run --config config/testing/vitest.config.ts src/electron/data/jaYouthOnlineMigration.test.ts` después de `npm ci` y antes del build. Esto protege la preservación de videos de usuario, actualización de muestras originales e idempotencia, sin cambiar el paso de compilación/instalador existente. Pruebas de reproductor online y hardware siguen siendo manuales Windows.

**Refinamiento de seguridad del mismo hito:** `PlayerVideos.svelte` conserva el indicador de tarjeta original `findMatchingOut` (solo muestra salidas activas válidas), y para un envío simultáneo limpia diapositivas exclusivamente de los IDs elegidos con UNA llamada `clearSlide(true, ids)`, evitando ejecutar varias veces las acciones globales de limpieza por pantalla. No cambia el audio, reproductores ni selección de destinos. CI del HEAD final + Windows pendientes.

## 2026-10-28 — M1-03 Fase 2: YouTube/Vimeo «Enviar a…» + cantos juveniles de muestra (CI y Windows pendientes)

**Estado base:** `a7ccd8676fee980df9792e078f1b196a8fd2f191`, Actions #40802211781 success, PR #2 draft. El usuario confirmó que la Biblia navega y sustituye la diapositiva temporal correctamente al proyectar imagen/video. Se mantiene sin modificar esa corrección.

**Integración:** `src/frontend/components/drawer/player/PlayerVideos.svelte` reutiliza `JADestinationChooser` y `sendToJAOutputs` con payload `type: "player"` (YouTube y Vimeo usan el mismo motor FreeShow), una sola llamada por subconjunto de monitores para reloj/estado compartido. Clic normal proyecta solamente a principal elegida por ID de `getJAMainOutput()`, sin escoger otra pantalla si la principal se desconecta; clic sobre el mismo video únicamente en esa principal lo retira SOLO de ahí. Antes del nuevo contenido foreground se elimina la diapositiva de los destinos seleccionados (no de otros monitores), incluida la Biblia temporal; la edición de fondos bíblicos queda intacta. Envío múltiple usa `{ replaceScripture: true }` del servicio compartido. Las secundarias siguen sin audio según la política JA y `VideoPlayer.isOutputMuted`; reproducción real de YouTube/Vimeo necesita Internet y puede depender de permisos de inserción del video. No se reescribe el reproductor, capturas, scrubbing, control general ni estilos JA.

**Ejemplos predeterminados:** `src/electron/data/defaults.ts` reemplaza las 6 muestras FreeShow (4 YouTube/2 Vimeo) por cinco referencias YouTube solicitadas: Yo voy `pyot7PtanJ0`, Maranata `LXYpWEfQ0Tw`, Todo por Él `Qq1bzdb7fGs`, Tu poder `l48iGEI4a2A`, Fieles `Stphc6WBSoM`. No se descargan videos ni se incluye contenido audiovisual. Vimeo sigue disponible y admite contenido del operador. Migración al iniciar en `src/electron/data/store.ts` + `jaYouthOnlineMigration.ts` elimina SOLO los originales no personalizados de `settings_synced.playerVideos`, conserva videos nuevos/editados y evita duplicados; no repuebla la biblioteca si el operador quitó todas las muestras. Tests unitarios en `jaYouthOnlineMigration.test.ts` verifican sustitución, conservación e idempotencia.

**Validación requerida:** Actions nuevo HEAD + Windows 1/2/3 monitores: YouTube normal solo Primario; Vimeo normal solo Primario si hay entradas Vimeo del usuario; «Enviar a…» secundaria sola con Primario en video con sonido; «Enviar a…» Primario+Samsung con sonido únicamente Primario y pausa/seek por grupo; reemplazar secundaria por otro video y mantener Primario; cambiar Biblia temporal por video online solo en ese destino y viceversa; Borrar todo/control por salida; biblioteca personalizada (sin pérdida), usuarios nuevos (cinco videos predeterminados) y existentes (migración), reconexión y problemas de videos que bloquean embed. **No declarar M1-03 completo**: faltan Presentaciones, textos, PDF/PPT, Capas, Escenas, entradas y rutas de proyectos. Preservar M1-04, M1-05 grupos persistentes, M1-06 consola/prónter, M1-07 estabilidad, H1, T1, F1, autodescubrimiento de carpetas, rendimiento y diseño JA. No tocar main ni fusionar PR #2.

---

## 2026-10-28 — M1-03: eliminar Biblia temporal al sustituir con contenido multimedia (pendiente validación Windows)

**Evidencia de Windows:** el operador confirmó que la navegación bíblica multipantalla ya funciona, pero al enviar posteriormente video o fotografía a esa misma salida queda el versículo sobreimpreso y la limpieza resulta confusa. **Causa verificada en código:** FreeShow separa `out.slide` (Biblia usa `id="temp"` y `categoryId`) de `out.background` (video/fotografía); `setOutput("background", ...)` no borra automáticamente `slide`.

**Corrección limitada y reutilizable:** nuevo `clearTemporaryScriptureOnJAOutputs(ids)` en `components/helpers/output.ts`; elimina exclusivamente diapositivas temporales de Biblia en IDs de salida activos y elegidos, mediante el `clearSlide(true, ids)` existente, antes de proyectar un medio nuevo. Se llama de forma **explícita** en rutas iniciadas por el operador: tarjetas Multimedia local/Pixabay/Unsplash/Canva, Himnario principal y envío múltiple, vista previa de imagen y video de proyecto, y fuentes en vivo. `sendToJAOutputs(..., { replaceScripture: true })` soporta la ruta compartida sin alterar el `setOutput` general. Los cambios de fondo y estilo generados por la Biblia NO activan el reemplazo; otros tipos de diapositivas/capas mantienen semántica FreeShow. No se modifica `Scripture.svelte`, `scripture.ts`, `VideoPlayer`, audio ni `shortcuts.ts`.

**Criterios de prueba:** Biblia en iPad y principal; enviar multimedia solo a iPad: desaparece versículo únicamente en iPad y principal continúa navegando. Invertir destinos. Verificar foto/video/Himnario, audio de principal sin cortes, avance bíblico después de reemplazar secundaria, template con imagen de fondo sin borrar versos, Borrar todo y limpiar diapositiva en pantalla Controlar, y desconexión/reconexión; probar RV1909/importadas. CI en nuevo HEAD no equivale a aceptación real Windows. Preservar M1-03 universal restante, M1-04, M1-05 grupos, M1-06 consola/prónter, M1-07 estabilidad, H1, T1, F1 y todos los pendientes. PR #2 en borrador, no fusionar ni tocar main.

---

**Refuerzo preventivo de sesión:** al preparar el siguiente versículo se guarda una instantánea de IDs, grupo, colección y fondo. Antes de proyectar se revalida que esas mismas pantallas sigan formando el grupo controlado y mantengan Biblia visible; si el operador reemplazó una salida por un video o envió otro pasaje durante la carga asíncrona, el envío tardío se cancela sin tocar ese contenido. Se añade un indicador discreto «Controlando: …» junto a las flechas, que muestra los nombres reales de los monitores incluidos, sin crear controles adicionales. La revalidación ocurre **antes** de enviar la diapositiva, no entre las actualizaciones de fondo del mismo grupo. CI + Windows pendientes.

## 2026-10-28 — M1-03/05: corregir avance grupal e independiente de Escrituras (CI y Windows pendientes)

**Reportó el operador:** incluso después del commit `92354e5`, con Biblia enviada a dos pantallas solo Primario avanzaba; con Biblia únicamente en Samsung, las flechas no avanzaban. Auditoría mostró que `Scripture.svelte:_moveSelection()` aún invocaba en dos ramas `setTimeout(playScripture)`, ruta diseñada exclusivamente para la principal; además, al enviar a un nuevo grupo, el destino Controlar podía conservar otra pantalla no incluida, y el contador asíncrono `scriptureProjectionGeneration` cancelaba también envíos a destinos distintos.

**Cambio estructural localizado:** las dos ramas del navegador nativo `_moveSelection` ahora esperan a que `openVerse` o `openBook` actualicen la referencia y, si la sesión controlada es bíblica, utilizan `refreshLiveScripture()` para proyectar al grupo efímero correspondiente. `Enviar a…` activa el destino de navegación del grupo creado en `jaControlledOutputId`, sin cambiar la principal física ni añadir un nuevo selector o listener global. `projectScripture` mantiene una generación por outputId, para que actualizaciones rápidas de dos grupos sin destinos compartidos no se cancelen entre sí; comprueba también que el tab bíblico permanezca vigente tras operaciones asíncronas. En el caso de apertura externa con `playWhenLoaded`, se respeta la sesión bíblica controlada cuando la hay y, en otro caso, sigue el comportamiento normal de proyección a Primario.

**Invariantes:** envío simultáneo a Primario+Samsung = un grupo de navegación; envíos separados = referencias independientes; elegir Controlar Samsung no cambia el proyector principal; contenido diferente/no bíblico no es pisado; las pantallas que se desconecten dejan de estar disponibles; campos editables conservan las flechas; reproductor de vídeo/audio, fondos, thumbnails, scrubbing, atajos globales y `main` intactos. No se implementan grupos persistentes ni sincronización audiovisual de M1-05.

**Validación obligatoria:** CI del nuevo HEAD, después prueba física Windows RV1909 + importadas. (a) Enviar versículo a ambas y avanzar/retroceder: cambian ambas. (b) Enviar Génesis 1:1 a Primario y 1:5 a Samsung por separado; Controlar Samsung → 1:6 sin tocar Primario; Controlar Primario → 1:2. (c) Cruzar capítulo, versículos divididos, cambio de estilo. (d) Borrar solo Samsung y Borrar todo; no reaparece el versículo. (e) Sustituir Samsung por vídeo, no interrumpir audio de Primario. (f) Aceleración de flechas, foco de búsqueda, desconexión y tres pantallas. No declarar solucionado sin confirmación real de Windows. Mantener M1-03 universal restante, M1-04, M1-05 grupos, M1-06 prónter/consola, M1-07 estabilidad, H1, T1 y F1. PR #2 draft, sin tocar main.

---

**Ajuste reactivo asociado:** las banderas de Biblia proyectada `isActiveInOutput` y `hasLiveScripture` deben depender tanto de `$outputs` como de `$jaControlledOutputId`: pulsar Controlar Samsung no cambia el estado de las salidas, pero sí el dueño de las flechas. Además, al abandonar/reabrir Escrituras se reinicia la llave de hidratación para restaurar la referencia correspondiente. Pendiente CI/Windows; no se modifica el listener de teclado.

## 2026-10-28 — M1-03/05 regresión: flechas de Escrituras en secundaria con referencias independientes

**Reporte operativo:** incluso antes de corregir "Borrar todo", las flechas no navegaban los versículos de la pantalla secundaria. Con pasajes diferentes en Primario y Samsung, solo Primario avanzaba. **Causa real inspeccionada:** `MultiOutputs.svelte` cambia `jaControlledOutputId` para supervisión, pero el módulo `Scripture.svelte` seguía leyendo un único `activeReference`; `getLiveScriptureOutputIds()` recogía simultáneamente todos los destinos de la misma colección, sin identificar el destino bajo Controlar ni distinguir un envío conjunto de dos independientes.

**Corrección acotada:** ahora cada envío explícito incorpora un grupo de navegación efímero propio; un envío a varias salidas les da el mismo grupo, y los envíos individuales generan grupos distintos. Cada diapositiva temporal `OutSlide` lleva `scriptureReference` con libro/capítulos/versos; al cambiar `Controlar`, el inspector Escrituras carga la referencia de esa salida en el **navegador original `openBook/_moveSelection`**, sin agregar otro algoritmo de versículos. `getLiveScriptureOutputIds` apunta solo al grupo de la pantalla controlada, o a Primario si no hay supervisada. Salidas desconectadas o con vídeo/fondo de reemplazo no reciben navegación; cambiar de pestaña de traducción no borra las rutas de las otras biblias. El botón Proyectar normal sigue destinado solo a Primario. Sin nueva UI, reproductor, controles de teclado ni cambios de `main`.

**CI/Windows obligatorios:** CI del HEAD nuevo, luego validar RV1909 y Biblia importada, capítulos/límites/split verses: Primario Génesis 1:1 y Samsung Génesis 1:5 enviados **por separado**; Controlar Samsung + flecha derecha muestra 1:6 solo en Samsung, Controlar Primario y flecha vuelve a avanzar desde 1:1 solo en principal. Seleccionar simultáneamente ambas salidas en un único envío y confirmar avance conjunto. Borrar solo Samsung y comprobar que no reaparece; Borrar todo despeja ambas. Sustituir secundaria por video y confirmar independencia/audio primario, probar campos de texto, desconexión y 3 salidas. Regresión de borrado multipantalla en `6c11984` NO declarada validada hasta Windows; M1-03 restante YouTube/Vimeo, presentaciones, PDF/PPT, capas, escenas, cámaras y proyectos; M1-04/05/06/07, H1, T1, F1 siguen registrados. PR #2 draft, main intacta.

---

**Aislamiento del caché de diapositivas (mismo incidente):** cuando `clearSlide` recibe una salida específica, la copia de recuperación se limita a esa salida. Evita que la limpieza de Samsung almacene también un estado de Primario no afectado por la operación. Borrar todo mantiene el caché global anterior. No cambia la navegación bíblica ni el motor de reproducción.

## 2026-10-28 — M1-03 regresión: "Borrar todo" no retira Escrituras de salidas JA secundarias (pendiente CI/Windows)

**Reporte de Windows:** proyectar versículos distintos en Primario y una secundaria; al limpiar, el versículo de la secundaria permanece visible/bloqueado, aunque la principal responde. **Causa verificada:** `clearAll()` llamaba `clearSlide(!keepLastSlide)`; dentro `clearSlide()` se usaba `setOutput("slide", null)` sin ID. Por la política JA, un `setOutput` implícito limpia solamente la pantalla principal. A diferencia de ello, `clearBackground()` ya enumeraba salidas activas. Asimismo `ClearButtons.svelte` ignoraba `jaControlledOutputId` para el borrado de diapositivas y para determinar si esa salida contenía diapositivas.

**Solución reutilizando FreeShow:** `clearSlide(shouldClearAll, specificOutputIds?)` conserva llamada normal sin IDs para compatibilidad; cuando recibe una salida o lista de IDs reales, limpia transición y diapositiva por salida, con `setOutput("slide", null, false, id)`. `clearAll()` envía los IDs de `getAllActiveOutputIds()`, de modo que el botón rojo **Borrar todo** efectivamente limpia principal + secundarias. En `Preview.svelte` se pasa el output supervisado a `ClearButtons.svelte`; los iconos de borrar diapositivas/fondos/capas/temporizadores/escenas y sus estados se restringen a esa pantalla durante `Controlar`. Botón Borrar todo y audio siguen globales. No toca reproductores, shortcuts, selección de versículos, templates ni UI de Himnario/Multimedia.

**Validar con Windows:** Biblia distinta en Primario y Samsung: Borrar todo despeja ambas; seleccionar Controlar Samsung y pulsar borrar diapositiva despeja solo Samsung; misma prueba sin contenido en principal; enviar nuevos versículos después del borrado; 3 pantallas, repetir con Himnario/Multimedia independientes y audio sin cortes. CI por nuevo HEAD es solo compilación; el fallo real se cierra tras pruebas. Preservar M1-03 universal pendiente, M1-04, M1-05 grupos, M1-06 consola/prónter, M1-07 hotplug/estabilidad, H1, T1, F1 y pendientes documentados. PR #2 draft, no tocar main.

---

**Protección de Primario frente a contenido reemplazado:** la salida principal también puede conservar `slide.id="temp"` debajo de un video foreground. `playScripture()` registra el fondo bíblico original; si ese fondo cambia por otra proyección, `supersededPrimaryOutputs` impide volver a incluir la principal en el avance automático hasta que el operador proyecte la Biblia otra vez. La navegación sobre secundarias previamente seleccionadas continúa sin silenciar/reescribir la principal. Esto no altera las reglas de M1-05 de grupos permanentes.

**Aislamiento adicional del seguimiento bíblico (2026-10-28):** `setOutput("background")` de FreeShow puede reemplazar el video/imagen de una salida sin borrar inmediatamente su `out.slide.id="temp"`. Por eso el seguimiento efímero registra también el identificador del fondo con el que se envió la Biblia. Si el operador proyecta un video o fondo distinto en una secundaria, esa salida deja de recibir versos y NO se pisa su sesión audiovisual al pulsar flechas. Tras un refresco de estilo autorizado se actualiza el identificador esperado. No se toca el reproductor, la lógica general de `setOutput` ni la lista de pendientes.

**Compatibilidad TypeScript del mismo cambio:** `OutSlide` ya recibe `categoryId` al crear una diapositiva bíblica temporal; se declara ese campo como opcional en `src/types/Show.ts` para validar de forma tipada el destino al que se aplica navegación, evitando conversiones `any`. No cambia el formato de persistencia ni el renderer. CI y pruebas Windows pendientes.

## 2026-10-28 — M1-03F/05A: navegación de Biblia también en destinos seleccionados (CI/Windows pendientes)

**Reporte real del usuario:** «Enviar a…» proyecta el pasaje en secundaria, pero al navegar con flechas la vista previa y principal cambian mientras la secundaria queda congelada. Causa confirmada: `Scripture.svelte:_moveSelection()` llama al `playScripture()` principal-only introducido al integrar selector. El envío era estático, pero el usuario requiere que los destinos que se eligieron sigan la navegación, sin afectar pantallas con otros contenidos.

**Corrección localizada:** `scripture.ts` mantiene registro efímero `scriptureFollowingOutputs` por ID y colección bíblica solo después de un envío explícito exitoso. `getLiveScriptureOutputIds` incluye la principal únicamente si actualmente muestra `slide.id="temp"` de esa colección; auxiliares solo si están disponibles, se seleccionaron y siguen proyectando esa misma Biblia. Elimina destinos que se reasignan o desconectan. `refreshLiveScripture` utiliza **el mismo procesador original** y `sendToJAOutputs` para actualizar los IDs del grupo de navegación, con generación asíncrona que evita aplicar un cálculo de versículo más antiguo tras uno nuevo. `Scripture.svelte` usa esta ruta para flechas, clic de versículos, refresco de estilos. `playScripture()` normal permanece exclusivo de la principal. No modifica shortcuts, VideoPlayer, UI principal o `main`.

**Verificación requerida:** CI y Windows: elegir solo Samsung mientras Primario muestra video con audio y navegar sin cambiarlo; elegir Primario+iPad y avanzar ambos, cambios de capítulo y split verse; cambiar Biblia en un output por multimedia (debe dejar de seguir); cambiar traducción/importada, fondos/restablecer estilos, desconexión/reconexión, 3 monitores. Aún NO representa grupos guardados/sincronización temporal de video M1-05. Conserva M1-03 universal en otros módulos, M1-04/05/06/07, H1, T1, F1 y backlog completo. PR #2 continúa draft; no fusionar.

---

**Salvaguarda de salida M1-03 Biblia (2026-10-28):** la ruta original `setOutput("slide")` limpia todos los fondos mediante `clearBackground()` si la primera salida destino usa foreground. Para evitar que Biblia enviada únicamente a auxiliar borre un video de Primario, el envío explícito despeja fondos foreground únicamente en IDs seleccionados antes de proyectar el versículo, usando el mismo `sendToJAOutputs`. No cambia la proyección normal ni el controlador de video. Probar video foreground en auxiliar y video con audio en Primario.

## 2026-10-28 — M1-03 Fase 0 + Fase 1 (selector explícito en Biblia, pendiente Windows)

**Estado base protegido:** rama `feature/base-freeshow-diseno-ja`, HEAD de inicio `b8bf51c890969a7e83a47dc7a54a7a7a9292b07f`; Actions #40743618059 success; PR #2 draft, `main` no tocar. Usuario confirmó en Windows que flechas bíblicas y reproducción de dos videos ya funcionan; no volver a intervenir sus controladores.

**Implementación limitada a Escrituras:** `Scripture.svelte` incorpora el `JADestinationChooser` compartido junto al botón Proyectar en el panel de versículos; aparece solo cuando el diálogo tiene >=2 salidas físicas JA y principal elegida. `scripture.ts` mantiene `playScripture()` para navegación, actualización del texto y estilos siempre a principal. Añade `sendScriptureToJAOutputs(ids)` para preparar con el mismo algoritmo de traducciones, división, plantilla y attribution el **pasaje seleccionado actual**, y enviarlo una sola vez por IDs exactos mediante `sendToJAOutputs`. Actualiza o limpia el fondo bíblico **solo** en destinos elegidos, con estilos de salida y audio silenciado. Revalida primaria y dispositivos tras el procesamiento asíncrono. No añade suscripciones permanentes a los secundarios, no modifica el reloj audiovisual, el motor FreeShow ni la funcionalidad de flechas.

**Prueba Windows indispensable:** Biblia RV1909 e importada: enviar a secundaria solo sin variar principal (himo/video u otra Biblia), enviar a ambas, seleccionar otro versículo con flechas (solo principal cambia), comprobar imagen/color de fondo y eliminación de fondo, reconexión y búsqueda; Windows multi monitor + CI. No declarar M1-03 completo hasta integrar Presentaciones, PDF/PPT, YouTube/Vimeo, Capas/Efectos, Escenas, cámaras, capturas, proyectos y menús por contexto. Preservar M1-04 controles independientes, M1-05 grupos/sincronía, M1-06 consola/prónter, M1-07 robustez y el backlog H1, T1, F1, imagen JA, caché thumbnails, autodescubrimiento y compatibilidad de PCs modestos. 

---

**Seguimiento de limpieza WebAudio (2026-10-28):** se identificó que `AudioAnalyser.detach` borraba `gainNodes[key]` antes de llamar `source.disconnect(this.gainNodes[key])`; al separar outputs de una fuente compartida se intentaba desconectar un GainNode inexistente. Se retiene una referencia local al GainNode y se elimina sólo ese enlace cuando el MediaElementAudioSourceNode sigue compartido. No se desconecta la fuente completa de otras pantallas. Verificar en Windows con envíos sucesivos y comprobar que el consumo no crezca por nodos de audio huérfanos. CI y prueba física pendientes.

**Auditoría de carreras asociadas (2026-10-28):** se complementa el aislamiento de sesión en `createAudio(...).ended` (el callback consulta los outputs actuales del objeto de audio, no la lista original ya obsoleta); `checkIfEnding` bloquea por instancia en lugar de path; el cálculo de soft-loop ocurre una vez por reloj compartido en vez de una vez por pantalla. Una carga de audio fallida no detiene otras instancias con igual ruta. El inicio consulta opciones de la sesión solicitada. Pendientes CI nuevo HEAD y validación Windows de cambios rápidos, finales y soft-loop.

## 2026-10-28 — M1-03/M1-05: aislar sesiones audiovisuales al reemplazar una salida (por validar)

**Reporte Windows del operador:** enviar un mismo video a Primario + Output 1 reproduce inicialmente, pero al enviar luego otro video de Multimedia/Himnario el audio de Primario desaparece y el video puede retroceder/repetir segundos. Biblia con flechas YA validada por el usuario, no intervenir el navegador.

**Causa estructural inspeccionada:** `VideoPlayer.stop(path, outputId)` localizaba posteriormente la primera sesión por `path` aun cuando el `outputId` pertenecía a otra instancia. `fadeOut`/`fadeIn` y `updateVolume` podían mutear varios `AudioAnalyser` con la misma ruta, ignorando la propiedad de sesión; `AudioAnalyser.detach` comprobaba “otros videos” comparando rutas distintas, ignorando otras salidas con el MISMO archivo.

**Corrección:** conservar un mismo reloj para los outputs de un envío agrupado, pero separar la parada completa por instancia real de audio/reproducción. Detach del grupo retira solo el ID solicitado; el fade de stop y la recuperación de volumen del nuevo inicio se dirigen exclusivamente a los outputs propietarios. `updateVolume` toma el objeto de audio de cada sesión, no la primera ruta coincidente. `AudioAnalyser.detach` conserva el nodo compartido si quedan otras fuentes activas, aunque reproduzcan el mismo path. No crear reproductor ni menú nuevos, mantener FreeShow y diseño JA.

**Estado:** cambios en rama, compilar con CI del nuevo HEAD; NO afirmar validación física. Comprobar en Windows: A+B mismo video, A nuevo/B antiguo, B nuevo/A antiguo, mismo archivo enviado separadamente, pausa/seek por salida, detener por salida, audio solo primario, loops naturales, scrubbing, desconexión y recurso de baja potencia. Revisar cronómetro/sincronización y posibles callbacks asíncronos si persisten saltos. M1-03 universal, M1-05 grupos, M1-06 consola/prónter, M1-07 robustez, H1, T1, F1 continúan abiertos. No fusionar PR #2 ni modificar main.

---

**Ajuste preventivo de eventos (mismo ciclo, 2026-10-28):** captura temprana consume sólo flechas destinadas a navegar versículos. Si el foco está en un input, editor, control o diálogo, `Scripture.svelte` deja propagarse el evento hasta el elemento. `Preview.svelte` no ejecuta avance general con flechas simples cuando la pestaña Biblia tiene el control. Se mantiene un único algoritmo de navegación bíblica (`_moveSelection`). Pendiente CI y pruebas físicas.

## 2026-10-28 — Corrección estructural de flechas bíblicas (pendiente CI y Windows)

- Se comprobó HEAD `c720ce1`, PR #2 draft y Actions #40635140956 (intento 2 exitoso en código `7d7c459`).
- Causa: `outputIsScripture` identificaba la primera salida FreeShow y no la principal JA; App/Preview y Scripture tenían listeners sobre window y `shortcuts.ts` duplicaba avance con `OutputHelper.advanceOutputs` para flechas bíblicas.
- Solución: `getJAMainOutput` identifica la principal por ID exacto, no cambia de salida cuando desaparece; sin selección JA sólo permite compatibilidad con salida nativa única. `playScripture` inspecciona, aplica estilo/fondo y proyecta explícitamente a ese ID, revalidándolo tras preparación asíncrona.
- `Scripture.svelte` captura las flechas en fase de captura sólo en la pestaña Biblia; reutiliza `_moveSelection` para capítulo, verso y división. Respeta edición y caret. Se retiraron las rutas JA redundantes de `shortcuts.ts` que enviaban flechas bíblicas a diapositivas.
- Riesgos/pruebas pendientes: compilar y comprobar Windows con principal+secundaria, entrada de texto, transición de capítulo, RV1909 y FSB locales, ausencia/desconexión de principal, restaurar fondo, escenas y teclas fuera de Biblia. CI verde no implica prueba funcional real.
- No se modificó `main` ni se fusionó PR #2. Se preservan M1-03 (destinos universales), M1-05 (grupos), M1-06 (consola/prónter), M1-07 (robustez), H1, T1, F1 y demás pendientes documentados.

---

## ESTADO DE DESARROLLO ACTUALIZADO — 2026-10-28 (continuidad entre chats)

**Prioridad inmediata: regresión de flechas de Biblia NO RESUELTA.** Tras la proyección principal JA exclusiva, `scripture.ts:outputIsScripture()` todavía utiliza `getFirstActiveOutput()`, de FreeShow, y `Scripture.svelte` depende de esa detección para habilitar su `_moveSelection()`. A la vez `shortcuts.ts` llama `OutputHelper.advanceOutputs()` para las flechas, mecanismo de diapositivas distinto del lector bíblico con `slide.id="temp"`. Revisar también listener nativo de `Scripture.svelte` y filtros de foco; no añadir otro parche de teclado.

**Estado verificado:** HEAD anterior a esta actualización documental `7d7c459`; GitHub Actions #40635140956 intento 2 **success**, no equivale a pruebas Windows. PR #2 sigue en borrador. Solo se autoriza ajustar documentación en el presente cierre de chat; siguiente conversación audita, diseña e implementa después, con CI y pruebas reales. Mantener Biblia RV1909, Himnario separado de Multimedia, estilo JA, vistas independientes, audio solo principal, miniaturas persistentes y compatibilidad PC modestos. No modificar `main` ni fusionar PR sin autorización.

**Secuencia no desplazable:** regresión Biblia -> terminar M1-03 proyección universal (clic normal solo a principal y selector de destinos) -> M1-05 agrupación/duplicado y control compartido -> M1-06 consola/prónter -> M1-07 pruebas -> demás entregas H1/T1/F1.

---

# JA Proyecciones 2 — documento maestro

Fecha de inicio: 2026-10-26. Repositorio: `IsaacMPP/JA_Proyecciones2`.

## Misión
Proyección audiovisual de cultos con interfaz comprensible para operadores no técnicos, salidas independientes, destinos inequívocos y sonido predecible.

## Estado confirmado
- **Fase 0: documentación y arquitectura** (en preparación).
- Repositorio nuevo inicializado con README; **todavía no hay aplicación ni módulo audiovisual instalado**.
- Código del proyecto anterior no se ha copiado. Las experiencias anteriores son requisitos y advertencias, no componentes validados aquí.
- Rama de trabajo de esta fase: `docs/fase0-gobernanza-arquitectura`; integrar a `main` únicamente con autorización explícita.

## Reglas de producto acordadas
- Detectar automáticamente pantallas externas que Windows exponga (HDMI, HDMI inalámbrico, spacedesk); distinguirlas con nombre, resolución y botón de identificación. No atribuir modelos que el sistema no informa.
- Diferenciar pantallas físicas, salidas lógicas, transmisión NDI y dispositivos de audio. NDI no equivale a un monitor local autodescubierto.
- Una sola salida de proyección principal elegida por operador. Clic normal envía solo al principal; clic derecho elige destino explícito.
- Principal: video con audio de forma predeterminada; auxiliares: sin audio de forma predeterminada. “Solo video” es excepción explícita.
- Controles de transporte por salida, sin afectar a otra. Mismo archivo en dos salidas exige comprobar capacidad de reproducción independiente.
- Evitar proyectar sobre la pantalla de operación o enviar automáticamente a otra salida ante desconexiones.
- Configuración sencilla primero; opciones avanzadas en segundo nivel. Centro de control adaptable a número real de salidas (inspirado en VirtualDJ, sin límite de cuatro).

## Restricciones técnicas
- Examinar FreeShow y OBS como referencias, respetando licencias; favorecer reutilización probada sobre duplicación.
- No asumir que CI verde equivale a validación en Windows.
- No importar la rama antigua como base sin revisión arquitectónica y autorización.

## Próximo hito
Cerrar fase 0: elección de base tecnológica, contrato de identificación/selección/audio, matriz de pruebas y una primera entrega vertical mínima verificable.

## Alcance ratificado por el usuario (26-oct-2026)
- **Base tecnológica: FreeShow**, conservando las capacidades de su motor; referencia entregada `FreeShow-main(2).zip`, `package.json` versión 1.6.7 y licencia GPL-3.0. No se importó aún código a este repositorio.
- Recuperar de forma limpia la **Biblia en español**, **Himnario Adventista** con búsqueda/organización, y modos multimedia **Video con audio / Solo video / Solo audio** que existían en JA Proyección anterior.
- Conservar **el diseño visual anterior de JA Proyección**; extraer componentes visuales sólo tras auditar dependencias para no transportar modificaciones multipantalla fallidas.
- Utilizar OBS Studio sólo como **referencia** para identificación real de modelos de monitores en Windows; referencia recibida `obs-studio-master(1).zip` (licencia GPL-2.0, COPYING). No copiar código OBS sin revisión de compatibilidad y atribución.
- Monitor principal de proyección seleccionable y persistente: **clic normal sólo al principal con audio**; salidas secundarias independientes, dedicadas a imagen/video sin audio. Envío a secundarios explícito por menú/contexto. No confundir principal de Windows con proyector principal.
- UI multipantalla intuitiva con nombre/modelo real cuando esté disponible, resolución, identificación física, controles por salida y centro multipantalla sin duplicar motores.

## UX y configuración: preservar FreeShow (confirmado 2026-10-26)
- No eliminar, sustituir ni ocultar controles funcionales de FreeShow sin auditoría y aprobación; conservar su comportamiento nativo cuando no haya una razón demostrada para cambiarlo.
- **Configuración es el centro de administración real**, no un panel decorativo: deberá evolucionar junto con detección, selección del proyector principal, salidas auxiliares, identificación, audio y controles. Una opción nueva debe configurarse desde ahí y producir un efecto verificable.
- **Primer envío sin principal establecido:** abrir selector/asistente de destinos disponibles, permitir identificar pantalla y elegir principal; no enviar contenido a todos ni seleccionar una salida arbitraria. Guardar elección; ofrecer reconsiderarla desde Configuración → Pantallas.
- Una vez establecido el principal, clic normal proyecta exclusivamente ahí (con audio para video normal). Acciones explícitas «Enviar a…» permiten dirigir otros contenidos a secundarios silenciosos sin modificar el principal.
- Panel de control independiente por salida: contenido visible, reproducción, pausa, progreso, detener y silencio. Reutilizar capacidades nativas y advertir si un medio comparte el mismo reproductor entre salidas.
- No confundir **sin salida configurada** con **sin monitor externo detectado**: FreeShow ya ofrece un flujo de elección cuando no tiene salida; preservar y adaptar, no reemplazarlo por un bloqueo.

## Recuperación visual iniciada (26-oct-2026)
Se añadió `design/ja-theme.css`, `design/JAHeader.svelte` y `design/README.md` en el PR documental. Conservan el encabezado azul de JA Proyección anterior y preparan integración sin importar fallos multipantalla. **No hay todavía motor FreeShow ni UI ejecutable.** Los recursos binarios `ja-logo.png`/`ja-hero.jpg` siguen pendientes de traslado. No confundir kit visual con interfaz funcional.

## Hito: base FreeShow importada (26-oct-2026)
En rama `feature/base-freeshow-diseno-ja`, FreeShow oficial v1.6.7 ya está incorporado como código fuente. Se reintrodujo **únicamente** la marca del encabezado JA y sus recursos originales; salidas, audio, ventanas, configuración y navegación permanecen nativas de FreeShow. Este hito reemplaza el estado anterior «sin aplicación» sólo para esta rama; no confundir importación exitosa con compilación verificada. Pendientes el resto de la portada/identidad y recuperar Biblia/Himnario por fases, sin parches históricos. No fusionar a main sin aprobación.

## Versionado automático de Windows (26-oct-2026)
- El código sigue versionado sobre FreeShow 1.6.7 como base, pero cada ejecución de instalador JA utiliza **versión exclusiva de compilación** `2.0.<run_number*100+attempt>`, calculada con el número global del flujo GitHub Actions y su intento. Un nuevo commit que active el workflow genera un número nuevo; reejecutar una compilación también produce un número diferente.
- `scripts/ja/prepare-version.cjs` modifica temporalmente `package.json` sólo en el agente de CI y crea `ja-build-info.json` (versión, commit, ejecución). No genera commits de cambio de versión ni afecta el lockfile antes de `npm ci`.
- El instalador NSIS se configura como `JA Proyecciones 2`, appId `mx.japroy.proyecciones2`, artefacto `JA-Proyecciones-2-<version>-<arch>.exe`. Se elimina la configuración de firma Azure de FreeShow de la configuración **generada**, sin modificar el original.
- La primera tarea es confirmar **compilación y empaquetado**, no asumir éxito por disponer de un workflow. No se declara instalador funcional hasta CI verde y prueba en Windows. La pantalla «Acerca de» debe mostrar la versión del package empaquetado; se puede ampliar después con SHA.

## Diseño de la primera versión de prueba JA — recuperación ampliada
- Encabezado JA y recursos de marca existentes.
- Portada/bienvenida visual original recuperada en `src/frontend/components/main/Splash.svelte` (fondo JA, logo, lema, versión y controles nativos de búsqueda/proyecto/presentación).
- Identidad del instalador NSIS e icono Windows generados mediante `scripts/ja/create-installer-art.py` y configuración específica en `scripts/ja/prepare-version.cjs`.
- **Pendiente validación de empaquetado y prueba visual de instalación**. La pantalla de carga nativa separada del proceso Electron no ha sido personalizada por separado; la pantalla de bienvenida de la aplicación sí.

### Pantalla de carga nativa JA — implementación posterior
Se localizó y personalizó `public/loading.html` (ventana de arranque real de Electron): fondo de `ja-hero.jpg`, emblema `ja-logo.png`, marca JA y indicador/versión. Esta acción reemplaza el pendiente de pantalla de carga nativa indicado anteriormente. Sigue pendiente comprobar la representación en Windows.

## Estado de transición de conversación (26-oct-2026)
**Módulo RV1909 incorporado en código, todavía no validado en Windows.** Fuente eBible dominio público con verificación SHA, recurso FSB sin conexión, registro y lector FreeShow conservados. Workflow #40393505056 se encontraba en ejecución durante esta actualización; revisar último run del HEAD, no asumir éxito. Tras comprobar 66 libros, navegación, proyección y offline, pasar al Himnario Adventista. El plan completo y normas están consolidados en `docs/CONTINUIDAD_CHATGPT.md`. PR #2 sigue draft, `main` sin fusionar.

## Entrega incremental: navegación de Biblia en vivo (26-oct-2026)
Las capturas del operador muestran que RV1909 se selecciona y proyecta en Windows. Workflow #40393505056 terminó con éxito. Se introdujeron flechas izquierda/derecha para cambiar el versículo en la proyección bíblica activa, reutilizando `_moveSelection` y `playScripture`; faltan CI actualizado y prueba manual. La edición de textos y los controles interactivos no deben perder sus teclas.
**Requisito aceptado, todavía pendiente de implementar:** cambios de tipografía, tamaño, color, alineación e imagen/color de fondo deben actualizar inmediatamente vista previa **y salida actualmente proyectada**, sin avanzar el contenido y persistir en los siguientes versículos, capítulos, libros y reinicios. Deben derivar de un único estilo de plantilla/salida persistente; no guardar estilos individuales por versículo ni replicar motores. Otras presentaciones comparten controles, manteniendo contextos separados y auxiliares sin modificaciones no solicitadas.

## Biblia — importación de archivos locales del operador
Se reconocieron seis FSB de origen aportado por el usuario, sin publicación de su contenido: RVC, TLA, DHH94I (75 libros), NBLA, NTV y NVI. Se habilita y explica el flujo nativo de importación múltiple local `.fsb` y se valida su estructura. No se deben restringir todas las traducciones a 66 libros, ni redistribuir textos protegidos en releases. Falta probar instalación, importación real y persistencia entre sesiones, además de completar el editor bíblico en vivo y su estilo persistente.

**Actualización posterior:** `e2041e5` invoca el guardado nativo al importar FSB válidos, para conservar biblias en `scripturesCache` al reiniciar; falta validar persistencia real en Windows y posible impacto en tamaño del perfil.

## Sincronización incremental de estilo de Escrituras
El lector bíblico ahora escucha cambios en su plantilla persistente y puede solicitar actualización del versículo actualmente proyectado reutilizando `playScripture`. No crea estilos por versículo ni reproductores nuevos. Es un primer paso, no una implementación completa del editor visual compartido: quedan pendientes prueba Windows, vista previa del versículo real dentro del editor, actualización fina sin recrear toda la diapositiva, cambios de fondo al retirar imágenes y salida específica multipantalla.

## Plan operativo vigente
Se reorganizó el desarrollo en entregas E0–E5, definidas en `docs/RUTA_CRITICA_ENTREGAS.md`. La entrega E1 (Biblia) es la unidad activa. Las tareas nuevas se clasifican y se incorporan al plan sin interrumpir arbitrariamente la entrega. El cierre exige pruebas, registro de defectos y validación Windows.

## E1: vista previa de versículo proyectado
Se añadió al editor de plantillas un control para alternar a una vista de los elementos del versículo actualmente proyectado. El modo editable conserva los marcadores de plantilla; la previsualización no modifica los textos bíblicos. La función requiere validación en CI y Windows y es parte de E1, no cierre del módulo.

## E1: edición con vista en vivo simultánea
Editor de plantillas bíblicas con dos paneles al activar vista en vivo: plantilla editable a un lado y contenido proyectado al otro. Se mantienen las herramientas nativas de estilo/fondos, en vez de duplicarlas. Código en Git pendiente de aceptación Windows y de verificar que la proyección actualiza la apariencia sin parpadeos.

## 2026-10-26 — Corrección de vista bíblica ausente
E1: corregida detección de plantillas bíblicas predeterminadas para que la vista real no dependa de configurar una plantilla personalizada. Código `81e00ed`, sin aceptación Windows aún.

## E1 — Lienzo único de Escrituras
Sustituida la vista doble por lienzo único que muestra versículo proyectado sin tokens visibles; la plantilla interna sigue siendo la fuente de los estilos. Controles nativos de FreeShow para fondo de color e imagen ya existen y se conservan. Cambios de código pendientes de CI/aceptación Windows, sin declarar terminada E1.

## E1: selección bíblica como fuente de la vista real
Se corrigió la dependencia impropia del proyector al renderizar el editor: la vista principal ahora obtiene el contenido desde el estado de selección bíblica con funciones nativas, en vez de requerir salida temporal activa. Código `7960a1f`. Pendiente validación real Windows y enlace de edición de texto/estilo.

## E1 — regresiones de teclado y acceso a fondos (26-oct-2026)
Ante reporte del operador, se corrigió el bloqueo de flechas cuando hay un elemento seleccionado en el editor (`ac1b721`), preservando protección de campos editables. Se expusieron en el editor bíblico los controles existentes de FreeShow para `backgroundColor` y `backgroundPath` usando historial de plantilla (`1258b6f`), sin almacenamiento paralelo. Falta validar compilación Windows y pruebas de imagen/color, navegación y persistencia; no cerrar E1.

## 2026-10-26 — Corrección de vista previa
E1: corrección de referencia de array de ítems del versículo y visualización de fondo original sin exigir miniatura. La salida proyectada ya se veía en captura; fallaba solo el lienzo de edición. Aún sin aceptación Windows.

## E1 — Placa de lectura
Panel contextual vinculado al fondo del cuadro de texto seleccionado, usando estilos y controles FreeShow sin añadir capas de dibujo nuevas. Alternancia, color/opacidad y redondez registrados en la plantilla; falta validación de CI y prueba visual real. La referencia puede configurarse seleccionando su propio cuadro.

## 2026-10-26 — E1: menús de fondos reubicados
Captura del operador muestra el control de color cortado en la esquina inferior derecha y los paneles flotantes bloqueando el lienzo. Cambios: `bc8e23c` elimina paneles flotantes de `TemplateEditor.svelte`; `8077906` sitúa las opciones plegables `Fondo de Escrituras` y `Fondo de lectura` en `EditTools.svelte` (panel derecho), reutilizando `MaterialColorInput`, `MaterialFilePicker`, `MaterialCheckbox` y el historial de plantillas. Se mantiene un solo estado de plantilla. CI y validación Windows pendientes, sobre todo el tamaño de popover de color y el scroll lateral.

## 2026-10-26 — E1 selector color del inspector
Se constató en captura que el selector original de color queda recortado dentro de la subárea de controles laterales. Commits `b144f36` y `1773619` eliminan `max-height:44vh` y `overflow-y:auto` del contenedor secundario, manteniendo el desplazamiento del inspector original FreeShow, y presentan radio de esquinas con valor en px. Se conserva `MaterialColorInput` para mantener colores y opacidad sin duplicar el componente. CI y prueba visual Windows pendientes; confirmar que ningún ancestro aún recorta el selector.

## 2026-10-26 — Restaurar fondos de Escrituras
Commit `ecd2cc9` añade botones de restablecimiento por sección en el inspector derecho: Fondo de Escrituras (limpia `backgroundColor` y `backgroundPath`) y Fondo de lectura del cuadro seleccionado (limpia fondo y radio en el estilo del cuadro). Ambos piden confirmación, usan historial nativo y preservan fuentes, texto, traducciones bíblicas, archivos multimedia importados y otros ajustes. Pendiente CI y validación Windows; restablecer el fondo no elimina el archivo de la biblioteca.

## 2026-10-26 — E1: restablecimiento general y actualización en proyección
`adfd5ce` corrige la observación de la plantilla bíblica predeterminada `scripture` aun sin valor personalizado de `scriptureSettings.template`, para solicitar refresco de salida durante cambios de plantilla. `02004ca` añade un botón confirmado de «Restablecer toda la apariencia» en el inspector de Escrituras. Se eliminan fondos personalizados, placas, bordes y estilos de texto, restaurando apariencia base limpia (fondo #101a2d, texto blanco Arial 64px), conservando ubicación de cuadros y marcadores bíblicos. Se mantiene la opción de restablecer fondos por separado. **No afirmar restauración bit a bit de la plantilla FreeShow original**: este botón utiliza un estilo base de JA, no una copia inmutable de fábrica. Validar CI y Windows, persistencia, salida activa y efectos del historial sobre formato/posición; PR draft.

## 2026-10-26 — E1 regresión de fondo retenido en proyección
Captura Windows: restablecer apariencia deja lienzo azul, pero monitor de salida conserva imagen navideña. Causa verificada en `playScripture`: cuando `backgroundPath` queda vacío tras restaurar, la función hacía `return` sin limpiar la salida anterior. Commit `b44c59c` añade `setOutput("background", null)` mediante el motor nativo antes de retornar. Pendiente compilar y validar en Windows restauración de fondo en salida activa y navegación siguiente, sin perder texto. No declarar cerrado E1 sin prueba real.

## Orden aprobado 27-oct-2026
E1 Biblia: usuario confirmó sus flujos principales. Editor general aplazado. H1 Himnario independiente junto a Biblia y fuera del índice de Multimedia; sigue M1 Multipantalla; después T1 Editor general. Ver docs/RUTA_CRITICA_ENTREGAS.md.

## Requisito permanente 27-oct-2026: autodescubrimiento de bibliotecas
Las carpetas de usuario que la app crea en Documentos/JA Proyecciones 2 constituyen la fuente de contenido para cada módulo. Archivos copiados por Explorador de Windows deben detectarse automáticamente, sin botón obligatorio de importación y sin mezclar categorías. Biblia se vincula a Biblias; videohimnario a Himnario Adventista y Cantos Juveniles; Multimedia a Imagenes/Videos/Fondos Personalizados; Audio a Audio, otros destinos según capacidades. Debe funcionar después de reiniciar y al agregar/renombrar/eliminar archivos; nunca modificar archivos de usuario. Actualmente la creación de carpetas no implica autodescubrimiento completo: consultar jaContentFolders.ts y jaMediaFolders.ts. Es regla de alcance para el desarrollo actual y futuro.

## 2026-10-27 — Norma permanente de ingeniería y optimización H1
**Instrucción expresa del propietario:** cada solicitud de mejora es un objetivo/problema, NO una orden literal de añadir controles. Antes de tocar el código: auditar funciones nativas de FreeShow y la versión histórica Ja_Proyeccion, identificar solapamientos, analizar consecuencias en PC de bajo rendimiento, proponer la solución más simple y sostenible; si ya existe una función semejante, reutilizarla o sustituirla, nunca dejar dos buscadores/controles conflictivos. Primero arquitectura, después implementación, CI y prueba Windows. Recordar en todos los chats futuros.
**Auditoría:** repo anterior docs/JA_BIBLIOTECA_FASE2.md reutilizaba el generador persistente de miniaturas FreeShow, su MediaGrid/VirtualList y búsqueda única; no era un conversor separado implementado por JA. Repo nuevo dibujaba todas las ~613 tarjetas, lanzaba carga de miniaturas al intersectar sin límite global y tenía búsqueda general del drawer más búsqueda propia dentro del scroll.
**Cambios:** jaHymnThumbnailQueue.ts limita a 2 solicitudes simultáneas y mantiene caché de promesas sobre loadThumbnail nativo FreeShow; HymnThumbnail lo reutiliza; Drawer oculta su buscador general solo en Himnario; HymnCatalog fija su encabezado/buscador fuera del contenedor scroll, difiere el renderizado de tarjetas fuera de viewport mediante content-visibility y recarga cache en Actualizar. Commits 1f345fe, 365389c, 998d6bc, 52fbb76. **Pendiente** GitHub Actions y pruebas Windows desplazamiento rápido con 613 videos y memoria/CPU; valorar virtualización de cuadrícula si sigue lento. PR #2 permanece draft, no tocar main.
