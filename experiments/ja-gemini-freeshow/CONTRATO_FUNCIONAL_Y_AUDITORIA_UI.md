# JA Proyecciones — contrato funcional de operación y auditoría integral Gemini/FreeShow

**Estado:** propuesta de arquitectura y aceptación basada en prueba física del operador y revisión de código. **Fecha:** 2026-11-01. **Rama exclusiva:** `experiment/gemini-freeshow`. **Objetivo:** versión operativa para investidura del 5 de diciembre de 2026; no implica que esté implementado ni aprobado físicamente.

## Problema raíz y decisión de método
La interfaz Gemini aprobada está ensamblada sobre FreeShow 1.6.7, pero numerosos controles no tienen funciones reales. Un CI verde no valida operación. No repetir reparaciones de un botón por conversación. Antes de integrar más funciones, levantar inventario exhaustivo de cada botón/menú/atajo/selector visible, vincularlo a su caso de uso, pruebas y responsable de estado. Las funciones que aparecen operativas no pueden ejecutar un aviso «pendiente» ni quedar sin respuesta. Solo exponer como habilitadas las verificadas. Una funcionalidad crítica aún pendiente bloquea la aceptación de la entrega, incluso si está deshabilitada correctamente.

## Regla 1 — separación firme de Vista previa y Programa
- **Vista previa** = área privada donde el operador prepara el *siguiente* contenido: Biblia, vídeo, imagen, himno, diapositiva, fondo, audio. Debe reproducir/renderizar el **resultado compuesto final** (texto, fondo, formato, capas y proporción de la salida elegida), no solo el archivo de entrada.
- **Programa** = estado realmente enviado a la salida física seleccionada. Muestra una representación fiable de esa salida. No se modifica por seleccionar o editar elementos en Vista previa.
- «Proyectar», «Cortar» o transición explícita toma una copia preparada, la aplica únicamente a los destinos autorizados y confirma resultado real. Si falla la validación, Programa permanece intacto. Nunca sustituir una salida a mitad de una carga incompleta.
- Modelo conceptual separado: `PreviewDraft` (tipo, contenido, referencia, estilo, capas, fondo, destino, estado de reproducción) y `ProgramState[outputId]` (instantánea emitida por motor FreeShow). Estado activo y pendiente no son el mismo objeto mutable. No crear otro motor de proyección ni reproductores Programa DOM independientes; reutilizar FreeShow.
- Cambiar de pestaña o navegar la biblioteca no altera Programa ni pierde sin aviso la preparación. Estado preparado puede volver a cargarse, duplicarse, restablecerse o guardarse.
- Sonido de Vista previa silenciado por defecto y ruta de escucha local opcional; **nunca** duplicar/interrumpir el sonido público. Seek/pausa/volumen de Vista previa independientes de Programa. Programa usa la sesión nativa y destino explícito.

## Regla 2 — Biblia completa (no solo lista de versículos)
1. Al elegir traducción, libro, capítulo y versículo, **preparar** en Vista previa y mostrar el texto renderizado con su fondo/estilo reales. La selección por sí sola nunca emite a Programa.
2. Editor del próximo versículo: fuente, tamaño, color, alineación, márgenes/área segura, fondo, plantilla, número de versículos/bloque; cambios reactivos visibles en Vista previa, sin afectar Programa.
3. «Proyectar» publica exactamente lo preparado en la salida seleccionada. Después, el estilo seleccionado persiste al avanzar/retroceder versículos y cambiar capítulo; configuraciones de sesión editables y persistentes cuando se guardan.
4. **Modo Preparación** predeterminado: flechas izquierda/derecha cambian solo el versículo en Vista previa. **Modo Seguimiento en vivo**, activable explícitamente: flechas avanzan/retroceden el versículo de la salida de Programa seleccionada, preservando estilo y fondo. Mostrar visualmente el modo y destino. No activar navegación accidental mientras se escribe o hay selector/modal.
5. Alt/Shift/Ctrl y teclas con foco en campos, elementos editables, selectores y sliders respetan su acción nativa. El controlador Gemini debe ser propietario de sus atajos y delegar al motor; no depender de que la pestaña de FreeShow clásico siga activa.
6. «Limpiar texto» borra únicamente la capa bíblica/plantilla de texto en destino seleccionado, sin eliminar fondos o interrumpir audio de otras salidas. «Limpiar Programa» completo debe ser otra acción claramente distinguible.
7. **Política de fondo**: por defecto una Biblia nueva reemplaza o limpia el medio anterior de esa salida y aplica el fondo de la plantilla; modo «superponer sobre Programa» debe ser opt-in explícito. Cambiar de Biblia a vídeo limpia el texto residual según transición seleccionada. Nunca dejar overlays anteriores sin autorización.
8. Compatibilidad Biblia RV1909 offline; traducciones modernas solo si autorizadas. No confundir Biblia Dios Habla Hoy mostrada en una captura con RV1909. Pruebas: Rut 2:1, Génesis 1:1 y 1:2, ambas vistas, cambios rápidos, cambio a vídeo/fondo, limpieza, persistencia y salida real.

