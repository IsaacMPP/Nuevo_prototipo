# JA Proyecciones — Plan maestro de desarrollo modular
**Versión documental:** P0.1 · **Fecha:** 2026-11-01 · **Estado:** planificación; no constituye aprobación de módulo ni implementación.
**Repositorio:** `IsaacMPP/Nuevo_prototipo` · **Rama experimental:** `feature/motor-propio-v1` · **PR:** #2, borrador. Base de referencia de partida: v0.4.0, HEAD `ce16f59d57563ee1dfd1de4dacb632f01b60e153`, Windows Actions `41342172359` (23/23 tests aprobados, NSIS generado). **Pruebas físicas HDMI/audio y aceptación de usuario pendientes.**

## 0. Misión y principios
Sistema de proyección para Iglesia Adventista del Séptimo Día, operable por voluntarios no técnicos. Conservar la interfaz Gemini aprobada de JA y su flujo Vista previa → Programa → Enviar a. Motor audiovisual y enrutamiento propios: **no copiar ni ejecutar motores FreeShow/OBS**. Usar estándares/APIs/bibliotecas externas con licencias evaluadas; la carpeta histórica `engine/` queda de referencia y nunca se empaqueta ni enlaza con el motor nuevo.

**Regla de producto:** ningún módulo se considera funcional porque aparece, compila o tiene tests unitarios. Para declararlo cerrado hace falta comportamiento real, pruebas integradas y evidencia en el hardware que aplique. No activar UI ficticia, medidores simulados ni prometer formatos no soportados.

**Estado de módulos:** `NO INICIADO`, `AUDITADO`, `DISEÑADO`, `EN DESARROLLO`, `CI APROBADO`, `WINDOWS PENDIENTE`, `INCIDENCIA ABIERTA`, `ACEPTADO`. El CI verde no equivale a `ACEPTADO`. Registrar owner, versión/commit, pasos de reproducción, captura o video y resultados.

## 1. Orden obligatorio: una etapa activa por vez
| Orden | Código | Etapa y entregable bloqueante | Requisito para aprobar |
|---|---|---|---|
| 0 | P0 | Requisitos, inventario, contratos, pruebas y trazabilidad | Documento revisado y alcance aprobado; versión 0.4 congelada como referencia |
| 1 | C1 | **Configuración real:** navegación, persistencia, validación, diagnóstico, pantalla y salidas | Cambios guardan/restauran, alteran motor real y notifican errores; prueba Windows |
| 2 | S1 | Monitores físicos, identificación, salida principal, auxiliares, grupos explícitos, hotplug | Dos pantallas extendidas sin enviarse nunca a operador ni cambiar destinos silenciosamente |
| 3 | A1 | Motor de audio y video: controles de cada salida, dispositivo, mute, loop, seek, modos video/audio | Dos videos distintos y mismo archivo en dos salidas sin interrupción ni fuga de audio |
| 4 | B1 | Biblia: formatos admitidos, carpetas, búsqueda, flechas por pantalla, estilos/fondos/capas | Versículos correctos, cambios instantáneos y persistentes, sin overlays residuales |
| 5 | H1 | Himnario y Cantos Juveniles: colecciones independientes, búsqueda, miniaturas/cache, hot-folder | Biblioteca real grande sin duplicados, reproducción y proyección estable |
| 6 | M1 | Multimedia y Fondos: imágenes, video, audio, formatos/códecs, librería externa, modos A/V | Archivos reales, controles completos, cambios de contenido sin regresiones |
| 7 | L1 | Capas y composición: texto opcional, fondo, negro, logo, fundido/corte | Cada capa se limpia/recupera independientemente; no cambia otra salida |
| 8 | T1 | Presentaciones: crear/editar/guardar diapositivas, navegar y proyectar; PDF/PPT según capacidad | Abrir y editar; flechas y Enviar a... por salida; retorno desde video sin panel roto |
| 9 | Y1 | YouTube: reproductor mediante APIs permitidas, preview, transporte y estado | Play/pause/seek/silencio reales; compatibilidad con términos/API; no controles ficticios |
| 10 | N1 | NDI como destino lógico opcional: SDK, configuración de emisor y receptor de prueba | Se recibe señal en OBS/receptor NDI; no bloquea HDMI ni audio principal |
| 11 | P1 | Proyectos, escenarios, listas, autoguardado, recuperación, modos de servicio | Carga/guardado sin proyección automática, recuperación consistente y backup |
| 12 | R1 | Hardening, rendimiento, instalador, versión, diagnósticos y manual | Ensayo de culto completo, criterio de aceptación firmado por operador |

