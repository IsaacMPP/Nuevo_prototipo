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

## Validación física inicial y corrección de integración (1 noviembre 2026)
Observación directa del operador en Windows: inicia; reconoce carpetas, 7 vídeos, 42 imágenes, 1 audio; MP4 se reproduce en Programa real. Reportó: Vista previa detenida, volumen no disponible, reloj y sliders superpuestos, selector bíblico blanco, proyección bíblica no fiable y acceso inesperado a FreeShow clásico. **No se declara corregido físicamente nada aún.**

Corrección candidata: arranque local silenciado y desacoplado en Vista previa; slider de Programa conectado únicamente a la sesión nativa (deshabilitado si hay más de una salida); fila de transporte organizada; selección bíblica alineada a drawerTabsData y mensajes de error; estilo del selector nativo; acceso clásico etiquetado como herramienta avanzada temporal. No se cambian motor de audio, MainOutput, flujos de fondo, ni reglas de aislamiento multipantalla.

**Pruebas de aceptación después del próximo artefacto:**
- Seleccionar MP4; Vista previa debe moverse sola, estar silenciada, y Play/Pausa/seek deben funcionar sin alterar el vídeo en Programa.
- En una salida activa, cambiar volumen de Programa 100→50→0→100%; confirmar con los altavoces del proyector que sí cambia. Pausar y reanudar; duración y progreso no deben montarse sobre los controles.
- Biblia RV1909: texto visible en selector oscuro; elegir Rut 2:1 y proyectar mediante el botón; comprobar que el texto en Programa corresponde a esa referencia, que no quedan capas residuales al cambiar a vídeo y que no cambia el audio sin autorización.
- No habilitar multipantalla hasta probar envío diferenciado, volumen solo principal, HDMI y Spacedesk. Si no se confirma proyección bíblica, registrar captura de Programa y salida física; S1 abierto.
- Acceso 'Herramientas avanzadas (FreeShow clásico)' permanece por configuración de funciones aún no migradas; no es otra instalación ni un motor diferente.

Estado: cambio candidato a CI; posterior validación Windows/HDMI/Spacedesk pendiente. No modificar main, rama oficial, PR #2 ni JA_Proyecciones2.

### Prompt de continuidad autocontenido (posterior a esta modificación)
Continuar JA Proyecciones Gemini + FreeShow 1.6.7, repo IsaacMPP/Nuevo_prototipo, rama experiment/gemini-freeshow. Se corrigieron en la rama experimental: reproducción automática silenciada de Vista previa, volumen de Programa mediante VideoPlayer y sesión aislada de una salida, diseño de transporte horario/slider, selección de Biblia sincronizada con drawerTabsData, selector oscuro y etiquetado del respaldo FreeShow clásico. Verificar resultado del último Actions y su instalador antes de afirmarlo listo. Efectuar pruebas físicas de reproducción previa, volumen, Rut 2:1 en Programa, cambio a multimedia, HDMI, scroll, salidas y audio; reportar S0/S1, corregir causa raíz. Preservar diseño Gemini, MainOutput, rama oficial feature/motor-propio-v1, main, PR #2 DRAFT y repo JA_Proyecciones2. No fusionar. Documentar cada cambio y producir prompt nuevo tras cada modificación.

## Incidente S1: ReferenceError al proyectar Biblia desde Gemini (1 noviembre 2026)

**Evidencia física:** al pulsar «Proyectar en principal» con una Biblia local visible y una salida FreeShow activa, Windows mostró «Error al proyectar Biblia: ReferenceError: getFirstActiveOutput…». Los libros/versículos sí se cargaban: el fallo estaba en el camino de generación de diapositiva, no en la importación del texto.

**Causa raíz verificable:** `scripture.ts`, función `getScriptureTemplateId()`, invocaba `getFirstActiveOutput()` sin importarlo. La referencia se evaluaba al preparar la plantilla de proyección, provocando el error en ejecución aunque compilara.

**Corrección aislada:** resolver el estilo de plantilla desde `getJAMainOutput()?.style`, igual que el destino empleado por `playScripture()`. Conservar el valor predeterminado de la plantilla cuando no exista salida principal válida. Añadir prueba de regresión al flujo experimental. No modificar `MainOutput`, la capa de audio, el HTML Gemini, FreeShow clásico, `main` ni JA_Proyecciones2.

**Aceptación pendiente (S1 abierto hasta Windows):** instalar artefacto generado desde este cambio; seleccionar específicamente **RV1909** y Rut 2:1 (no confundir con Dios Habla Hoy mostrada en la captura); proyectar y comprobar texto en Programa y salida HDMI. Repetir Génesis 1:1 y 1:2, lista/cuadrícula, cambiar a MP4 y comprobar borrado de versículo y audio intacto. Verificar además que la aplicación no regrese silenciosamente al motor clásico. Si el versículo no se proyecta, adjuntar captura y consola y mantener incidencia S1.

### Prompt de continuidad después del fix de Biblia

Continuar JA Proyecciones con diseño Gemini y FreeShow 1.6.7 en `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`. La captura física mostró ReferenceError getFirstActiveOutput al proyectar un versículo; en `scripture.ts` se corrigió el helper no importado usando `getJAMainOutput()?.style` en `getScriptureTemplateId()`, con regresión estática en `integration.test.cjs`. Consultar el CI del commit más reciente antes de descargar y probar instalador. Validar en Windows RV1909 Rut 2:1 y Génesis 1:1–2, pantalla Programa/HDMI, limpiar Biblia y cambiar a vídeo, sin interferencia con vista previa, volumen principal y salidas. S1 no terminado hasta prueba física. Proteger `main`, `feature/motor-propio-v1`, PR #2 y `JA_Proyecciones2`. No fusionar, documentar resultados y entregar prompt autocontenido después de cada cambio.

