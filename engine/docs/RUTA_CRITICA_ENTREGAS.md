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

# Ruta crítica de entregas

| Fase | Resultado mínimo verificable | Criterio de salida |
|---|---|---|
| 0 · Arquitectura y documentación | Contratos, mapa de módulos, escenarios y gobernanza | Revisión aprobada, sin código heredado accidental |
| 1 · Identificación de dispositivos | Inventario real de monitores y etiquetas; prueba de identificación por monitor | TV e iPad asignados correctamente después de conectar/reordenar |
| 2 · Destino principal y salidas | Asignación estable, principal elegido, persistencia y manejo de desconexión | Clic normal solo principal; selección puntual a auxiliar |
| 3 · Audio y reproducción | Audio de video en principal, auxiliares silenciosos y controles separados | Dos medios diferentes sin interferencia; pruebas de mismo medio y reconexión |
| 4 · Centro de control y UX | Vista adaptable con controles por destino; configuración básica/avanzada | Operador nuevo puede preparar y operar dos salidas sin confusión |
| 5 · Contenidos | Biblia, multimedia, himnario, presentaciones y organizador integrados | Flujos de culto completos y pruebas de regresión |
| 6 · Empaquetado y entrega | Instalador Windows, CI, diagnósticos y documentación de usuario | Build reproducible y prueba de aceptación en equipo real |

## Reglas de avance
Una fase solo pasa a «completa» con evidencia en código, CI y, cuando se trate de hardware, prueba física. Los fallos bloqueantes se resuelven antes de añadir funciones. No se fusionan PR sin permiso.

## Criterios adicionales de aceptación acordados
- **Fase 0:** auditoría explícita de capacidades y ajustes nativos de FreeShow para evitar retirar funciones operativas.
- **Fase 1–2:** sin proyector principal, intentar proyectar abre el selector de salidas, permite identificar, escoger y guardar principal; cancelar no envía. Si está desconectado, reconectar explícitamente.
- **Fase 2–3:** clic normal únicamente principal con audio; secundarios por selección explícita, sin audio ni sobrescritura de los demás.
- **Fase 3–4:** controles independientes por salida y estado en tiempo real, conservando integraciones nativas de FreeShow.
- **Todas las fases:** Configuración debe reflejar inmediatamente cada capacidad agregada; prueba de funcionamiento del ajuste, no solo visualización. Mantener ajustes avanzados nativos intactos.

## Subhito prioritario anterior al Himnario — Biblia en vivo
- Navegación: flechas simples al proyectar, sin robar teclas a entradas de texto ni duplicar avances; verificar límites de capítulo/libro y regresión general.
- Estilos: editar fuente, tamaño, color, alineación y fondo mientras se proyecta; la vista previa y la salida activa deben coincidir sin re-proyectar manualmente.
- Persistencia: cambios de estilo aplicables a todos los siguientes versículos, capítulos y libros, y después de reiniciar, sin alterar involuntariamente otras salidas/plantillas.
- Validación: CI Windows, prueba real durante proyección y documentación de resultados antes del Himnario.

## Norma de ejecución por entregas cerradas — 26-oct-2026
**Decisión del propietario:** dejar de trabajar por incidencias improvisadas que aplazan indefinidamente módulos anteriores. Planificar entregas completas con dependencias, criterios de aceptación y capacidad de retomar trabajo entre chats. Esta sección es la fuente de orden operativo; las fases históricas 0–6 anteriores conservan sus contratos técnicos, en especial multipantalla, pero no deben interpretarse como tareas paralelas activas.

### Secuencia de entregas (una entrega activa a la vez)
| Orden | Entrega | Alcance para darla por cerrada | Dependencia |
|---|---|---|---|
| E0 | Base FreeShow JA estabilizada | CI/instalador, carga, rutas JA, identidad, ausencia de actualización de FreeShow y regresión básica; reportar pruebas Windows | Base ya incorporada; aceptación parcial |
| E1 | Biblia completa | RV1909 offline; importar FSB locales con persistencia y manejo de errores; navegar por flechas mientras se proyecta; plantilla editable con texto real en previsualización; cambios de tipografía/tamaño/color/alineación/fondo de color o imagen visibles en pantalla en tiempo real; persistencia a próximos versículos, libros y reinicio; sin tocar otras salidas | E0 funcional |
| E2 | Editor compartido de textos | Centralizar controles de estilos reutilizables en presentaciones, plantillas y bienvenida donde proceda, sin fusionar estados de contenido ni romper FreeShow | Componentes E1 validados |
| E3 | Contenidos adicionales | Himnario Adventista (índice/búsqueda/proyección), cantos y carpetas multimedia vinculadas, sin redistribuir material sin permisos | E1 estable |
| E4 | Multipantalla y audio | Inventario/identificación, principal único, auxiliares independientes silenciosos, audio del principal, reconexión y controles dedicados según ARQUITECTURA_MULTIPANTALLA | Base E0, contratos previos; integrar con E1–E3 |
| E5 | Integración y versión de entrega | Regresión de culto completo, rendimiento, instalador, documentación, respaldo y aceptación en Windows | E0–E4 |

