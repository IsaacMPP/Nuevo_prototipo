# JA Proyecciones — plan de integración completa, consola única Gemini

**Decisión vinculante 1 de noviembre de 2026:** **UNA SOLA interfaz de operador JA Gemini.** FreeShow 1.6.7 permanece solo como motor interno de proyección/audio/salidas (con sus licencias). La antigua interfaz `MainLayout` ya no debe montarse desde `App.svelte`, ni mostrarse como «herramientas avanzadas» ni servir de salida de emergencia en la consola. El código FreeShow puede reutilizarse como servicios, sin volver a exponer su UI.

**Repositorio exclusivo:** `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`. No cambiar `main`, `feature/motor-propio-v1`, PR #2 ni repo `JA_Proyecciones2`. Prohibido fusionar sin permiso.

## Principio de entrega
La interfaz debe funcionar como un **sistema operativo integrado**, no como una maqueta. Un botón visible y habilitado debe tener handler real, estado/feedback verificable y pruebas. No decir que un módulo está terminado por compilar. No dar por operativo un botón simplemente porque se ve o porque el test encuentra un nombre de función. Los botones deshabilitados de capacidades esenciales son incidencias abiertas y no constituyen producto final.

## Estado real tras la primera integración de consola única
- **Implementado en el commit inicial de esta fase:** `App.svelte` monta siempre Gemini para el operador y mantiene `MainOutput` para la ventana de proyección; el menú de FreeShow clásico desaparece. El engrane abre el componente independiente `JaGeminiSettings.svelte` con operaciones reales **limitadas**: seleccionar salida de trabajo existente, cambiar vista Biblia grid/list, vincular multimedia/himnario y actualizar catálogos. Los controles faltantes no se simulan.
- **Pendiente S1:** Vista previa bíblica compuesta, editor y estilos persistentes, navegación de flechas exclusiva de Gemini, borrado selectivo de capas, panel de configuración completo, botones globales, presentaciones, otros módulos.
- **Pendiente S0:** enrutamiento/audio/imagen multipantalla independiente, volumen por destino, envío seguro a HDMI/Spacedesk, manejo de desconexión, estabilidad en uso continuo.
- **La pantalla clásica NO es un plan B operativo:** respaldo solo con otra instalación estable separada, preparada y probada, para el evento.

## Arquitectura a desarrollar SIN motor paralelo
1. `GeminiShell`: presentación y navegación; rutas de módulos sin lógica embebida innecesaria. Inventario exhaustivo post-build de botones, menús, selectores, sliders, atajos y acciones contextuales. Propietario de control, validaciones y pruebas.
2. `PreviewDraftStore`: contenido **no emitido** por módulo (Biblia, Himnario, multimedia, YouTube, presentaciones, fondos). Tipo, referencia, composición, fondo, plantilla y versión del borrador. Nunca apuntar directamente al objeto mutable de `ProgramState`.
3. `PreviewRenderer`: muestra composición de texto/fondo/efectos con proporción y área segura de destino, local e independiente del motor de Programa; multimedia sin audio salvo escucha explícita.
4. `ProgramRouter`: paquete atómico validado + destino(s) concretos; reproduce desde servicios FreeShow existentes, confirma resultado y conserva independencia entre salidas.
5. `BibleController`: selección de traducción/libro/capítulo/versículo → Vista previa → estilo → Proyectar. Modo Preparación vs Modo En vivo. Las flechas no dependen del estado invisible de `MainLayout`/`activeDrawerTab`. Mantener plantilla/fondo al avanzar; opción explícita de superponer; limpiar solo texto.
6. `SettingsController`: salida/pantalla física principal, resolución, selección de dispositivo, audio del principal y secundarios, carpetas, Biblioteca, Biblia, plantillas, transiciones, atajos, persistencia, restauración con alcance definido.
7. `TransportController`: reproducir/pausar/seek/volumen/mute local versus Programa, sin dobles sesiones de audio ni cambios inesperados al cambiar contenido.
8. `OutputStateController`: descubrir monitores Windows reales, cambio/disconexión, HDMI, pantallas virtuales, nombres/modelos/resoluciones, salidas NDI solo como etapa posterior. Por salida: Vista previa, Programa, capas, estado, audio, playback.
9. `RegressionSuite`: tests unitarios, integración, UI/E2E y gate físico; lógica de estado y servicios inyectables para pruebas sin pantallas, más ensayos reales.

