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