### Reglas obligatorias de ejecución
1. Mantener **un solo bloque de entrega activo**; dentro de él trabajar unidades pequeñas y coherentes. Nuevas ideas fuera de alcance van al backlog con prioridad y dependencia, no interrumpen la unidad activa. El usuario puede reordenar explícitamente el plan.
2. Registrar cada unidad con: objetivo, causa raíz, archivos/capas afectados, definición de terminado, pruebas automatizadas, pruebas manuales y riesgos. No hacer ajustes sueltos sin entender la estructura original de FreeShow.
3. Clasificar incidencias: **P0** bloqueo de arranque, datos perdidos, seguridad o imposibilidad de proyección; **P1** función esencial de entrega activa rota; **P2** defecto secundario o de otro módulo; **P3** mejora estética/futura. P0/P1 se corrigen en la entrega activa; P2/P3 se anotan sin perderlos ni bloquear innecesariamente.
4. Una unidad de código solo está **implementada** cuando está en Git; **validada CI** cuando el run correcto pasó; **aceptada** solo cuando se probaron interacciones reales relevantes en Windows. No confundir estas etiquetas. No lanzar compilaciones de instalador por cambios únicamente documentales; agrupar los cambios lógicos relacionados.
5. Evitar parches acumulativos: si el problema es de renderizado, estado, persistencia o enrutamiento, corregir la capa responsable. El motor FreeShow y sus funciones existentes se preservan.
6. El cierre de una entrega exige checklist de aceptación aprobado y documentación actualizada, no ausencia absoluta de defectos triviales. Ningún pendiente P0/P1 queda oculto bajo una entrega cerrada; los P2/P3 se trasladan explícitamente con propietario/etapa prevista.
7. Mantener el PR #2 en borrador, nunca fusionar sin autorización. Actualizar registro, master, continuidad y ruta crítica después de cambios. El resumen de cada chat debe indicar entrega activa, completadas, bloqueantes, pendientes y siguiente unidad exacta.

### Situación real al reorganizar
- **E0:** compilación #40419290477 exitosa para importación FSB; no significa aceptación manual total de instalador o biblioteca.
- **E1 ACTIVA:** primer enlace de plantilla a proyección (`aea39a6`) implementado, workflow #40420576232 en ejecución al registrar este plan. Falta aceptación de importación FSB, sincronización sin parpadeos ni historial duplicado, vista real en editor, controles de color/fondo y persistencia verificable.
- **E2–E5:** planificadas, no declaradas implementadas.
- **Siguiente unidad técnica concreta:** revisar CI del cambio de plantilla, auditar flujo de actualizaciones de salida/estilo y diseñar una única ruta de estado persistente; completar previsualización de versículo real y cambio live sin usar la regeneración completa por cada edición. Pruebas antes de avanzar.

## Repriorización 27-oct-2026: Himnario → Multipantalla → Editor compartido
E1 Biblia: aceptada funcionalmente en los flujos que el usuario comprobó; no reabrir sin defecto reproducible. Editor general queda aplazado.
**H1 ACTIVA: Himnario independiente.** Crear navegación y panel de Himnario adyacentes a Biblia, no dentro de Multimedia. La carpeta, archivos, búsqueda y recuentos de himnos han de quedar aislados de Multimedia; reutilizar motor de reproducción/proyección FreeShow pero no su biblioteca visible. Incluir índice por número y título, importación local autorizada, letra/medios, estilos persistentes, navegación y pruebas Windows. No redistribuir obras protegidas sin autorización.
**M1 siguiente: Pantallas múltiples.** Implementar sobre contratos de docs/ARQUITECTURA_MULTIPANTALLA.md: principal con audio, auxiliares independientes sin audio, selección de destino, desconexión y reconexión, conservar ajustes avanzados FreeShow.
**T1 después: Editor compartido.** Presentaciones, bienvenida y estilos de texto, no trabajar antes de cerrar H1 y M1.
**F1 final: Integración, pruebas, instalador y documentación.**
**Navegación agrupada:** Biblia / Himnario juntos, Multimedia / Audio juntos, presentaciones y plantillas juntos, Pantallas y salidas en configuración; mantener pestañas independientes y no romper IDs existentes.
**Primera unidad H1-01:** auditar lector/proyección existente, rutas e índices de MediaTabs y librería media, formato y licencia de himnos. H1-02 pestaña y almacenamiento aislado; H1-03 búsqueda/importación; H1-04 proyección; H1-05 pruebas Windows. No confundir pestaña visible con módulo funcional.