## Bloques de desarrollo y aceptación
| Orden | Bloque | Debe funcionar de extremo a extremo para cerrar |
|---|---|---|
| **P0 — S1** | Consola única + inventario UI | Un solo diseño; configuración se abre y cierra sin perder emisión; extracción **real** del DOM final: 100 % de botones, rutas, selectores, atajos y menús clasificados (operativo/conocido pendiente/error). Sin enlaces a interfaz clásica |
| **P1 — S1** | Consola/Configuración completa | Todos los controles globales con acción real y respuesta: Quick Play, Cortar, Fundido, Negro reversible, Logo, Restablecer con ámbito, Limpiar texto, configuración de salidas, biblioteca, atajos y persistencia. No aprobar mientras queden acciones esenciales inertes |
| **P2 — S1** | Biblia end-to-end | Seleccionar Rut 2:1, ver render compuesto privado; editar tamaño/tipo/color/alineación/posición/fondo; guardar/reutilizar plantilla; Proyectar a salida seleccionada; flechas modo Preparación/En vivo; pasar a Génesis 1:1 y 1:2; borrar texto sin borrar fondo; no dejar residuos al proyectar vídeo |
| **P3 — S1/S0** | Vista previa y Programa audiovisual | MP4, WebM, JPG, PNG, audio, Himnario real; preview y programa independientes; pausa/seek/reloj/volumen exactos; miniaturas con caché, control por módulo, archivos/offline, cambio rápido sin bloqueo ni duplicación |
| **P4 — S0** | Multipantalla/audio y video | Detección/configuración automática y manual de monitores; destino por salida, previsualización de todas, pantalla principal con audio y secundarias sin audio de forma controlable; enviar/cambiar/limpiar una no modifica las otras; HDMI/Spacedesk real; gestión hot-plug y estados |
| **P5 — S1** | Presentaciones, YouTube, fondos, listas | Importación, preview compuesta, emisión, controles y navegación completamente integrados; sin redirigir a otra UI; matriz de formatos y fallos controlados |
| **P6 — Release** | Ensayo integral | CI + E2E + instalador; escenario culto 45–60 min con proyectores y audio; cero S0/S1; respaldo probado fuera de la consola Gemini; versión candidata congelada |

**Dependencias:** P2 y P3 requieren PreviewDraft/ProgramRouter de P1 (estos servicios se deben diseñar juntos; no implementar fundidos/atajos en el mock). P4 se diseña desde el inicio pero solo se habilita con pruebas de aislamiento y audio.

## Matriz de controles mínimos (inicial, pendiente inventario DOM real)
| Área | Controles/acciones | Estado al iniciar esta fase |
|---|---|---|
| Cabecera | Configuración, guardar, estado real, selección salida | Configuración parcial; demás por auditar |
| Preview | Play/pausa, seek, mute, seleccionar, reiniciar, estilo, borrar borrador | Multimedia parcial; Biblia pendiente |
| Publicar | Quick Play, Cortar, Fundido, destino, envío múltiple | Solo publicación una salida parcial; falta semántica correcta |
| Programa | Pausa, seek, volumen, mute, limpiar fondo, limpiar texto, Negro, Logo, Restablecer | Vídeo/fondo parcial; varias acciones deshabilitadas |
| Biblia | Versión, libro, capítulo, versículo, grid/list, formato, fondo, flechas, proyectar, quitar | Selección/proyección básica; edición/preview/flechas pendiente |
| Himnario | Colecciones, buscar, carpeta, miniaturas, preview, reproducción, enviar | Biblioteca parcial |
| Multimedia | Carpeta, filtro, vista, orden, actualizar, miniaturas, preview y emitir | Parcial |
| Otros | YouTube, Presentaciones, Fondos, Listas, atajos, diálogos y menú superior | Pendiente |

**Inventario automatico pendiente:** analizar HTML/Tailwind post `npm run build:ui`, eventos añadidos por Shell y componentes Svelte, crear CSV/JSON con IDs y estado y un test de cobertura de interacciones; no afirmar que la tabla anterior es exhaustiva. Llevar incidencias de funcionalidades esenciales como S1 aunque estén deshabilitadas.

