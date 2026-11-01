# Inventario de capacidades: JA Proyecciones 2 anterior vs motor propio JA
**Fecha:** 2026-11-01 · **Uso:** catálogo de requisitos y regresiones, **no** certificación de funcionamiento.
**Fuentes históricas leídas:** `IsaacMPP/JA_Proyecciones2` rama `feature/base-freeshow-diseno-ja`, documentos `docs/JA_MASTER.md`, `RUTA_CRITICA_ENTREGAS.md`, `M1_AUDITORIA_SALIDAS.md`, `H1_AUDITORIA_VIDEHIMNARIO.md`; archivos de Biblia, Himnario, pantallas, audio, YouTube, Presentaciones y NDI. **La existencia de código no demuestra que una función haya sido validada en hardware.**
**Fuentes nuevas:** `IsaacMPP/Nuevo_prototipo` rama `feature/motor-propio-v1`, commit `ce16f59d` / v0.4.0, directorios `desktop/`, `prototype/`, `docs/MOTOR_PROPIO_V1.md` y CI #41342172359 (23 pruebas aprobadas; Windows físico pendiente).

## Semáforo de lectura
- **Código previo:** existía una implementación o UI heredada; puede haber fallado en pruebas reales.
- **Nuevo parcial:** hay API, UI o comportamiento implementado en motor propio, pero no aceptación física final.
- **Nuevo ausente:** se requiere diseño e implementación propios; no reutilizar el código anterior directamente.
- **Problema histórico:** fallo ya observado que se convertirá en prueba permanente.