## H1-01 — Auditoría de referencia histórica verificada (27-oct-2026)
**Repositorio fuente de aprendizaje, no para fusionar:** `IsaacMPP/Ja_Proyeccion` rama `main`. `docs/JA_BIBLIOTECA_FASE2.md` y `docs/JA_CONTINUIDAD.md` confirman de modo explícito que **himnos y cantos son videos de carpetas Windows, NO letras TXT**. En el código antiguo `src/frontend/components/drawer/media/jaVideoLibrary.ts`, las funciones `normalizeJASearch`, `matchesJAVideoName`, `getJAVideoLibraryName` permiten buscar números sin ceros, títulos sin acentos y biblioteca más específica. `Media.svelte` implementó búsqueda esta carpeta/todas y filtro solo videos sobre `READ_FOLDER`; la profundidad documentada es hasta 5 niveles. El historial funcionaba **dentro de Multimedia**, no existía aislamiento real.
**Corrección de alcance H1:** H1 será **videohimnario** con pestaña y biblioteca propias, separado de Multimedia y Audio; conservar videos íntegros, miniaturas, controles y motor de salida originales de FreeShow. No construir importador TXT, conversor de letras o editor de estrofas como requisito H1. Además de Himnario Adventista, permitir bibliotecas de videos Cantos Jóvenes, Conquistadores y Aventureros sin mezclar con Multimedia. Diseñar persistencia de rutas y exclusión de índices/subcarpetas de Multimedia, incluso si la ruta de Himnario es descendiente de otra ruta multimedia. No copiar video ni importarlo en el paquete instalador; códecs reales requieren validación Windows.
**Siguiente implementación H1-02:** inventariar `mediaFolders`, `Media.svelte`, `MediaTabs.svelte`, `Main.READ_FOLDER`, acciones de preview/play y `drawerTabs` actuales. Definir `hymnFolders` o equivalente separado y la exclusión de rutas desde indexación multimedia antes de agregar pestañas. Aceptación: dos colecciones de videos, `001` y `1`, nombre parcial, vista previa privada, pantalla en vivo con audio principal, ocultamiento total en Multimedia, preservación después de reiniciar.

## Plan ejecutivo H1 — Videohimnario independiente (27-oct-2026)
**Propósito:** biblioteca de VIDEOHIMNOS (archivos existentes de Windows, no textos ni diapositivas generadas) con pestaña propia junto a Biblia y exclusión real de los archivos de Himnario de Multimedia. La versión anterior es referencia de comportamiento, no base de código a fusionar. **No tocar main ni fusionar PR #2.**

**Regla de avance:** una fase de implementación a la vez, diseño y pruebas previos; código en rama activa, GitHub Actions verde, pruebas Windows del usuario y actualización de registro. Un botón visible por sí solo no completa una fase. Si hay fallo P0/P1, corregir antes de iniciar la siguiente. No hacer builds por documentación únicamente.

