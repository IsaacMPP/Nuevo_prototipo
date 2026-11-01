# B1-01 · Biblia proyectada y motor de transiciones JA
**Fecha:** 2026-11-01 · **Rama:** `feature/motor-propio-v1` · **PR:** #2 borrador · **Versión de código:** 0.6.0.

## Alcance solicitado y decisión de etapa
El usuario detecta sus monitores y confirmó que las flechas cambian el versículo en **Vista previa**, pero no en **Programa**. Solicitó que actúen sobre la proyección y que haya una transición al cambiar versículo, sentando las bases de un motor de transiciones reutilizable. Esto es una **corrección prioritaria B1-01 autorizada expresamente** aunque C1 (Configuración) permanezca con pruebas Windows pendientes: no implica aceptar ni cerrar C1 y no autoriza comenzar T1/Y1/N1/L1 en paralelo.

## Comportamiento definitivo
1. Seleccionar Biblia, libro, capítulo y versículo prepara Vista previa (sin emisión automática). Pulsar **Proyectar** inicia la Biblia en el destino(s) seleccionado(s); si ya tiene la MISMA Biblia, sustituye solo texto y referencia, conservando ventana, fondo y placa.
2. Una vez emitida, **Versículo anterior/siguiente** en pantalla, botones de Biblia y teclado izquierda/derecha siguen actualizando Vista previa **y únicamente destinos seleccionados con esa misma Biblia activa**. Otros destinos con imágenes, música, videos, otras versiones bíblicas o sin salida permanecen intactos. No se crea salida al navegar con flechas.
3. Si está en negro, las flechas actualizan el texto **bajo la cortina** y permanece negra; pulsar **Proyectar** expresamente muestra el nuevo versículo y retira el negro.
4. Si un versículo estaba oculto por Limpiar texto, la siguiente navegación restaura texto y referencia.
5. Al llegar al último versículo del capítulo o libro, flecha siguiente avanza al próximo capítulo/libro, con referencias reales; flecha anterior vuelve al último versículo del capítulo anterior; al principio y final de la Biblia no se avanza.
6. Fundido: se anima **solo texto y referencia**, sin parpadeos de imagen o placa, sin detener el audio de otras salidas. Corte: sustitución inmediata. Duración de Fundido configurable 120–1200 ms (predeterminado 320). La preferencia única se guarda con las demás opciones. En cambios rápidos, una animación anterior se cancela y gana el último cambio solicitado (se serializan las órdenes de navegación).
7. El botón central **Cortar** selecciona el modo inmediato para Biblia; **Fundido** activa Fundido para el contenido bíblico seleccionado. Para medios y video el botón Fundido comunica que falta la etapa L1, **sin pretender que existe un crossfade de video/audio**.
8. Cambio por flecha desde el operador no toca nada cuando no hay una sesión bíblica proyectada del archivo/versión correcto. Para reemplazar una pantalla que muestra un video u otra Biblia debe pulsarse Proyectar explícitamente.
9. Flechas bloqueadas mientras se edita una entrada o se muestra Configuración/diálogo, evitando cambios accidentales en culto.

## Arquitectura implementada
- `desktop/bible-navigation.js`: cálculo puro y compartido de siguiente/anterior, cambio capítulo/libro y límites de inicio/fin. Un solo modelo para los botones/teclado.
- `desktop/session-policy.cjs`: prohíbe avanzar proyectores que no tengan una sesión Biblia activa con el mismo origen; independiza cada `displayId`.
- `desktop/transition-engine.cjs`: contrato reutilizable (`cut`/`fade`, `durationMs`), validación y normalización. `desktop/core.cjs` lo persiste en el mismo `ajustes.json` versionado con respaldo, sin perder carpetas/pantallas/estilos.
- `desktop/transition-runtime.js`: animador reusable de capas DOM, cancelable, política de última petición ganadora; no crea ventanas, no controla audio, no maneja archivos remotos.
- `desktop/main.cjs`: IPC `ja:projection:verse:update` permite envío in-place a cada salida autorizada; `ja:projection:verse` mantiene **Proyectar** explícito; guarda la procedencia de la Biblia en la sesión; genera texto/referencia desde archivo FSB/JSON autorizado, no confía en texto enviado desde renderer. IPC de preferencias `ja:bible:transition:get/save`.
- `desktop/output.js` y `output.html`: recibe `action:"verse"`, conserva fondo/placa/sesión, aplica cut/fade con cancelación. La cortina negra no se apaga por flechas, solo al pulsar Proyectar.
- `desktop/bridge.js` y `settings-center.js`: Vista previa y salidas activas coordinadas por destino; controles de modo/duración en Biblia y en Configuración; notificaciones de sincronía.
- `desktop/preload.cjs`: operaciones IPC específicas, sin acceso Node arbitrario.

## Matriz de aceptación / bloqueo
| ID | Pasos en Windows | Resultado obligatorio |
|---|---|---|
| B1-01 | Conectar operador + HDMI Extender. Abrir Génesis 1:1; **Proyectar** | Texto real de Génesis 1:1 aparece en salida, Vista previa conserva diseño |
| B1-02 | Pulsar derecha/Versículo siguiente | HDMI y Vista previa muestran Génesis 1:2, mismo fondo y sin negro |
| B1-03 | Elegir Fundido 320 ms y repetir hacia adelante/atrás | Cambio de texto y referencia suave, fondo y placa sin parpadear |
| B1-04 | Elegir Corte y repetir | Texto cambia inmediatamente, sin animación |
| B1-05 | Navegar del último versículo de Génesis 1 a Génesis 2:1 y volver | Capítulo, referencia y texto correctos en ambas vistas |
| B1-06 | Seleccionar dos destinos A+B con la misma Biblia; dejar C con video + audio | A y B avanzan; C no cambia, no se silencia ni se detiene |
| B1-07 | Destino A muestra otra versión bíblica o video | Las flechas no reemplazan ese contenido; Proyectar sí puede reemplazar expresamente |
| B1-08 | Pulsar Negro, avanzar flecha, pulsar Proyectar | Permanece negro durante la flecha; Proyectar revela último versículo |
| B1-09 | Limpiar texto, avanzar flecha | Texto vuelve sobre fondo anterior; resto de capas no desaparece |
| B1-10 | Pulsar 10 veces rápido siguiente/anterior | No queda versículo atrasado ni se bloquea; última orden gana |
| B1-11 | Cambiar Fundido a Corte y duración, reiniciar JA | Valores guardados/restaurados; misma preferencia en Configuración |
| B1-12 | Desconectar proyector mientras navega | No envía a operador, muestra ausencia/errores de salida y no modifica otros destinos |
| B1-13 | Abrir Configuración mientras Biblia proyectada; pulsar flechas | No cambia proyección accidentalmente |
| B1-14 | Ejecutar test suite + instalador Windows | 0 fallos; no regresiones de C1, Biblia/Audio/Multi |

## Gate y pendientes
- **CI aprobado** no es igual a prueba física. B1-01 queda `EN DESARROLLO` hasta verificar CI+Windows y cerrar los casos críticos B1-01..14.
- Este cambio **NO implementa** fundido de video, mezcla de audio, cambio de fondo con crossfade, slide/PPT, superposiciones complejas, NDI o YouTube; todos van por etapas L1/T1/N1/Y1.
- Fallas nuevas: registrar pantalla exacta, versión, combinación de botones/versión bíblica, video/fotos de proyección y los mensajes de error; corregir raíz, agregar regresión, volver a compilar y repetir prueba Windows.
- Prohibido tocar `main`, fusionar PR #2, cambiar `JA_Proyecciones2` o reimportar motores FreeShow.