## Regla 3 — contenido audiovisual y presentaciones
- Seleccionar un archivo/himno/diapositiva prepara su contenido en Vista previa; reproducir, pausar, desplazar y detener son locales a Vista previa hasta emitir.
- Publicar a Programa desde el mismo contrato (contenido preparado + destino + transición). Tras publicar, avanzar elementos en vivo solo mediante modo/acción explícita.
- Miniaturas, listas, sesiones temporales y proyectos reflejan archivos reales y caché persistente; no mostrar datos ficticios. Presentaciones, YouTube, Himnario y fondos no deben quedar detrás de botones que aparentan funcionar.
- Respetar controles por salida, elección HDMI, volumen del principal e imagen secundaria sin audio. No habilitar «todas las pantallas» hasta certificar la independencia de audio, reproducción, limpieza y transiciones.

## Regla 4 — semántica de cada acción
- **Quick Play**: iniciar/publicar rápidamente contenido preparado con comportamiento y destino claros.
- **Cortar**: sustituir Programa inmediatamente con el contenido de Vista previa (sin fundido), confirmando salida.
- **Fundido**: transición temporizada real, con duración configurable y sin corte de audio ajeno.
- **Negro**: ocultar temporalmente la imagen en destino seleccionado de forma reversible; no borrar medios/proyectos.
- **Logo**: mostrar/superponer logotipo elegido, con control de encendido/apagado y salida seleccionada.
- **Restablecer**: indicar y confirmar el ámbito (restablecer solo borrador/estilo de Vista previa, o salida/configuración). Nunca borrar Programa silenciosamente.
- **Configuración**: abrir panel operativo Gemini para salidas, audio, Biblia, bibliotecas, transiciones y preferencias; persistir y reflejar cambios. Acceso a FreeShow clásico es respaldo temporal, no sustituto permanente.
- **Vista previa a todas/Programa a todas**: semántica inequívoca y seguridad multipantalla. Deshabilitar de forma visible durante fase de aislamiento, sin afirmar que está resuelto.
- **Estado/guardado**: «Guardado» solo con confirmación real, y «Cambios pendientes» solo si existen modificaciones sin persistir. Errores informan causa/contexto y no dicen éxito antes de confirmación del motor.

## Hallazgos comprobados en fuente (no son hipótesis)
Archivo principal: `engine/src/frontend/components/ja/JaGeminiShell.svelte` en commit `8ab9d708`.
- `prepare(path)` renderiza video/audio/imagen local en `previewCanvasContent`; no hay una ruta de preparación bíblica equivalente. La acción bíblica llama a `playScripture()` desde el botón y manda al motor: **Biblia sin Vista previa integrada**.
- `Scripture.svelte` condiciona flechas a `activePage === "show" && activeDrawerTab === "scripture"`; la navegación Gemini `showModule("biblia")` no activa esas pestañas: **atajos no integrados correctamente**.
- `btnOpenSettingsModal`, `btnProjectSelectedVerse`, `btnProgramToAll`, `btnPreviewToAll`, `btnBridgeFade` se deshabilitan explícitamente en `onMount`. También `Restablecer`, `Logo`, `Negro`, `Fundido` por texto, y `btnBridgeBlack`/`btnBridgeClearText` dentro de `removeInertGeminiControls`.
- `btnBridgeQuickPlay` y `btnBridgeCut` ejecutan ambos la misma función `project`, sin la diferencia semántica prometida.
- `btnProjectDropdown`, `btnOpenDiagModal`, `btnLargeTextToggle`, selector de orden y partes de las vistas de biblioteca permanecen bloqueados. YouTube, Presentaciones, Fondos y Listas de la barra lateral se generan deshabilitados.
- `clearProgram()` opera únicamente sobre el fondo; no equivale a «limpiar texto». El seguimiento bíblico no debe confundirse con limpiar el programa o borrar una imagen.
- La captura física del 1/nov muestra versículo sobre una imagen navideña existente: **se debe verificar la política de capas y limpieza**, sin atribuir causa definitiva solo por una captura.
Esta es una **auditoría inicial de ruta de control conocida**; NO se ha demostrado todavía cobertura exhaustiva del DOM generado ni de todos los menús y atajos.