## P5 — Prevención de pérdida de EOF al cambiar modo en vivo (3 noviembre 2026)

**Base verificada:** GitHub Actions `#41735876977` del commit `da6b3682775b0c46172347332d0124609f870734` completó correctamente `gemini-engine` y publicó el artefacto `JA-Gemini-FreeShow-Experimental-Windows` (ID `13280091090`, expira 17 noviembre de 2026). Esto valida compilación/paquetización, **no Windows/HDMI/Spacedesk**.

**Riesgo encontrado en revisión estática:** el cambio de modo de playlist borraba `playlistNearEnd` aunque la pista seguía sonando; si el EOF ocurría entre dos consultas de 350 ms, podía perderse la transición. Además, una sesión HTMLAudioElement todavía registrada podía llegar a `ended=true` y `paused=true`, situación que no activaba la condición anterior de avance.

**Corrección limitada:** preservar el estado de fin de pista cuando solo cambia el modo, y reconocer `ended` nativo en una sesión que ya había mostrado progreso. Conservar bloqueo de avance para videos de la playlist con `loopVideo`, respetar `autoNext`, sin detener ni reiniciar media, sin alterar la cola actual excepto al activar Aleatorio, ni modificar audio, salidas, Biblia o FreeShow. Prueba de regresión estática añadida al experimento.

**Validación física pendiente (S1 si falla):** playlist de MP3 y video local en Normal, cambiar a Repetir canción / Repetir lista / Aleatorio en los últimos 0.5 s, comprobar continuidad de sonido, avance al EOF y ausencia de salto doble. Probar pausa manual cerca del final para confirmar que no adelanta estando en pausa; repetir con video de logo en Bucle ON y pulsar Siguiente manual. Después comprobar Solo audio desde Biblia, mezcla YouTube, grupo sincronizado con HDMI/Spacedesk y separación de relojes por pantalla. No cerrar P5 hasta resultados Windows.

**Prompt autocontenido para siguiente cambio:** Continuar JA Proyecciones; repo `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`, diseño Gemini y motor FreeShow 1.6.7. Base CI #41735876977 SUCCESS, commit da6b368, instalador Windows publicado. En incremento posterior se corrigió preventivamente el final de pista durante cambio de modo: conservar `playlistNearEnd` al cambiar Normal/Aleatorio/Repetir lista/Repetir canción y reconocer `HTMLAudioElement.ended` aun con `paused=true` si hubo progreso. Verificar nuevo Actions y artefacto antes de usarlo. Ensayar playlist mixta, modos en vivo cerca de EOF, pausa, Solo audio durante Biblia, bucle individual de Primario/HDMI/Spacedesk y reloj independiente tras separar pantallas; registrar y corregir S0/S1 antes de aprobar. No tocar `main`, `feature/motor-propio-v1`, PR #2 ni `JA_Proyecciones2`, no fusionar. Documentar y generar prompt después de cada modificación. Objetivo 5 diciembre 2026.


## P6 — Reproducción local y una única entrada «Solo audio» (4 noviembre 2026)
- Las listas usan destinos propios, sin depender de la tira Envío rápido.
- Con cero pantallas, los MP4 locales pueden reproducirse con imagen y sonido en Vista previa; MP3 y el audio de MP4 usan AudioPlayer.
- Se conserva la búsqueda global pero renombrada a «Solo audio», sin un segundo botón «Música de fondo».
- La biblioteca de listas incorpora cuadrícula/lista y miniaturas locales progresivas; audio conserva carátula neutra.
- Modos normal, aleatorio, repetir canción/lista y bucles por pantalla permanecen.
- Requiere pruebas físicas de Windows para garantizar códecs, audio y transferencia sin cortes.


## P7 — Gestión de pantallas físicas y ventanas (4 noviembre 2026)
- Se incorpora detección periódica de Windows (3 s), usando únicamente pantallas externas devueltas por Electron.
- Un primer proyector disponible se asigna como principal. Si la principal habitual falta, otra conectada asume provisionalmente esa función.
- Al reconectar la principal habitual, JA solicita confirmación y transfiere el contenido que está en vivo a ella; la provisional vuelve a secundaria vacía (no revive imágenes antiguas).
- Mostrar/Ocultar actúan sobre las ventanas nativas de salida, independientemente del audio y la reproducción. La pantalla de Windows queda libre al ocultar; cada salida tiene control individual y hay Mostrar todas/Ocultar todas.
- Las asignaciones de ID/etiqueta de pantalla, principal habitual y el ocultamiento manual se recuerdan localmente; se ofrece Olvidar configuración para una pantalla desconectada.
- Se muestra un aviso persistente ante nuevas pantallas/reconexiones y cuando no hay pantallas externas.
- Cuando queda sin pantalla externa, un MP4 local puede continuar en la Vista previa de la laptop y al reconectar se envía con startAt tomado del reloj actual.
- Riesgos que requieren prueba en Windows real: estabilidad de los IDs de Electron, reconexión de HDMI y spacedesk, compatibilidad de códecs, reproducción y audio sin saltos, posición inicial de cada ventana, transferencia de escenas superpuestas y presentaciones externas.
- Nunca fusionar la rama experimental hasta completar esas pruebas y corregir los errores que aparezcan.


## P7b — Endurecimiento de la reasignación
- Se conserva una única asignación por pantalla física, aun cuando Windows cambie su etiqueta.
- Las asignaciones manuales también se recuerdan y el audio nativo recalcula la salida autorizada tras intercambiar la principal.
- No se transfiere una composición antigua si la desconexión no se observó durante esta sesión; se evita mostrar contenido obsoleto en la pantalla reconectada.
