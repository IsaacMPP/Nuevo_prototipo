# Arquitectura maestra — Nuevo_prototipo

## Propósito y límites
Experimento independiente, sin escribir ni fusionar en IsaacMPP/JA_Proyecciones2. El archivo `prototype/index.html` es la propuesta original de Gemini, conservada intacta, con cuatro salidas y contenido simulados. **No confundir esa simulación con proyección real.**

## Decisión arquitectónica
- Interfaz: mantener distribución visual JA: consola Vista previa / Programa / multipantalla, módulos Biblia, Himnario, Multimedia, YouTube, Presentaciones, Fondos y Listas. Una interfaz; NO crear modos separados «Culto Joven» y «Culto Divino».
- Shell de escritorio: Electron con nodeIntegration=false, contextIsolation=true y preload explícito; ninguna función de archivos disponible en páginas remotas.
- Motor de proyección definitivo: reutilizar FreeShow 1.6.7 con las mejoras verificadas de JA_Proyecciones2; no recrear decodificadores, controladores YouTube, escenas, proyección, audio ni sincronización con el HTML. El adaptador de UI debe invocar los contratos nativos y conservar regresiones probadas.
- El prototipo puede correr independientemente como **shell experimental**, pero hasta completar el puente FreeShow la proyección real, NDI y controles AV no están integrados. El shell puede probar descubrimiento de monitores, biblioteca, proyectos y acciones de archivos.
- Persistencia aislada: Documentos/JA Proyecciones 2 - Prototipo (nunca sobreescribir la biblioteca del programa existente). Permitir vincular carpetas antiguas como fuentes externas sin modificarlas.
- Detección: Windows/Electron screen API; distinguir escritorio del operador, monitores físicos, salidas lógicas FreeShow, stage y NDI. Detección automatizada, primer enlace explícito y persistente. No inventar 4 pantallas ni IDs estables.
- NDI: es salida lógica y no monitor de Windows. Alta manual y posterior registro como destino; recepción no equivale a emisión.
- Seguridad: archivos externos vinculados solo lectura, no abrir enlaces file:// arbitrarios, sin Node en renderer, validar IPC, bloquear navegación externa no autorizada.
- Perfiles de usuarios no son proyectos ni escenas. Proyectos guardan contenido de un servicio, escenarios composiciones, perfiles de espacio de trabajo disposición; autoguardado con escritura atómica e historial/recovery. Abrir proyecto o escenario jamás proyecta automáticamente.
- Audio predeterminado: Principal JA audible, secundarias mudas. Un monitor puede no tener dispositivo de audio. Probar pausa, reproducción y cambios en auxiliares sin alterar principal.

## Contratos de integración FreeShow
1. Inventariar versiones y archivos nativos; no copiar a ciegas desde otro proyecto.
2. Preservar `setOutput(..., outputId)`, `MediaControls`, `videoSync`, grupos, `PreviewOutput`, `GET_DISPLAYS`, `IDENTIFY_SCREENS`, fuentes Biblia `src/frontend/converters/bible.ts`, lector `Scripture.svelte`, `TemplateEditor`, carpetas JA y rutas de audio.
3. Desarrollar `OutputRegistry`, `RoutingController`, `PlaybackSessions`, `AudioPolicy` adaptadores con pruebas de contratos; nunca reproducir una orden mediante el DOM del HTML de demostración.
4. YouTube debe mantener controles reales del reproductor FreeShow, no simular duraciones/medidores. Cuidar condiciones de servicio.
5. Biblia: RV1909 local; importar FSB validado y formatos XML nativos; conservación de fondos y placas, edición visual en vivo, flechas respetando foco y salida/grupo seleccionado. Otras versiones solo importación legal por usuario.

## Entregas
E0: preservar HTML, documentación y repo independiente.
E1: shell Electron, carpetas aisladas, vínculo de carpetas, catálogo de archivos, proyectos, inventario real de monitores, CI de Windows. **Esta entrega NO equivale a motor de proyección.**
E2: copiar o incorporar motor FreeShow/JA con licencia, dependencias y pruebas; no sustituir librerías conocidas por implementaciones de demostración.
E3: adaptador vista previa/Programa, rutas con principal y secundarios, controles reales, videos y audio; validar física en Windows.
E4: integrar Biblia, Himnario, Multimedia, YouTube, Presentaciones, Fondos, Listas, escenas y autosave.
E5: salida NDI, grupos, diagnóstico y pruebas de culto.
E6: estabilidad, empaquetado e instalador; aceptación física.

## Fuente anterior (solo lectura)
https://github.com/IsaacMPP/JA_Proyecciones2
Rama consultada: feature/base-freeshow-diseno-ja
PR #2 en borrador. Este repo es independiente y NO altera ni hace merge del anterior.