| Etapa | Alcance / entregable medible | Criterio de aceptación | Dependencia |
| --- | --- | --- | --- |
| H1-01 Auditoría y diseño | Inventario de `mediaFolders`, índices/búsqueda, `Main.READ_FOLDER`, vista previa, reproducción y salidas; contrato de rutas, aislamiento y formatos; mapa de referencias del antiguo proyecto | Documento con capas afectadas, exclusiones, riesgos y pruebas; **sin cambio funcional** | Ninguna |
| H1-02 Datos separados | Almacenamiento persistente de carpetas de himnos con rutas originales; registro separado de Multimedia, bloqueo de duplicidad de indexación y solapamientos de subcarpetas | Reiniciar sin perder carpetas; ningún video/carpeta de Himnario aparece en listado, recuento ni búsqueda de Multimedia, incluso subcarpetas | H1-01 |
| H1-03 Navegación y catálogo | Pestaña **Himnario** junto a Biblia; selector de colecciones (Himnario Adventista, Jóvenes, Conquistadores, Aventureros), agregar/quitar carpeta sin alterar videos, miniaturas y lista/cuadrícula responsiva | Cambiar de colección; numeración y título legibles; Multimedia sigue intacta | H1-02 |
| H1-04 Búsqueda | Buscar número 1/001, parte del título, tildes, mayúsculas; alcance colección o todas, subcarpetas; ordenar por número | Pruebas automáticas de coincidencia exacta numérica, nombres repetidos y bibliotecas; resultados correctos con videos reales | H1-03 |
| H1-05 Vista previa y reproducción | Selección sin emitir, reproducción privada, enviar a proyector principal, controles play/pausa/seek/volumen/parar, conservar miniaturas y archivos originales usando FreeShow | Ver video en previo sin proyectarlo; emitir y controlar solo al pulsar acción; probar MP4, AVI/MKV solo donde haya soporte de códecs | H1-04 |
| H1-06 Estabilidad e integración | Persistencia, carpetas removidas/desconectadas, errores amigables, compatibilidad con Biblioteca multimedia, navegación, acciones y reinstalación | CI verde, pruebas de regresión (Biblia, Multimedia), reinicio; aceptación explícita de usuario en Windows; actualizar documentos | H1-05 |

**No incluidos en H1:** OCR/extracción de letra, TXT, editor de estrofas, conversión de video/códecs, alojamiento en nube, descarga automática de himnos, distribución de contenido de terceros. Video pertenece al propietario y no se copia ni empaqueta.

**Orden general tras H1:** M1 multipantalla (inventario/dispositivo principal, auxiliar independiente, enrutamiento de audio y reconexión conforme a ARQUITECTURA_MULTIPANTALLA); T1 editor general (aplazado); F1 paquete final.

**Inicio autorizado para la próxima modificación:** H1-01, auditoría de dependencias y contrato de biblioteca separados. No empezar pestaña/maquetas hasta definir dónde se almacenan e indexan los videos, y cómo se excluyen de Multimedia.

## REQUISITO PERMANENTE — Carpetas autodescubiertas (27-oct-2026)
**Regla de arquitectura prioritaria, válida para todos los módulos y futuros chats:** `src/electron/utils/jaContentFolders.ts` crea en Documentos/JA Proyecciones 2 las carpetas Biblias, Himnario Adventista, Cantos Juveniles, Fondos Personalizados, Audio, Imagenes, Videos, Importaciones, Presentaciones, Cache y Configuracion. No basta crearlas: cada módulo debe descubrir y sincronizar automáticamente archivos de su carpeta, sin exigir importación manual tras copiarlos con Explorador de Windows. Al inicio, al abrir el módulo y ante cambios de archivos (watcher con reconciliación y fallback) actualizar altas/bajas/renombrados, respetando integridad, formatos válidos, errores y persistencia. No copiar, modificar ni borrar originales; jamás mostrar archivos de categorías ajenas.
**Estado auditado:** `src/frontend/utils/jaMediaFolders.ts` registra Fondos Personalizados/Imagenes/Videos en `mediaFolders` y Audio/Cantos Juveniles en `audioFolders`; NO registra Himnario Adventista ni Biblias para autodescubrimiento. `Cantos Juveniles` está mal categorizado para los videohimnos reales. Esto se corrige en H1. Separar himnos de Multimedia por índices/rutas incluso en coincidencia con rutas de usuario (evitar duplicidades y fugas).
**Actualización fases H1:** H1-01 debe especificar autodescubrimiento y un inventario de carpetas (incluyendo contenido depositado antes del primer inicio). H1-02 implementa vinculación y reconciliación automática de Himnario Adventista + Cantos Juveniles con catálogo independiente. H1-03/04 interfaz/búsqueda solo sobre el catálogo. H1-05 reproducción nativa FreeShow. H1-06 pruebas: copiar video a carpeta con programa abierto y cerrado, reconocer sin botón Importar, renombrar/borrar y reflejar, reiniciar, no aparecer en Multimedia, no afectar datos externos. **Biblias y otras carpetas**: auditar flujos actuales, registrar entrega propia de autodescubrimiento, evitar afirmar que ya funcionan si solo existen los directorios.