| ID | Área / función requerida | Evidencia del sistema anterior | Motor propio 0.4 | Acción / criterio |
|---|---|---|---|---|
| C01 | Centro Configuración con efectos reales | Ajustes nativos FreeShow y requerimiento explícito en JA_MASTER | Ventana sencilla para elegir operador/principal; otros controles repartidos | Crear panel único; validar cada ajuste en motor + guardar/restaurar |
| C02 | Detección automática Windows HDMI/DP/virtuales y resolución | `settings/Screens.svelte`, `Main.GET_SCREENS` | `main.cjs` usa `screen.getAllDisplays()` | Identificación física, monitor en uso vs no asignado, cambios y hotplug |
| C03 | Distinguir Windows principal, operador y proyector JA principal | JA_MASTER, M1_AUDITORIA | Guardado de IDs básicos | Asistente y selección explícita, respaldo seguro al reconectar |
| C04 | Salidas lógicas independientes, múltiples destinos | `Output.ts`, `output.ts`, `MultiOutputs.svelte` | Ventanas Electron por display; selector multi | Estado/config por outputId, pruebas de dos contenidos |
| C05 | Gestión de pantallas ilimitada según equipos | M1 requisitos; nuevo conteo no equivale total Windows | Tarjetas según monitores detectados | No forzar 4 pantallas; pantalla de ajustes escalable |
| C06 | Identificar / hacer parpadear el monitor correcto | Screens/OutputIdentify | No implementado | Botón Identificar con ID/resolución visible y reversión |
| C07 | Añadir salida NDI | `electron/ndi/NdiSender.ts`, salida `ndi`, OutputSetup | No disponible | Salida virtual independiente HDMI, con estado/conexión/SDK/licencia |
| C08 | Otras salidas RTMP/WebRTC/OMT/Blackmagic | OutputSetup listaba tipos por modalidad | No disponible | Backlog avanzado, no prometer sin especificación/pruebas |
| C09 | Grupos sincronizados y selección por salida | M1_AUDITORIA, JADestinationChooser | Envío a N monitores | Grupo persistido y explícito, no se mezcla con principal |
| A01 | Audio principal, auxiliares silenciadas por defecto | JA_MASTER y ruteo FreeShow | Selección principal determina mute, volumen por salida | Control de dispositivo y verificación independiente real |
| A02 | Tres modos Solo Video, Solo Audio, Video+Audio | JA_MASTER requisito confirmado | Video y audio como archivos diferentes; sin selector de modos | Integrar políticas por salida, sin romper video / audio principal |
| A03 | Pausa/avance/reinicio/scrubbing/volumen/mute/loop por output | VideoPlayer, MediaControls; regresiones en centro | play/pause/restart/seek/volume parciales | Un controlador central por sesión + pruebas de regresión |
| A04 | Medidor real, mezcla y entrada externa | audioAnalyser, audio/routing, AudioMeter | No hay medidor veraz (UI decorativa removida) | Añadir medición si técnicamente posible; nunca barras simuladas |
| A05 | Audio independiente al enviar contenido a auxiliar | Fallo histórico M1-03: segundo video cortaba audio principal | Por verificar en Windows dos salidas | Test bloqueante A1 (A audible + B independiente) |
| B01 | Biblias españolas e importación | Scripture, jaBundledBible, archivos FSB/XML | RV1909 pública + importar FSB JSON/JSON; estilos | Detectar formatos reales, gestión de versiones, licencias |
| B02 | Biblias RV1960/RV1995/NVI por archivo local del usuario | Requisito y tratamiento de licencias previo | No se incluyen, sólo importación JSON/FSB compatible | Importador de formatos autorizados, sin distribuir textos protegidos |
| B03 | Cuadrícula 66 libros, lista y selección capítulos/versículos | Scripture.svelte | Cuadrícula/lista desde Biblia real; contraste corregido | Prueba exhaustiva y navegación por pantalla |
| B04 | Tipografía, tamaño, borde, color, alineación, placa y fondos | E1 editor y fondos en JA_MASTER | Fuentes/size/color/placa/fotos ya parciales | Presets por salida y consistencia en vivo + persistencia |
| B05 | Flechas por salida y secuencia para grupos | M1-03/05 regresión de flechas | Vista previa navega; `sendVerse` por destino | Control de versículo ya emitido, grupos y límites de capítulo |
| B06 | Capas de Biblia al reemplazar por video, limpieza total | Regresión histórica: texto quedaba encima del video | `output.js` reinicia contenido; clear-text | Pruebas video↔Biblia↔fondo para cada salida |
| H01 | Himnario independiente de Multimedia | HymnCatalog, colección dedicada | Categoría propia y carpeta enlazada | Sin duplicados aunque rutas externas se superpongan |
| H02 | Cantos Juveniles como biblioteca propia | `Cantos Juveniles` y módulos antiguos | Categoría y acceso propios | Subcarpetas, búsqueda independiente y audio/video |
| H03 | Descubrimiento al copiar archivos y refrescar foco | JA_MASTER regla 27-oct | Necesita abrir/actualizar colección | Watch/focus/reconciliación sin scans excesivos ni datos fantasma |
| H04 | Búsqueda por número, título y tildes | `HymnCatalog.svelte` normaliza acentos | Búsqueda básica por nombre | Índice por número/nombre/alias, insensible a tildes |
| H05 | Miniaturas persistentes, caché y listas virtualizadas | HymnThumbnail + cola y VirtualList; caso ~613 videos | Tarjetas sin miniatura verdadera | Thumbnail worker/FFmpeg licenciado, caché/límite concurrencia |
| H06 | Preview y envío explícito a destino | HymnCatalog proyectaba/abría, selector de destinos | Vista previa y envío básico | Play/pause/loop desde centro y pantalla externa validada |
| M01 | Multimedia: videos, imágenes, audio y fondos | Media.svelte, MediaGrid, Audio.svelte | Categorías y carpetas vinculadas, codecs Chromium | Arquitectura por tipo, lista de formatos compatibles comprobada |
| M02 | MKV, AVI, MOV y códecs variables | Motor/formatos del proyecto antiguo | Listado de extensiones pero no reproducción garantizada | Probar/convertir con adaptador legal; no falsa compatibilidad |
| M03 | Presentación/visor central y control de salida | PreviewOutput + MediaControls, problemas previos | Programa de referencia local silenciado (no captura real) | Consola que controla salida real; no confundir espejo con captura |
| M04 | Menú derecho Enviar a / seleccionar monitor | JADestinationChooser, menús | Barra para elegir salidas | Una acción coherente para todos los módulos, sin fallback |
| L01 | Fondos propios y video, lectura detrás de Biblia | Background/SceneMedia/layers | Fondos de imagen en Biblia y biblioteca Fondos | Fondo vivo seguro, limpiado por capa, prioridades |
| L02 | Texto + video, ocultar sólo texto, logo | Overlay, SlideContent, capas, M1-03 | clear-text y negro; logo/transición pendientes | Motor de composición e independencia de capas |
| L03 | Cortar/Fundido/Transiciones | efectos FreeShow | Cortar equivale a enviar; Fundido deshabilitado | Transiciones reales por outputId, sin pausar audio |
| T01 | Crear/editar/abrir presentaciones | Shows/Slides/SlideEditor y PPT convertidor | No disponible | Editor JA autónomo, almacenamiento propio, importación por fase |
| T02 | Presentaciones con flechas y enviar a N destinos | Shows, JA helpers | No disponible | Control completo y tests de retorno desde video |
| T03 | Proyectar presentación sobre video o sólo contenido | jaSlideLayer.showOverMedia (histórico) | No disponible | Control reversible por output, audio intacto |
| Y01 | YouTube en Vista previa/Programa | YouTubePlayer y API IFrame, varios fallos previos | No disponible | Reproducción integrada bajo términos API y controles reales |
| Y02 | YouTube pausa/seek, salida individual/grupo | youtubeTransport tests y regresiones | No disponible | Nunca declarar estable sin pruebas de iframe real en Windows |
| N01 | Emisor NDI y compatibilidad OBS | NdiSender/NdiReceiver | No disponible | Diagnóstico de red y calidad, salida opcional no bloqueante |
| P01 | Proyectos y escenarios | persistencia FreeShow; JA configuraciones | JSON básico `core.cjs` + interfaz no completada | Proyecto por culto, escenas/listas, autoguardado y backup |
| P02 | Identidad/versión/actualización | Build JA, splash; eliminar actualizaciones FreeShow | 0.4.0 empaquetado | Pantalla Acerca de, changelog, diagnósticos; actualizaciones opt-in |

