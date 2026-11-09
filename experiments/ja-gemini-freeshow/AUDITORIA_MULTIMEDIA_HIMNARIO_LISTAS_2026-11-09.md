# Auditoría de Multimedia, Himnario y Listas — JA Proyecciones
Fecha: 2026-11-09
Base funcional comprobada por el operador: `530487b` (Actions #42693565319)
Rama de trabajo: `development/ja-post-stable-2026-11-09`

## Alcance
Inspección estática de `JaGeminiShell.svelte`, `JaGeminiPlaylistPanel.svelte`, `JaGeminiAudioControls.svelte` y `jaGeminiPlaylists.ts`. Se agregaron pruebas automáticas de cola y selección de modo; no hubo ensayo físico con videos/himnos en Windows.

## Hallazgos y riesgos
1. **S1 — Avance automático de video incompleto.** En `playJAPlaylistIndex`, cuando la entrada es un video local se prepara Vista previa, se pausa, se silencia y `playlistWaiting=true`. Por tanto, la opción `autoNext` de la lista no implica reproducción ni envío automático de los siguientes videos. Esto debe comunicarse en la UI y resolverse con una política explícita de salida de confianza; evitar envíos automáticos involuntarios que reemplacen Programa.
2. **S1 — YouTube en lista requiere confirmación manual.** Se prepara el iframe, pero `playlistWaiting=true` y el operador debe enviar al destino elegido. Consistente con seguridad de Programa, aunque no con una playlist audiovisual totalmente automática.
3. **S1 — Rutas independientes de audio.** El sistema `JaSoloAudioPlayer` usa un bus HTMLAudio independiente, y puede silenciar temporalmente el audio de un video idéntico en Programa. Restaurar mute/volumen sin interferir con reproducción distinta exige pruebas físicas al cambiar de módulo y al saltar entre entradas.
4. **S1 — Errores y concurrencia.** `playJAPlaylistIndex` tiene token de solicitud y flag `playlistBusy`, pero no existe prueba de estrés de clics rápidos en Siguiente/Detener/Enviar con desconexión de monitor. Validar la no reanudación de pistas obsoletas.
5. **S2 — Himnario.** La biblioteca tiene carpetas, miniaturas y búsqueda, pero el control anterior de comportamiento al finalizar himno permanece deshabilitado. No anunciarlo como módulo finalizado.
6. **S2 — Listas.** El cambio en caliente entre Normal, Aleatorio, Repetir lista y Repetir canción está implementado; no había pruebas unitarias directas de la progresión de cola en este flujo.
7. **Seguridad existente que se preserva.** Vista previa no debe modificar Programa por elegir archivos; las salidas secundarias no deben producir audio adicional; detener una lista no debe limpiar Programa sin orden del operador.

## Implementado en este lote
- `jaGeminiPlaylists.test.ts`: pruebas de Normal, Repetir lista, Repetir canción, Aleatorio sin duplicados, lista vacía, preferencia histórica de repetición y validación de enlaces YouTube.
- Workflow de CI de esta rama aislada: ejecuta las pruebas de cola, junto con pruebas de monitores y biblioteca. Se habilitó el disparador para `development/ja-post-stable-2026-11-09`.
- No se tocó `JaGeminiShell.svelte`, `VideoPlayer`, audio routing ni salida de Programa. La versión `530487b` sigue disponible como referencia.

## Próximo lote recomendado
A. Validar las pruebas unitarias y compilación Windows de la rama.
B. Diseñar una opción separada para avance audiovisual: **Preparar siguiente** (segura, por defecto) vs **Reproducir y emitir automáticamente en destinos previamente aprobados** (opt-in, con bloqueo de cambios de destino y confirmación).
C. Probar MP4→MP4, MP4→MP3, MP3→MP4, Himno→Himno y YouTube→MP4 con modo normal/repetir/aleatorio; audio principal y pantallas secundarias con contenido distinto.
D. Probar rapid clicks, desconexión HDMI/Spacedesk, cierre de módulo, archivo eliminado y error de decodificación sin alterar Programa ajeno.
E. Cerrar incidencias con evidencia física y actualizar estado del módulo.

**Estado:** auditoría estática y tests añadidos. Aprobación física pendiente.