**Dependencias:** C1 → S1 → A1 es la columna vertebral. Las pantallas/audio se validan antes de declarar B1/H1/M1 estables aunque ya haya código parcial de esos módulos. Un fallo bloqueante congela el avance; sólo se pueden ejecutar auditorías o correcciones de la misma etapa.

## 2. Contratos centrales no negociables
1. **Inventario de dispositivos:** diferenciar monitor Windows, proyector físico elegible, salida lógica JA, salida NDI, dispositivo de audio y monitor operador. Mostrar solo datos reales que la API informe; no inventar modelo comercial. El contador de monitores Windows nunca es el contador de proyectores configurados.
2. **Destino principal:** selección explícita del operador; la pantalla principal de Windows NO equivale al proyector principal JA. Sin principal válido, mostrar asistente **Elegir/Identificar/Guardar/Cancelar**, no bloquear sin ayuda ni enviar a un destino arbitrario.
3. **Envío:** clic normal sólo principal JA; `Enviar a...` selecciona 1 o N destinos. No enviar a todos sin confirmación. Control por `outputId`, validación final en backend; nunca fallback a otro output si desaparece.
4. **Independencia:** video, audio, estado, posición, mute, fondo, capas y selección pertenecen a cada sesión de salida. Seleccionar nueva música/video en Aux2 no debe detener ni silenciar Principal. Reproducir mismo archivo en dos salidas no comparte transporte accidentalmente.
5. **Política de audio:** principal audible por defecto y auxiliares mudos por defecto; se podrá elegir dispositivo y modos `Video + Audio / Solo Video / Solo Audio`, con controles reales, no una mera casilla. Vista previa silenciada por defecto; monitoreo de operador voluntario y explícito.
6. **Capas:** enviar versículo/diapositiva/video reemplaza o superpone exclusivamente como se configure; `Limpiar texto` no borra fondo ni detiene sonido; `Limpiar todo` sí lo retira en destinos seleccionados. `Negro` reversible.
7. **Persistencia:** ajustes validados por esquema/version, escritura atómica, copia previa/migraciones, recuperación de ajuste dañado, sin borrar archivos de usuario ni cambiar preferencias de otras salidas; no autoproyección al restaurar.
8. **Conectividad:** HDMI/DP con Windows en modo Extender para contenidos independientes; Duplicar Windows no crea superficies independientes. NDI se configura como salida virtual separada (nombre, resolución, FPS, estado y diagnóstico) y no figura como un monitor HDMI.
9. **Diseño:** conservar la interfaz aprobada; una sola representación/estado del contenido entre Vista previa/Programa/panel Multipantalla. No duplicar buscadores ni reproductores para simular funcionamiento. Acciones sin motor: inhabilitadas y claramente pendientes.
10. **Seguridad y licencias:** rutas validadas, API IPC autorizada, contenido remoto aislado, no copiar contenido licenciado de biblias, no empaquetar FreeShow, revisar NDI/FFmpeg/API de YouTube y formatos antes de publicar.

## 3. Protocolo repetible para cada entrega
**A. Especificación:** requisito verificable, mapa de archivos/dependencias, diagrama de datos, UI aprobado, riesgos y reversión; enumerar lo que NO entra. **B. Desarrollo:** solo área de la etapa, cambios pequeños, tests al agregar capacidades, sin crear rutas duplicadas. **C. Pruebas de CI:** lint/sintaxis, tipos, unitarias, integración, contrato IPC, tests de regresión de módulos previos y build Windows NSIS reproducible. **D. Pruebas físicas:** checklist Windows con videos reales, capturas de Configuración y salidas, audio/monitor/dispositivo probados, registro de equipo y versión; si faltan dispositivos, el paso queda **WINDOWS PENDIENTE**. **E. Cierre:** incidencias bloqueantes = cero, resultados de smoke tests guardados, rollback probado y aprobación explícita del usuario para iniciar etapa siguiente.