## 2026-10-27 — Norma permanente de ingeniería y optimización H1
**Instrucción expresa del propietario:** cada solicitud de mejora es un objetivo/problema, NO una orden literal de añadir controles. Antes de tocar el código: auditar funciones nativas de FreeShow y la versión histórica Ja_Proyeccion, identificar solapamientos, analizar consecuencias en PC de bajo rendimiento, proponer la solución más simple y sostenible; si ya existe una función semejante, reutilizarla o sustituirla, nunca dejar dos buscadores/controles conflictivos. Primero arquitectura, después implementación, CI y prueba Windows. Recordar en todos los chats futuros.
**Auditoría:** repo anterior docs/JA_BIBLIOTECA_FASE2.md reutilizaba el generador persistente de miniaturas FreeShow, su MediaGrid/VirtualList y búsqueda única; no era un conversor separado implementado por JA. Repo nuevo dibujaba todas las ~613 tarjetas, lanzaba carga de miniaturas al intersectar sin límite global y tenía búsqueda general del drawer más búsqueda propia dentro del scroll.
**Cambios:** jaHymnThumbnailQueue.ts limita a 2 solicitudes simultáneas y mantiene caché de promesas sobre loadThumbnail nativo FreeShow; HymnThumbnail lo reutiliza; Drawer oculta su buscador general solo en Himnario; HymnCatalog fija su encabezado/buscador fuera del contenedor scroll, difiere el renderizado de tarjetas fuera de viewport mediante content-visibility y recarga cache en Actualizar. Commits 1f345fe, 365389c, 998d6bc, 52fbb76. **Pendiente** GitHub Actions y pruebas Windows desplazamiento rápido con 613 videos y memoria/CPU; valorar virtualización de cuadrícula si sigue lento. PR #2 permanece draft, no tocar main.

## H1-07 — Ubicaciones de videohimnos vinculadas y recuperables (requisito aprobado conceptualmente, 27-oct-2026)
**Necesidad expresada:** usar discos USB, externos, unidades de red o carpetas fuera de Documentos sin copiar material. Las carpetas internas `Himnario Adventista` y `Cantos Juveniles` mantienen carácter predeterminado; añadir ubicación externa como asociación lógica por colección, incluso si carpeta interna no está vacía.

**Auditoría inicial:** `jaHymnLibrary.ts` solo lee `Main.JA_CONTENT_FOLDERS` y `Main.READ_FOLDER` de ubicaciones fijas; `jaMediaFolders.ts` únicamente migra carpetas JA administradas fuera de Multimedia. FreeShow ya dispone del selector de carpetas `Main.OPEN_FOLDER` / `ToMain.OPEN_FOLDER2` usado por MediaTabs, que conviene reutilizar en lugar de crear selector nuevo.

**Diseño y orden de implementación, posterior a aceptación de virtualización:**
1. H1-07a — modelo de datos persistente `collection -> linkedFolders[]`, con rutas normalizadas, validación, no duplicados ni superposiciones peligrosas; conservar carpetas internas por separado. Configuración guardada en almacenamiento de perfil/datos JA, **no** dentro de la unidad extraíble. Evitar indexar enlaces de Himnario en Multimedia/Audio.
2. H1-07b — interfaz para `Vincular carpeta`, `Cambiar ubicación` y `Desvincular` mediante selector nativo FreeShow. Estado visible `Conectada`, `Sin videos`, `Unidad no disponible` y `Ruta cambiada`; no generar diálogos invasivos al arrancar. Para Biblioteca vacía presentar opción de forma contextual, pero permitirla también con contenido interno.
3. H1-07c — reconciliación no destructiva al inicio, abrir Himnario, volver a enfocar y pulsar Actualizar; si desaparece unidad, preservar vínculo y datos de configuración, no borrar originales ni el registro. Si vuelve con la misma ruta, reanudar. Cambio de letra de Windows requiere re-vinculación explícita y confirmada, sin adivinar unidades.
4. H1-07d — pruebas CI y Windows: disco desconectado al iniciar, reconexión, cambio de letra, ruta borrada, dos colecciones separadas, archivos duplicados por ruta, cambio de colección, cero resultados, no mezclar en Multimedia, miniaturas PNG y scroll rápido con 613+ videos. Sin bloqueo de arranque ni ocultar mensajes de error.

**Límite:** No inferir que unidad desconectada equivale a biblioteca vacía ni borrar un enlace por no encontrar archivos. No copiar, mover o modificar videos originales. Priorizar pruebas de unidades reales. Permitir varios orígenes por colección sin imponer importación manual. La regla permanente de revisar alternativas ya existentes antes de crear componentes sigue vigente.