## Condiciones técnicas obligatorias
- Motor FreeShow se conserva y no se usa `MainLayout` desde la UI.
- No poner efectos globales sobre cualquier salida: todas las operaciones reciben un `outputId` o lista validada.
- Vídeos silenciosos en Preview por defecto; el audio local opcional nunca afecta audio de Programa.
- Biblia no puede heredar fondo multimedia por accidente. Modo superposición explícito; cambio a vídeo retira texto antiguo.
- Evitar lecturas/miniaturas descontroladas: colas, cache, cancelación, estado de carga y errores.
- No codificar falsas respuestas de éxito; guardar y presentar estado emitido por FreeShow.
- Medir versiones, builds y revisiones; la build del CI es candidata, no prueba física.
- Preservar los textos y marcas de atribución y licencias GPL de FreeShow y biblias autorizadas.

## Secuencia inmediata después de este primer commit
1. Verificar CI del commit de consola única. Instalar en Windows y confirmar que NO aparece FreeShow clásico, que la configuración JA abre/cierra y acciones realmente disponibles responden; revisar que carpetas previas e instalación JA2 no hayan cambiado.
2. Crear inventario automático completo del DOM de producción, con pruebas negativas para botones deshabilitados/sin handler inesperados.
3. Diseñar e integrar `PreviewDraftStore`, `BiblePreviewRenderer` y controles de formato de Biblia **sin tocar Programa al seleccionar**.
4. Reparar flechas de Biblia y limpia-capas por salida; regresiones sobre vídeo/fondo/audio.
5. Completar configuración, transporte, audio y multipantalla progresivamente siguiendo prioridades; ensayos físicos antes de aprobar.

### Prompt de continuidad autocontenido
Continuar JA Proyecciones, repositorio `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`, FreeShow v1.6.7 como motor interno, **interfaz ÚNICA Gemini**. Se eliminó el menú «Herramientas avanzadas (FreeShow clásico)» y se retiró la ruta `MainLayout` de `App.svelte`; la consola no debe regresar nunca a la UI clásica. Configuración JA propia abre desde engrane; operaciones reales actuales limitadas a seleccionar salida de inspección, vista Biblia grid/list, vincular y refrescar bibliotecas. Hay contrato funcional en `CONTRATO_FUNCIONAL_Y_AUDITORIA_UI.md` y plan en `PLAN_IMPLEMENTACION_FUNCIONAL_GEMINI.md`. La Biblia ya se proyectaba en la prueba física de referencia, pero sin Vista previa compuesta, sin flechas y con capas residuales posibles. Seguir P0 inventario DOM + P1 UI/configuración + P2 Biblia completa y PreviewDraft + P3 reproducción audio/video + P4 multipantalla HDMI/Spacedesk/audio aislado + P5 restantes módulos + ensayo. No más funciones cosméticas que aparentan operar. No modificar `main`, `feature/motor-propio-v1`, PR #2 ni `JA_Proyecciones2`, no fusionar. Tras cada cambio revisar CI y pruebas físicas, actualizar docs, emitir prompt nuevo. Meta investidura 5/dic/2026.

## Registro de avance P0 — auditoría de controles compilados
Se añadió `audit-controls.cjs` con prueba `audit-controls.test.cjs`. GitHub Actions lo ejecuta **después** de generar el HTML Gemini real, identifica controles en DOM (incluidos sin ID), clasifica manejadores explícitos frente a deshabilitados/sin verificar y publica `controles.json`, `controles.csv` y `RESUMEN.md`. Los controles creados en runtime tienen inventario declarado aparte. El informe no es un verificador E2E ni asigna estado «funcional» sin prueba; obliga a reconocer deuda. Futuro: complementar con instrumentación E2E de la app, inventario del menú superior y cobertura automática de flujos; falla ya cuando faltan IDs estructurales o reaparece cambio de consola.

## Registro de avance P2 — primera ruta bíblica de Vista previa nativa
Se inició un `prepareGeminiScriptureDraft()` **sin operaciones de salida**, usando `getActiveScripturesContent`, `getScriptureSlidesNew` y `TemplateHelper`, que son los mismos recursos nativos utilizados por el proyector. Se renderiza mediante `Output.svelte` con `outOverride`, sin sustituir `outputs[outputId].out`. El navegador Scripture opera con `geminiPreviewOnly` para no actualizar Programa al seleccionar versículos y expone una navegación privada para flechas; el botón de emitir queda en la consola Gemini.

**No declarar Biblia terminada:** falta editor gráfico integral de plantillas, modo de seguimiento en vivo, guardado/restauración de estilos, limpieza de capas y pruebas HDMI/visual de fidelidad. El gate de Vista previa impide emitir una referencia aún no preparada; la prueba E2E debe confirmar que no se producen dobles actualizaciones ni fugas de audio.

## Control de no regresión de Vista previa vs Programa — fase inicial