## Obligatorio antes del siguiente lote de funciones
1. Generar **inventario automático post-build del DOM Gemini real**: todo elemento interactivo con id/texto, función esperada, evento enlazado, estado habilitado, módulo, condición de activación, prueba y estado (funcional / bloqueado / error / no auditado). Contar y clasificar el 100 %, incluso iconos, menú superior, botones contextuales y configuraciones. La ausencia de handler o placeholder debe fallar el gate.
2. Separar arquitectura y ownership de `PreviewDraft`, `ProgramState`, `BibleComposer`, `OutputRouter`, `TransportController`, `KeyboardRouter`, `SettingsController`. Definir contratos de entrada/salida y pruebas de contaminación cruzada.
3. Implementar y validar por **flujos completos**, no por botones individuales: (A) Biblia preparar/estilizar/proyectar/navegar/limpiar; (B) vídeos/imágenes/himnos y transporte; (C) configuración, reset y estados; (D) pantallas/audio; (E) presentaciones y demás módulos priorizados. Reutilizar motor FreeShow; conservar diseño Gemini.
4. Pruebas CI: unitarias, integración con stores/motor, E2E de DOM/botones, escenarios de no-regresión y pruebas de regresión de cambios de modo, escape/foco, texto residual. No aceptar solo tests de strings o compilación.
5. **Gate físico** Windows con proyector HDMI y audio real: una salida, luego dos salidas aisladas; mantener vista previa sin perturbar Programa; medir interacción, navegación, transiciones, fallos de carga y recuperación. Ensayo de culto completo de 45–60 minutos antes de 5/dic.

## Prioridades y prohibiciones
- **S0:** corte/duplicación de audio en salidas, congelamiento/cierre, envío al destino incorrecto, pérdida de Programa, interferencia multipantalla.
- **S1:** Biblia sin previsualización, navegación bíblica fallida, controles visibles esenciales inertes, configuración inaccesible, texto residual, acciones aparentemente exitosas sin efecto.
- **S2:** ajustes visuales y comodidad que no impiden el culto.
- **No modificar** `main`, `feature/motor-propio-v1`, PR #2, ni `JA_Proyecciones2`; preservar identidad Gemini y licencias FreeShow. Esta especificación **no implementa** ninguna función: requiere aprobación y posterior entrega con pruebas. El workflow CI puede ejecutarse pero la validación física permanece siempre obligatoria.

### Prompt autocontenido de continuidad
Continuar JA Proyecciones Gemini + FreeShow 1.6.7 en `IsaacMPP/Nuevo_prototipo`, rama `experiment/gemini-freeshow`. Se documentó el contrato funcional de Vista previa (borrador privado editable) y Programa (salida real independiente), navegación bíblica en modo preparación vs seguimiento en vivo, persistencia de plantilla/fondo, limpieza de capas y semántica de controles. Fuente auditada: `JaGeminiShell.svelte` solo prepara multimedia, envía Biblia directamente a Programa, varias acciones críticas están deshabilitadas, y flechas dependen de estado de pestaña FreeShow clásico. No continuar arreglando botón por botón: generar inventario automático y E2E de todos los controles reales tras build, después integrar y validar flujos completos priorizando Biblia y salidas. Corrección ReferenceError del commit `8ab9d708` sí permitió proyectar Biblia según prueba física del operador, pero Vista previa y flechas siguen fallando; texto residual posible. Mantener `main`, `feature/motor-propio-v1`, PR #2 y repo `JA_Proyecciones2` intactos. No escribir lógica de producción ni dar módulos por terminados sin aprobación y pruebas físicas; actualizar docs y nuevo prompt después de cada cambio. Meta: investidura 5/dic/2026.