## 2026-10-27 — M1 ampliación acumulativa: controles, envío múltiple y sincronización
**Nunca desplazar pendientes anteriores.** El usuario exige mantener íntegro el backlog de M1 y el de otras fases. M1-03 selector de destinos global para Biblia/presentaciones/PowerPoint/imágenes/video/texto/Himnario; M1-04 control INDEPENDIENTE play/pause/seek/loop/stop por output; M1-05 envío del mismo contenido a cualquier SUBCONJUNTO de salidas elegido por operador, y SINCRONIZACIÓN de diapositivas/versículos y videos (reloj/media time/salto) con opt-in y grupos persistibles; M1-06 consola visual profesional y prompter/logo autónomo; M1-07 pruebas multi-salida/hotplug/PC baja potencia. Los nuevos defectos se añaden como subtareas, no sustituyen esto.
**Implementación parcial actual:** commit `080693f` añade panel desplegable «Controlar pantalla» en cada vista previa existente de `MultiOutputs.svelte`, reutilizando `MediaControls` con outputId individual. Commit `0b4c729` añade `sendToJAOutputs(type,data,outputIds)` que ejecuta envío explícito por conjunto de outputs, filtrando duplicados, con el contrato `sendToJAOutput`. **NO hay UI de selección múltiple ni sincronización temporal todavía; no llamarlo terminado.** Falta CI, pruebas Windows y verificar casos mismo archivo/dos destinos; algunos controles actuales de VideoPlayer aún están indexados por path. Pendiente modernizar el selector del Himnario mediante popover reutilizable, integración global, controles 'stop' y selector de groups. No fusionar PR2 ni modificar main.

## 2026-10-27 — Auditoría y primera modernización UI sin perder scrubbing
Verificado en `src/frontend/components/drawer/media/MediaCard.svelte` que la previsualización de video por movimiento horizontal de cursor existe mediante eventos `mouseenter`, `mousemove`, `mouseleave`, función `move` y `videoElem.currentTime`; **regla de no regresión**: conservar este comportamiento, previsualización privada y selección, sin autoplay masivo y sin cambios al motor. Himnario utiliza `HymnCatalog.svelte` + `HymnThumbnail.svelte` + `VirtualList` y cola limitada; no incorporar 613 reproductores al grid para imitar scrub, evaluar reuso de MediaCard o vista previa activa limitada en fase específica con pruebas de memoria y scroll. Commit `d7eddab` cambia únicamente CSS de `HymnCatalog.svelte`: tarjetas más limpias, controles compactos, hover/focus, sin tocar virtualización ni playback. REDISEÑO DE TODO EL PROGRAMA todavía NO completado: auditar componentes compartidos de menús, Multimedia y catálogo; preservar M1 selector global, grupos, sincronización, prónter, H1, T1, F1. Validación CI y Windows pendiente; PR #2 draft y main intacta.

## Bloqueo de calidad prioritario — 2026-10-28: flechas de Biblia tras proyección universal

**No inaugurar una fase nueva hasta resolver o documentar explícitamente esta regresión.** El usuario confirmó Biblia visible en principal JA pero sin avance mediante flechas. Diagnóstico por lectura de código, todavía NO corregido ni verificado Windows: `scripture.ts` detecta salida con `getFirstActiveOutput()`, no principal manual JA; `Scripture.svelte` ya tiene navegación `_moveSelection()` pero `isActiveInOutput` depende del detector; `shortcuts.ts` canaliza flechas a `OutputHelper.advanceOutputs()`, pensado para shows, no versículos temporales `temp`.

**Criterios del próximo cambio:** reutilizar el controlador bíblico, unificar identificación de principal sin escoger otra automáticamente, controlar flechas solo en Escrituras y sin interferir con inputs, conservar atajos nativos fuera de Biblia; probar RV1909, capítulos, split verses, TV principal/iPad secundaria y audio independiente. Requiere CI y prueba Windows; el último CI de código `7d7c459` fue exitoso al segundo intento (#40635140956), pero no resuelve funcionalidad comprobada por usuario.

**Después de validar:** continuar M1-03 `Enviar a…` universal; M1-05 grupos lógicos y transporte compartido; M1-06 consola/prónter; M1-07 desconexiones/rendimiento; posteriormente T1 y F1. No eliminar pendientes H1 ni mejora visual. PR #2 draft, `main` intacta.