**Commit funcional:** `1f82d5438c21dbcfbb768539417c4ac509233d7f`. `Scripture.svelte` ya recibe `geminiPreviewOnly` y desactiva tanto el refresco instantáneo como el refresco diferido de una Biblia en directo mientras se edita su borrador en Gemini. Las flechas van al navegador privado y no a `activeDrawerTab` ni a los atajos globales de la consola anterior. `JaGeminiBiblePreview.svelte` usa `Output.svelte` con `outOverride` y las mismas funciones de construcción de diapositiva/plantilla, sin escribir en `outputs`. El transporte audiovisual se deshabilita mientras la vista privada presenta texto bíblico.

**Riesgos pendientes y puertas de aceptación:** CI de esta rama y posterior ensayo Windows antes de usarlo en culto; comprobar Rut 2:1 y Génesis 1:1–2, que las flechas jamás alteren Programa antes de pulsar Proyectar, que el fondo y tipografía coincidan en vista previa y salida HDMI, que se puedan cambiar las traducciones offline sin error y que no se produzcan capas residuales. La presencia de renderizador nativo no sustituye una prueba visual; el editor de formato, persistencia, navegación en vivo y multipantalla siguen S1/S0 abiertos. El informe automático de botones no marca como operativos los controles no probados.

### Prompt de continuidad posterior a la etapa de vista previa

Continuar JA Proyecciones con FreeShow 1.6.7 y única consola Gemini, repo `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`. Estado implementado: inventario automático de controles compilados (script audit-controls.cjs y artefactos JSON/CSV en Actions), ruta de preparación privada de Biblia con plantilla/renderizador nativo OutOverride y navegación con flechas, guardia geminiPreviewOnly para evitar que editar el versículo o cambiar plantilla altere Programa. Revisar CI del último commit: la compilación tarda y no debe darse por verde mientras esté en curso. NO declarar concluida Biblia ni instalar una compilación antigua: aún quedan editor de tipografía/plantilla/fondos, navegación en vivo deliberada, limpiar solo texto, configuración completa, botones pendientes, aislamiento HDMI/Spacedesk y audio. Validar físicamente la separación de Vista previa y Programa antes de ampliar. No modificar `main`, `feature/motor-propio-v1`, PR #2 ni repo `JA_Proyecciones2`; no fusionar. Documentar cada cambio, pruebas de integración/E2E, entrega de prompt autocontenido. Meta investidura 5/dic/2026.

**Cierre de rutas accidentales del navegador Gemini:** la selección mediante doble clic o los resultados de búsqueda ya no llama a `playScripture()` desde `Scripture.svelte` cuando `geminiPreviewOnly=true`. Se añadió una regresión que revisa estas dos condiciones. Aun así, solo las pruebas físicas demostrarán que no existe otra ruta de emisión involuntaria.

## P1 — Configuración e interfaz: lote de controles generales (2 noviembre 2026)
Se reorganizó `JaGeminiSettings.svelte` como panel único por tareas: General, Pantallas/salidas, Archivos/bibliotecas, Audio/reproducción, Atajos/ayuda. El panel muestra únicamente el estado real de FreeShow; no inventa monitores físicos. General permite conmutar densidad de la UI y restablecer preferencias con confirmación; Reproducción permite habilitar/deshabilitar el inicio automático silenciado de Vista previa. Ambas se conservan entre arranques mediante claves locales de Gemini y no escriben en Programa.

Controles globales conectados a acciones verificables a nivel de código: `btnResetTargets` restablece **solo la selección de salida de trabajo**, no borra ni redirige Programa; `btnPreviewFullscreen` y `btnProgramFullscreen` amplían únicamente los monitores locales de la consola; `btnBridgeClearText` usa `clearSlide(true, selectedId)` únicamente ante una diapositiva bíblica temporal y conserva fondo/audio. `btnMultiScreenMenu` abre la categoría de salidas como diagnóstico, sin pretender detección física. Ctrl+, alterna Configuración. Permanecen deshabilitadas operaciones peligrosas que aún no están conectadas a servicios validados (Negro, Logo, Fundido, envío a todas); **esto sigue siendo deuda S1, no aprobación del módulo**.

**Incidencia registrada para fase multipantalla (S0):** Windows muestra tres monitores (pantalla integrada de laptop, HDMI físico y dispositivo virtual spacedesk del iPad) según evidencia del operador; Gemini solo muestra «Salidas: 1/1» y una tarjeta «Primario». Los nombres de salidas FreeShow no equivalen a detección física; la fase posterior debe distinguir monitores Windows, dispositivos virtuales y asignaciones persistentes, identificar cada pantalla, y verificar HDMI/spacedesk y audio sin afectar al operador. NO abrir nuevos outputs implícitamente en esta fase.