**Severidades:** S0 pérdida de datos/proyección sobre operador/audio inesperado; S1 contenido incorrecto, salida cruzada, controles no responden; S2 degradación visual/performance significativa; S3 cosmético. S0/S1 bloquean etapa, S2 se corrige antes de cerrar si afecta flujo real; S3 puede diferirse sólo con registro y aceptación expresa.

**Por cada error:** identificador y versión → pasos para reproducir → resultado esperado/real → logs, captura, sistema y salida involucrada → análisis raíz → corrección estructural → test de regresión → CI → Windows → cierre. Prohibido marcar `resuelto` porque no se pudo reproducir. No eliminar tests, deshabilitar módulos o generar parches sin contrato.

## 4. Batería de regresión global (repetir tras cada módulo)
- R01: portátil/PC con una sola pantalla: jamás enviar sobre operador; asistente explica conectar/salir.
- R02: operador + proyector extendido: elegir/identificar principal; guardar, reiniciar, conservarlo.
- R03: operador + dos proyectores: A reproduce MP4 con audio; enviar otro a B sin pausar/silenciar A.
- R04: dos salidas con MISMO archivo: pausa/seek de B NO modifica A.
- R05: seleccionar grupo A+B expresamente: operaciones grupales solo a miembros; C intacta.
- R06: desconectar B durante reproducción: no fallback ni cierre inesperado de A, estado visible e información recuperable.
- R07: pasar Biblia→video→presentación→Biblia: sin texto/fondo/capa residual o audio ajeno.
- R08: cambiar fuente/tamaño/fondo de Biblia en vivo: Vista previa y destino coinciden; reiniciar mantiene estilo.
- R09: control central de audio/video y controles de salida: pause/play/restart/seek/mute/volumen actúan en la salida elegida.
- R10: abrir carpeta con cientos de himnos, copiar/renombrar/borrar archivo: catálogo actualiza y no duplica en Multimedia.
- R11: archivo no compatible, ruta caída, fondo/biblia corruptos: mensajes explícitos, datos existentes intactos.
- R12: recuperar proyecto/ajustes tras fallo de app: no autoproyección, no borrar bibliotecas, backup recuperable.
- R13: NDI no instalado/red caída: HDMI sigue funcionando; NDI se informa como no disponible.
- R14: instancia aislada de YouTube y retorno al control de video/diapositivas: no perder controles del centro.
- R15: prueba prolongada (criterio y duración se acuerdan por capacidad de equipo) sin fugas, bloqueos ni desviación de sincronía audible.

## 5. Entorno mínimo de aceptación
Windows 10/11 x64 compatible; operador con un monitor y al menos 1 monitor extendido para S1; idealmente 2 proyectores extendidos para probar independencia A1/M1. Probar con GPU dedicada y equipo medio/bajo cuando sea posible. Juegos de prueba sin derechos: RV1909 pública verificada, 1 imagen estática, 1 MP4 H.264/AAC con sonido identificable, 2 videos diferentes, 1 archivo repetido en 2 salidas, 1 música MP3/WAV, 1 archivo incompatible, carpetas con Unicode/tildes y archivos corruptos. Guardar resultados, no incluir videos protegidos en el repositorio.

## 6. Matriz de decisiones y excepciones
Ningún módulo nuevo antes de cierre de la etapa activa. Si una función avanzada necesita diferirse, debe constar como `FUERA DE ALCANCE` con razón y aceptación del usuario, nunca como `COMPLETA`. Mantener PR #2 **draft**, no fusionar, no tocar `main` ni el repositorio histórico `JA_Proyecciones2`. Prompts autocontenidos de continuidad tras cada entrega.

## 7. Siguiente trabajo concreto
**Iniciar C1-00: auditar la pantalla Configuración actual y generar su contrato de datos/UX y pruebas.** Implementar únicamente tras aprobación de este plan y del alcance de Configuración. Las pantallas/equipos físicos no pueden validarse desde CI; preparar checklist para ensayo conjunto. La definición funcional detallada de C1 está en `docs/C1_CONFIGURACION_ESPECIFICACION.md`, el inventario comparado en `docs/INVENTARIO_FUNCIONES_JA.md`.