## Problemas de historial que pasan a pruebas de bloqueo
1. Salida secundaria inicia un video y silencia/interrumpe audio de principal.
2. Control de pausa cambia solo una vista decorativa pero no reproductor real.
3. Al cambiar medio siguen apareciendo versículos/diapositivas anteriores.
4. Las flechas avanzan una salida pero otras muestran capítulo/versículo atrasado; borrar no limpia secundarias.
5. Al abrir Presentaciones desde video, el panel central queda supervisando video y no vuelve al editor.
6. El menú `Enviar a...` no existe en algún módulo o termina difundiendo a varias salidas sin permiso.
7. YouTube llega aparentemente mudo por medidor falso y luego se rompe transporte al corregirlo.
8. Miniaturas congelan scroll y duplican archivos del Himnario en Multimedia.
9. Reconexión de monitor cambia principal o proyecta al operador inesperadamente.
10. Configuración se guarda pero no cambia el dispositivo/salida real.

## Restricciones conocidas y no negociables
- Pantalla física detectada por Windows no es sinónimo de salida JA asignada; Duplicar pantalla no sirve para programas independientes.
- No prometer nombre/modelo de monitor salvo que Windows lo informe; proporcionar identificación humana y alias editable.
- No incluir por defecto biblias comerciales (RV1960, RV1995, NVI).
- La existencia de funciones de FreeShow no autoriza copiar código ni sus binarios al motor propio.
- No confundir test de instalación con verificación física: el sistema v0.4.0 tiene 23/23 pruebas CI correctas pero todavía no tiene prueba de dos monitores reportada por el usuario.

## Criterio para reabrir este inventario
Actualizar el estado por fila después de cada entrega, enlazando evidencia de test/captura/commit y **no borrando requisitos anteriores**. Fuente de proceso: `docs/PLAN_MAESTRO_DESARROLLO.md`. Primera implementación cerrable: `C1` Configuración, descrita en `docs/C1_CONFIGURACION_ESPECIFICACION.md`.