**Interfaz adicional:** `btnAddMultimedia` abre el selector real de carpetas conectado al mecanismo de bibliotecas, y A+ alterna un modo de texto ampliado restringido a la consola del operador (guardado localmente). La salida de Programa y las diapositivas no cambian. Ambos controles mantienen regresiones automáticas. El selector actual vincula **carpetas**, no importa archivos individuales: la importación granular sigue pendiente del módulo Multimedia.

## Regresión física del commit 8c6790e y corrección de interfaz
El operador probó en Windows 9 funciones: **funcionan** abrir Configuración, guardar preferencias, A+, reproducción automática de Vista previa y atajos/cierre. **Fallan** Restablecer, Ampliar vistas, Agregar multimedia y Limpiar texto. No se aprueban por CI verde ni se atribuyen los errores a la Biblia o a múltiples pantallas.

Revisión del código y cambios del siguiente lote:
- **Restablecer** antes únicamente volvía a elegir una salida; con una sola pantalla no había cambio visible. Ahora restablece de forma visible la preparación local (vídeo/imagen/borrador mostrado en Vista previa), detiene solo su media y restaura la selección del operador; no llama a `setOutput`, `clearBackground` ni borra Programa. El botón y su notificación aclaran el ámbito. No elimina archivos de disco ni selecciones bíblicas.
- **Ampliar** dependía de `requestFullscreen()` en un elemento incrustado de Electron; ahora amplía localmente el monitor de Vista previa o de Programa mediante una clase de interfaz reversible, con Esc y botón visible «Cerrar vista ampliada». No altera la ventana de proyección externa.
- **Agregar multimedia** antes abría exclusivamente `OPEN_FOLDER`; ahora ofrece un menú con `Añadir archivos…` y `Vincular carpeta…`. La primera opción usa el selector nativo `OPEN_FILE` + respuesta `OPEN_FILE2`, filtra extensiones reales, evita duplicados, incorpora paths al catálogo junto a carpetas sin copiar contenido, y conserva las rutas seleccionadas de la consola. Cancelar no genera archivos ficticios.
- **Limpiar texto** antes se limitaba a diapositiva temporal con categoryId; ahora limpia la **capa de diapositiva de la salida seleccionada** usando `clearSlide(true, selectedId)`, conservando el fondo/media/audio de la salida. Si la capa no existe informa que no hay nada que limpiar. No elimina texto incrustado como píxeles dentro de un vídeo o imagen, ni convierte otros medios.
- Las cuatro acciones exigen ensayos Windows con el instalador del commit nuevo; las pruebas automatizadas deben comprobar la función y el origen del control, no solo la presencia de cadenas.

**Mantener pendiente S0:** Windows tiene 3 pantallas (laptop, HDMI y spacedesk) pero Gemini refleja una sola salida FreeShow. No cambiar creación/ruteo de salidas durante esta fase. **No modificar lógica de Biblia**; continuar exclusivamente Interfaz/Configuración.

## Incidencias de interfaz reportadas después de e06d233 — lote operacional
**Evidencia física:** vídeo MP4 conserva un versículo bíblico anterior encima; controles QuickPlay/Cortar/Fundido/Negro/Logo confusos o inertes; «Vista previa a todas» y «Programa a todas» deshabilitados; volumen desorienta; etiqueta «Modo: prueba con archivos locales» parece un modo falso. Windows tiene tres monitores, JA solo una salida configurada.

**Nueva regla:** preparar no proyecta. Al publicar multimedia en Programa, `sendToJAOutputs("background",payload,[selectedId],{replaceScripture:true})` retira diapositiva temporal previa **solo en destino** mediante rutina nativa; no borra un fondo ni el audio de otras pantallas. `Cortar` fuerza transición nativa none, `Fundido` permite seleccionar corte/fade/blur/scale/slide sobre el motor nativo, `Quick Play` aplica la transición seleccionada. Con una sola salida configurada se evita afectar estados compartidos de otras salidas. Negro y Logo implementados como capas de efectos reversibles por salida (no sustituyen programa ni detienen audio). Logo inicial usa imagen instalada `./ja-logo.png`; personalización pendiente.

