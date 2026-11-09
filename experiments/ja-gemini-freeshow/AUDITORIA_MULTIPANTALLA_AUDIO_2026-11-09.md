# Auditoría S0 — Multipantalla y audio · JA Proyecciones
Fecha: 2026-11-09
Rama inspeccionada: `experiment/gemini-freeshow`
HEAD: `105f03b0779f2e0926fab311c26d068e784211e8`
Alcance: inspección estática del código, revisión de integración y CI. **No hubo prueba física** con HDMI/Spacedesk/audio en esta auditoría.

## Resumen ejecutivo
La última compilación (#42054966185) pasó CI, pero el fallo de audio principal reportado físicamente no se considera resuelto. Conectar una pantalla nueva puede cambiar el estado de outputs y su ruta acústica. El problema debe tratarse como incidente S0. La auditoría no modifica el motor ni la rama main.

## Hallazgos
### A1 [S0, confirmado en código] La asignación puede reutilizar una misma salida lógica para dos monitores
En `JaGeminiShell.svelte` `reconcileWindowsDisplays` (aprox. 2035-2096), se busca el output a reutilizar usando perfiles, coincidencia por `screen` o primera salida sin `screen`. No se lleva un Set de outputIds reclamados **en la misma pasada**. Si hay perfiles obsoletos o cambios de IDs, una asignación anterior puede ser sobrescrita por otro monitor. Sí existe una salvaguarda parcial si el output ya apunta a otra pantalla *conectada*. Recomendación: planificar asignaciones en un mapa exclusivo, validar 1:1 y aplicar en una transacción; jamás reasignar la principal silenciosamente.

### A2 [S0, confirmado en código] Identidad de monitor demasiado ligada a ID temporal de Windows
`fingerprint(d)=String(d.id)+"|"+label` (aprox. línea 125), con perfiles persistentes `screenProfiles`. Un cambio de ID después de reconectar puede invalidar la coincidencia, generar nueva salida o elegir otra. Recomendación: reconciliador con identidad estable cuando Electron la suministre, y recuperación explícita por modelo/resolución/posición sin adivinar ante ambigüedad.

### A3 [S0, confirmado en código] Audio depende de ID de principal guardado y de estado de ruteo
`syncJAPrimaryAudioRoute` (aprox. 870-874) lee `localStorage["ja-main-projector"]` y devuelve false si no está entre salidas elegibles; su resultado no siempre se comprueba ni se muestra al operador. `setJAPrimaryAudioRouting` filtra `output_win_sub_*` del bus `main` y añade el principal; `VideoPlayer.isOutputMuted` silencia todo output que no coincida con ese ID. Esto evita audio secundario, pero un ID guardado que no corresponda al reproductor realmente activo puede dejar la principal muda. La corrección `105f03b` reintenta el ruteo después de reconciliar pantallas, pero aún no hay confirmación física de señal audible. Recomendación: mantener el ID efectivo validado y exponer diagnóstico de source=>main=>speaker_default, pista activa, mute y volumen; registrar fallos de ruteo.

### A4 [S0, riesgo] La reconexión puede activar una salida y limpiar contenido
En `reconcileWindowsDisplays` (aprox. 2081-2095) `toggleOutputs` se invoca al detectar pantalla nueva; en ciertos casos `clearBackground`, `clearSlide` y eliminación de efectos se ejecutan para evitar fotogramas viejos. Sin prueba de aislamiento física, estas operaciones pueden ser sorpresivas si la identidad se emparejó mal. Recomendación: no ejecutar acciones destructivas hasta confirmar rol/identidad y destino, y probar retorno de principal frente a provisional.

### A5 [S1, confirmado en código] Falla temporal de enumeración marca todas las pantallas como ausentes
En `refreshDisplaySafety`, el `catch` pone `knownExternalDisplayIds=new Set()`, lo que puede hacer desaparecer momentáneamente controles de envío al recibir un error de consulta sin que haya desconexión física. Recomendación: conservar último estado confirmado y mostrar "detección degradada" hasta verificación de ausencia real.

### A6 [S1, cobertura insuficiente] Pruebas basadas parcialmente en búsqueda de cadenas
`experiments/ja-gemini-freeshow/integration.test.cjs` tiene pruebas de principales, audio y Spacedesk, pero varias validan presencia textual de funciones y no simulan eventos reales de 2-3 monitores ni demuestran salida de audio al altavoz. Las pruebas físicas son obligatorias según `CONTRATO_FUNCIONAL_Y_AUDITORIA_UI.md`.

## Orden propuesto de reparación
1. Extraer una función pura `planDisplayReconciliation` que reciba monitores, outputs, perfiles y principal; no producir side effects y garantizar unicidad 1:1.
2. Pruebas de mesa: conectar segundo monitor, desconectar principal, cambiar ID/resolución, reconectar habitual, desconexión fugaz/timeout, Spacedesk virtual; verificar ningún output duplicado, principal estable, secundarias silenciosas, sin cambio de Programa ajeno.
3. Telemetría y UI diagnóstica del audio: principal esperado/real, enlaces `output_win_sub_... -> main -> speaker_default`, sesiones y nivel; nunca prometer "audio OK" por configuración si no existe señal.
4. Reconciliar audio *después* de aplicar el plan validado y confirmar que el bus del principal exista; si falla, notificación sin alterar Programa.
5. Integración Svelte/Electron + CI, luego validación Windows: 1 monitor HDMI con audio, segundo con video distinto, Spacedesk, desenchufar/reconectar, repetir reproducción/seek/pausa y ocultar pantallas durante 45-60 minutos.

## Criterios de aceptación
- Exactamente una pantalla principal entre las físicas conectadas, sin asignación 2:1.
- Consola laptop no se convierte en salida de Programa.
- Audio de video exclusivamente de la principal; las secundarias no generan sonido ni cortan el de la principal.
- Conectar/ocultar/desconectar una secundaria no pausa, silencia ni reemplaza Programa de la principal.
- Al perder la principal, el failover se comunica; al regresar, no hay traslado silencioso de contenido.
- Fallo de enumeración no destruye configuraciones válidas ni limpia contenido.
- CI + pruebas físicas con resultados explícitos. **Compilar no basta**.

## Estado
Auditoría estática completada; correcciones de arquitectura y validación física pendientes. Ningún cambio operativo de motor aplicado en este documento.
