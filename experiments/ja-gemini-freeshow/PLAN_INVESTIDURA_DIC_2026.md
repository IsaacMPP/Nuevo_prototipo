# JA Proyecciones — ruta crítica para la investidura (5 diciembre 2026)

**Fecha de referencia:** 1 noviembre 2026. **Objetivo:** versión operable para un culto de investidura, con ensayo y plan de respaldo. La fecha es un objetivo de preparación, no una promesa de estabilidad sin pruebas físicas.

**Repositorios y protección**
- Desarrollo: `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`.
- Fuente de arquitectura reutilizada: `IsaacMPP/JA_Proyecciones2`, rama `feature/base-freeshow-diseno-ja` (solo lectura).
- `main`, rama oficial `feature/motor-propio-v1` y PR #2 DRAFT: no se modifican.
- Respetar GPL-3.0 de FreeShow y la titularidad de traducciones bíblicas; RV1909 offline incluida, ediciones modernas solamente con archivos autorizados.

## Compromisos de diseño y funcionamiento
- Conservar **el diseño Gemini aprobado**; orden vertical **Biblia, Himnario, Multimedia, YouTube, Presentaciones, Fondos, Listas**.
- Nunca mostrar contadores inventados, número de monitores ficticio, estado "En vivo" inventado, barras de audio falsificadas, textos bíblicos inventados ni miniaturas de muestra.
- Pantallas: descubrir configuraciones reales de FreeShow y observar su estado; no convertir la selección en una orden de envío global. El Programa de cada pantalla permanece independiente.
- Carpetas: usar IPC nativo `READ_FOLDER`, explorador `OPEN_FOLDER`, registro persistente de `mediaFolders`; nunca copiar/mover/borrar archivos del usuario al vincular/desvincular.
- Himnario: usar `jaHymnLibrary.ts` de JA2 y sus colecciones `Himnario Adventista` y `Cantos Juveniles`, excluidas de Multimedia incluso si una carpeta Multimedia es ancestro. Mantener caché/cola de miniaturas.
- Biblia: reutilizar `Scripture.svelte` y `jaBundledBible.ts`; cuadrícula/lista reales con textos de la traducción instalada, sin introducir NVI de prueba.
- Scroll independiente en bibliotecas y pantallas; la ventana completa no debe desplazarse.
- Acciones no conectadas se dejan deshabilitadas, no se simula éxito. Audio principal separado y rutas por salida requieren validación real.

## Alcance de la primera entrega de lectura/escaner
- Gemini genera HTML/CSS original sin los controladores del mock.
- Multimedia indexa rutas reales de FreeShow (videos, imágenes, audio), permite vincular/desvincular carpetas mediante el diálogo Windows y muestra conteos de los archivos detectados.
- Himnario muestra dos colecciones por separado, busca por nombre/número y genera miniaturas reales con caché, con botón Actualizar.
- Tarjetas de salidas reflejan configuraciones reales de FreeShow (miniatura renderizada por motor, estado real). No mostrar 4/4 cuando se detecta una salida.
- Biblia usa el componente FreeShow de traducciones locales, cuadrícula/lista y función de proyección. Deben verificarse compatibilidad visual y navegación física.
- **No afirmar módulos finalizados por un CI verde.** Las pruebas de disco en GitHub usan archivos temporales del runner, no las carpetas personales del usuario.

## Fases y fechas objetivo
| Ventana | Resultado verificable | Bloqueo |
|---|---|---|
| 1–7 noviembre | Escáner de carpetas, menú, scroll, dos himnarios, Biblia offline, vistas de salidas y primer instalador experimental | Compila, archivos reales se enumeran, cero mock visible |
| 8–14 noviembre | Vídeos MP4/WebM, imágenes, caché miniaturas, controles reales de Vista previa y Programa | Pausa/play/seek/limpieza sin regresión |
| 15–22 noviembre | Biblia: ambas vistas, flechas, fondo y borrado por salida; Himnario: selección por número/título | Referencias y capas correctas al cambiar contenido |
| 23–29 noviembre | Multipantalla HDMI/Spacedesk, audio del principal, modo Solo Audio/Video+Audio/Video y escenarios de contención | Sin duplicación de audio ni cortes entre destinos |
| 30 noviembre – 4 diciembre | Ensayo integral y congelación del instalador candidato, respaldo y plan B | Cero defectos bloqueantes S0/S1; ensayo de culto completo |
| 5 diciembre | **Solo si se aprobó el ensayo**: operar JA con copia instalador, archivos offline y respaldo FreeShow/JA2 probado | Si falla el gate, usar la opción anterior estable |

## Casos físicos mínimos de aceptación
1. Arrancar en Windows real: abrir, cerrar y reabrir sin ventanas residuales.
2. Vincular 2 carpetas de vídeo + 1 imágenes + Himnario Adventista + Cantos Juveniles; copiar, renombrar, borrar externamente y Actualizar. Verificar cifras contra Explorador y que desvincular NO borra.
3. Probar MP4 H.264/AAC, MP4 sin audio, WebM, JPG y PNG; gestionar formato no compatible sin colgarse.
4. Seleccionar un himno por número, vista previa, cambiar a otra colección y volver sin duplicados ni fotos en Multimedia.
5. Biblia RV1909: cuadrícula y lista; buscar Génesis 1:1, navegar a 1:2, proyectar, limpiar, cambiar fondo y vídeo. Verificar que no permanezca texto encima.
6. Una salida HDMI real: estado del botón corresponde a Play/Pausa; seek y volumen correctos. La imagen de Programa debe representar la salida real, no otro vídeo asincrónico.
7. Dos o más salidas: enviar contenido diferente, pausar una, cambiar otra, limpiar una; **ninguna debe interrumpir el audio principal**.
8. Scroll del área de archivos y pantallas NO debe mover Vista previa, Programa ni encabezado.
9. Guardar/configurar carpetas, apagar/reabrir y comprobar persistencia; probar offline.
10. Ensayo íntegro de culto de al menos 45–60 minutos con proyector, salida de sonido, Biblia e himnos. Registrar tiempos de respuesta y errores.

## Prioridades y criterio de fallo
- S0: cierre, pérdida de salida, congelamiento, mezcla incorrecta de audio; detener entrega.
- S1: controles inaccesibles, texto residual, avance bíblico incorrecto, lectura de carpetas fallida; detener entrega.
- S2: estética, scroll cosmético, miniatura tardía; corregir sin comprometer S0/S1.
- CI: vitest con archivos de prueba reales, regresiones de rutas, compilación Svelte/Electron, generación artefacto aislado.
- Windows/Spacedesk: aprobación manual obligatoria, con evidencia de pantalla y audio, independiente de CI.

## Arquitectura / decisiones
1. Motor y salidas FreeShow existentes; no migrar a Qt. Chromium se conserva internamente en este enfoque.
2. Aislar lo nuevo en `engine/src/frontend/components/ja/`, `engine/src/frontend/utils/jaGeminiLibrary.ts`, CSS de Gemini en `engine/public/` y `experiments/ja-gemini-freeshow/`.
3. No modificar `MainOutput.svelte`, control de audio, persistencia o capa de salidas salvo pruebas que justifiquen un cambio puntual.
4. El componente `Scripture.svelte` conserva cuadrícula/lista, navegador de textos locales y su lógica original.
5. No habilitar "enviar a todas", NDI, todas las transiciones ni futuros módulos mediante botones vacíos. Primero validar los cambios y ampliar.