**Sincronización del mismo vídeo:** publicación enlaza Vista previa silenciada al nuevo Programa; después se puede activar/desactivar «Vincular». La reproducción vinculada sigue el reloj y pausa de Programa; pulsar Play/Pausa en la vista vinculada controla Programa. Seleccionar un contenido diferente desvincula la vista para impedir cambios involuntarios. Vista previa nunca es una fuente extra de audio en el modo enlazado. Validar con medios reales y comprobar demoras/latencia en Windows.

**Multipantalla:** todavía S0. Los 3 monitores Windows no están representados por 3 salidas configuradas; **no se activa un envío real a todas** hasta validar la asignación HDMI/spacedesk, audio y estado por salida. Los dos botones deben explicar exactamente qué configuración falta y permitir acceder al panel, pero no confirmar emisiones inexistentes.

**CI no sustituye pruebas físicas:** comprobar que Fundido afecta la salida física, Negro cubre toda la composición, Logo aparece en la posición esperada, no se pierde audio y cambiar a vídeo elimina Biblia; de lo contrario mantener S1 y corregir la causa.

**Controles y semántica:** el rótulo ficticio «Modo: prueba con archivos locales» se sustituyó por el estado informativo «Biblioteca local · Archivos reales» sin desplegable no funcional. La búsqueda de Vista previa vinculada controla el tiempo del mismo vídeo público, pero navegar a otro medio desvincula ambos monitores. Se publican motivos explícitos S0 en controles de «todas las pantallas» deshabilitados; **su funcionalidad real continúa pendiente** por falta de asignación y prueba de tres monitores.

**Causa adicional detectada y corregida:** `connectMediaTypeFilters()` todavía agregaba otro controlador `click` a «Agregar multimedia» que abría la carpeta directamente, incluso cuando el menú moderno intentaba abrirse. Se retiró el controlador heredado para evitar dos cuadros de diálogo simultáneos. Prueba de no regresión añadida. La fase 1 sigue abierta hasta ensayo físico de los controles nuevos y cierre del multipantalla.

## S0 — Regresión de publicación multimedia (evidencia Windows, 2 noviembre 2026)
**Síntoma físico:** desde Vista previa se prepara el contenido, pero Programa permanece negro y aparece «No se confirmó el envío a Programa». La Biblia sí puede publicarse por su ruta propia. El CI anterior estaba verde; esta falla solo se reveló en Windows.

**Causa reproducible en código:** `JaGeminiShell.publishPreparedMedia` cambió una ruta `setOutput("background",...,false,selectedId)` funcional por `sendToJAOutputs`. El nuevo filtro usa `makeJAProjectionRequest/getJADestinations`, que requiere simultáneamente `!!output.screen`, `primaryId` persistido y una salida explícita con rol primary. El dispositivo «Primario» puede existir en FreeShow sin el identificador físico/persistencia requerida; por tanto `valid=[]` y el guard de error rechaza el envío ANTES del motor de reproducción.

**Corrección específica de Fase 1:** recuperar la API nativa `setOutput("background",payload,false,selectedId)` estrictamente cuando hay una sola salida JA configurada, activa y sin lock; no tocar el filtro seguro de múltiples destinos. Retirar primero `temp/tempText` solo de la salida seleccionada y luego lanzar multimedia. Verificar la aparición del background en el store; la confirmación del store NO es una prueba física. Si el motor no actualiza el store, reportar error comprensible.

**Transiciones:** retirar menú de cinco efectos no confirmados. «Quick Play» y «Cortar» usan transición none, «Fundido» usa transición fade nativa (todavía pendiente de validación real). No afirmar que Fundido funciona por un test de strings. Si su prueba física falla, retirar/habilitar solo Corte hasta arreglar el motor.

**Botones a todas:** `Vista previa a todas` se diseñó como preparación privada por destino, pero la implementación actual solo tiene un preview privado local sin buffers individuales por salida. `Programa a todas` requiere asignación de monitores y aislamiento de audio; Windows muestra laptop+HDMI+spacedesk, Gemini únicamente una salida. Ocultar ambos botones en la consola para no ofrecer promesas falsas; su implementación real permanece S0/S1 pendiente, después de la fase de interfaz.

**Criterios físicos de aceptación:** MP4 en Vista previa → Quick Play/Cortar muestra vídeo en Programa; PNG también; Biblia temporal → MP4 retira versículo pero no destruye otros fondos; pausa/seek/volumen/negro no se rompen; Fundido se verifica visualmente; ninguna transmisión involuntaria a otros monitores. No editar la implementación interna de la Biblia ahora.
