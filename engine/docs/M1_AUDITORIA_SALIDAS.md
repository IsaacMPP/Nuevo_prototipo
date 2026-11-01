# M1-01 — Auditoría de salidas, reproducción e identificación
Fecha: 27-oct-2026. Base JA Proyecciones 2 (FreeShow). Estado: auditoría técnica inicial; código de enrutamiento aún sin modificar.

## Contrato
- Pantalla de laptop/CPU = operador, excluida del recuento de proyectores JA.
- Con exactamente una salida física asignada para proyección, conservar el flujo simple actual.
- Controles avanzados solamente si existen >=2 salidas de proyección **disponibles y asignadas** (no simplemente >=2 monitores Windows ni outputs lógicos).
- Destino principal seleccionado explícitamente, clic normal solo a principal; salidas auxiliares por envío explícito, normalmente mudas.
- Grupos deliberados, controles/temporizadores por salida, prónter separado y sincronización discreta/temporal según contenido.

## Hallazgos confirmados de FreeShow
1. src/frontend/components/helpers/output.ts (setOutput): `setOutput(type,data,toggle,outputId,add)` ya acepta `outputId` explícito. Si se omite, usa bindings o todas las salidas activas (`getActiveOutputs`). No reemplazar globalmente todos los llamados; inventariar orígenes y preservar bindings legítimos.
2. **Bloqueante para independencia:** `checkAudio(type,data,allOutputIds,outs)` se llama desde setOutput, pero en background detiene/inicia medios usando `allOutputIds` incluso cuando se pasó `outputId`. En slides hace lo mismo con VideoPlayer.start/stop. Corregir contrato audiovisual en prueba aislada antes de activar distribución independiente; no cambiar únicamente capa visual.
3. `src/frontend/components/output/tools/MediaControls.svelte` ya recibe `outputId` y llama VideoPlayer.play/pause/toggleMute/loop por destino; `videoSync(path,outputId)` tiene key por archivo+salida. Verificar reproductores cuando mismo archivo se usa en dos salidas.
4. `src/frontend/components/output/preview/MultiOutputs.svelte` ya genera previews de salidas habilitadas; su condición actual incluye salidas no físicas y stageOutput. Una consola avanzada nueva no puede activarse con ese conteo.
5. `src/frontend/components/settings/Screens.svelte` ya usa GET_DISPLAYS para ID, resolución y posición; asigna screen/bounds y tiene IDENTIFY_SCREENS. El monitor principal Windows no equivale a proyector principal JA; nombres comerciales solo si Windows los informa.
6. `src/types/Output.ts` distingue enabled, active, screen, bounds y stageOutput. Falta contrastar asignación física y presencia real para no contar una salida NDI, virtual o de escenario como proyector conectado.
7. FreeShow ya tiene salida de escenario, temporizadores y flujo de presentación; inspeccionar notas reales disponibles en importación PowerPoint antes de prometer vista del presentador completa.

## Decisión arquitectónica para la siguiente entrega
M1-02 implementará **inventario de proyección no invasivo** (salidas elegibles + monitores visibles + identificación), y elección explícita de principal con estado persistente. La UI de modos avanzados queda OCULTA con <2 proyectores elegibles. Sin modificar setOutput global en M1-02.
M1-03 iniciará por corregir enrutamiento de medios audiovisuales de manera atómica (imagen + audio por outputId) y conservar reproducción antigua con un proyector. Luego proporcionar botón contextual Enviar a… y grupos.
M1-04 probará tiempo/pausa/loop/mute por salida, pantalla principal audible y secundarias mudas. M1-05 reutilizará MultiOutputs/MediaControls para consola de transporte y stage/temporizadores de prónter.
Riesgos: pantalla física espejada Windows no ofrece superficies independientes; requerir escritorio extendido para dos contenidos diferentes. Dispositivos inalámbricos/virtuales pueden devolver identificadores genéricos o cambios de ID tras reconexión.

## Pruebas de aceptación previas a activar envío
A. Laptop+un proyector: clic normal y audio sin cambios, sin control avanzado.
B. Laptop+dos proyectores extendidos: uno principal, otro auxiliar; video distinto por salida, sin detener audio ni alterar principal al cambiar auxiliar.
C. Dos salidas reproducen el **mismo** video: pausar una no pausa otra, salvo modo grupo sincronizado.
D. Tres proyectores: Principal+Aux1 reciben misma presentación sincronizada; Aux2 conserva logo animado sin audio. Caso inverso: principal cantos, Aux1 prónter programa/temporizador privado, Aux2 logo.
E. Hotplug: desconectar proyector no cambia destino automáticamente ni habilita consola indebidamente.
F. Evaluación en Windows real y bajo rendimiento. CI exitosa es requisito pero no prueba de hardware.

No tocar main ni fusionar PR #2 sin permiso.
