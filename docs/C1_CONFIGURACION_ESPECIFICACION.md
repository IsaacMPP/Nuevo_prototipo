# C1 — Especificación de Configuración real, conexiones y salidas JA
**Estado:** DISEÑADO para revisión; no está implementado por este documento. **Primera entrega después de aprobar P0.**
**Objetivo:** reemplazar el modal simple existente por un centro de ajustes verdaderamente operable. Todo control visible debe mostrar el dato real, ejecutar una operación verificable, guardar/restaurar o informar honestamente que depende de una fase posterior. Mantener diseño Gemini JA (azul #071a4c, paneles contenidos, tipografía legible), sin UI duplicada ni modal gigante que bloquee la consola.

## 1. Diseño de interacción
Entrada permanente: botón ⚙ de la barra superior; en "Multipantalla" y barra de destinos, acciones **Configurar pantallas** y **Administrar salidas** abren la misma pantalla con pestaña preseleccionada. Proponer panel Configuración a tamaño de ventana, con encabezado y navegación vertical, contenido con secciones colapsables y pie de estado; operador puede cerrar y volver a la consola sin perder Preview ni pausar una salida.

**Navegación prevista:**
| Pestaña | Qué presenta | Fase que habilita las acciones |
|---|---|---|
| General | idioma, UI, tamaño letra, estado del proyecto, comportamiento inicio, Acerca de | C1 |
| Pantallas y salidas | lista real Windows, operador, asignación principal, auxiliares, identificador, alias, estado, prueba | C1 básico; identificación y gestión avanzada S1 |
| Audio | dispositivos entrada/salida, principal audible, auxiliares mute, volumen, monitoreo operador, prueba de sonido | C1 solo lectura diagnóstica; controles reales A1 |
| Bibliotecas y carpetas | rutas base, carpetas vinculadas por colección, agregar, quitar enlace sin borrar archivo, rescaneo, estado | C1 básico; detección viva/miniaturas H1/M1 |
| Biblia y visual | RV1909/importaciones, ajustes globales, estilos, fondo, placa, recuperar valores | B1; C1 solo enlaza con ajustes ya implementados y verifica persistencia |
| Rendimiento y reproducción | calidad Preview, caché, compatibilidad/decodificación, diagnóstico de dispositivos | M1/R1 después de pruebas |
| Red y NDI | lista de interfaces de red, estado SDK, nombre de emisor, resolución/FPS, receptor de prueba | N1; NO habilitar "Crear salida NDI" sin backend |
| Diagnóstico, datos y soporte | versión, commit, export de diagnóstico con privacidad, backup/restaurar config, pruebas | C1 básico, R1 ampliado |

Solo activar controles cuya operación existe y se prueba; las funciones futuras muestran descripción clara "Disponible en etapa X" sin fingir éxito.

## 2. Pantallas y salidas: modelo explícito
Separar:
- **Monitor físico Windows**: `displayId` efímero, nombre/etiqueta informada, bounds, resolución, escala, primary Windows, conexión y estado Extender/Duplicar cuando sea posible inferirlo con seguridad; no afirmar marca/modelo ausente. Inventario autoactualiza al conectar/desconectar.
- **Salida lógica JA**: `outputId` propio, tipo (`physical` / `ndi` futuro), display asignado, rol (`primary` / `auxiliary`), alias, activa/desactivada, modo visual, grupo opcional, ruta audio, visibilidad y política de inicio. `outputId` no es el número de monitor Windows.
- **Estación operador**: `operatorDisplayId` configurado; jamás destino de proyección.

**Pantallas C1 mínimas (con botón Configurar funcional):**
1. Lista de todos los displays detectados con resolución, etiqueta, pantalla Windows principal/operador/configurada/no asignada; **refrescar** y mensaje si desconectado.
2. Elegir pantalla operador explícitamente; elegir principal JA entre otras, sin forzar que sea la principal Windows.
3. Elegir/activar/desactivar una auxiliar y alias por salida, sin borrar sesión ajena ni crear proyección automática.
4. Guardar + confirmar cambio de operador y principal (en especial si la sesión estaba en vivo); Cancelar = revertir sin cambios.
5. Estado visible "Guardado / No guardado / Error / Dispositivo no disponible"; ajuste vuelve después de reiniciar.
6. Sin monitor externo: asistente explica Windows `Win+P → Extender` y permite cancelar sin efectos; no crea pantallas ficticias ni activa `Enviar a todos`.
7. `Identificar`: S1 permite superponer número temporal en monitor real con cuenta atrás; no hacerlo mediante el mismo overlay de Biblia ni alterando una proyección existente (preferir ventana segura y reversión).
8. Al desconectar principal: mostrar `Desconectado`, preservar preferencia como inactiva, impedir proyectar, ofrecer reasignación manual; no seleccionar otro. Si IDs Windows cambian, detectar ambigüedad y solicitar reconfirmación.

**No equivale:** `screen.getAllDisplays` detecta monitores conectados, no crea salidas NDI ni identifica model commercialmente por sí solo.

## 3. Gestión de audio: conexión y efecto verificable
C1 presenta información real del entorno de audio y enlace al módulo A1. En A1, cada salida controla `audioEnabled`, `mute`, `volume` (0–100), `deviceId` si el backend puede garantizar enrutamiento, `Solo Video / Solo Audio / Video+Audio`, y monitoreo operador por separado. Guardar cambios no debe silenciar otras salidas ni iniciar video; mostrar estado real dispositivo presente/ausente. **No fingir que la reproducción sale por HDMI sólo porque la imagen aparece por HDMI**: Windows puede rutear audio a altavoces predeterminados. Se requiere selección de dispositivo y prueba sonora verificable.

## 4. Carpetas
Mostrar ruta interna `Documentos/JA Proyecciones 2 - Prototipo` (sin modificar el proyecto anterior). `Vincular carpeta` muestra selector Windows, añade enlace a categoría y lista/reconcilia; `Desvincular` quita referencia, **no elimina archivos del usuario**. Mostrar ausencia/desconexión, fecha de última lectura, número de archivos y límite de formatos; no duplicar colecciones Himnario en Multimedia ni viceversa. Índices/caché se guardan aparte del usuario. Explicar que la biblioteca lee carpetas y no copia videos salvo operación explícita.

## 5. Biblia en Configuración
Control común de fuentes/tamaño, color, fondo por imagen real, placa, alineación; un único esquema persistente y el mismo render que el inspector de Biblia. No dos preferencias contradictorias. Soporte de versiones importadas por usuario con mensajes de formato inválido; licencia RV1909 pública integrada, no distribuir RV1960/RV1995/NVI. Cambiar configuración con contenido bíblico en vivo sólo afecta capas bíblicas según alcance elegido, sin modificar audio/video de otras salidas.

## 6. Persistencia e integración de arquitectura (a diseñar antes de escribir código)
- Introducir configuración versionada `configVersion` y migración desde `core.loadSettings` 0.4 preservando `linkedFolders`, `operatorDisplayId`, `mainDisplayId`, `bibleStyle`; escritura atómica + respaldo antes de migrar.
- Solo el proceso principal Electron escribe preferencias tras validación; renderer usa IPC tipado/allowlist. No guardar estado crítico en variables del DOM ni duplicar en otro `localStorage`.
- API de borrador y confirmación: leer `getConfig`, modificar copia, `validate`, `apply`, `persist`, `rollback` en caso de fallos de display/device. Los cambios de audio y pantalla deben activar el motor en forma transaccional o quedar sin aplicar y revertidos. Proteger concurrencia de ajustes con revisión/versión.
- Reconciliación de IDs físicos no estables con etiquetas/posición sólo como ayudas visuales; si hay ambigüedad, pedir confirmación. Alias del usuario se enlaza a `outputId`, no se pierde por cambio de resolución.
- Estado de salud: `connected`, `configured`, `active`, `projecting`, `disconnected`, `error`; no marcar "En vivo" si solo detectó monitor. Logs diagnósticos sin contenido sensible de proyectos del usuario por defecto.
- Cambio de audio/monitores nunca crea nueva sesión ni proyecta automáticamente. A1 valida `deviceId` y aplica ruteo; N1 dispone de adaptador `ndi` propio sin modificar API física.

## 7. Matriz de aceptación C1
| ID | Pasos prácticos | Resultado esperado y evidencia |
|---|---|---|
| C1-01 | Abrir ⚙ con aplicación sin proyector | Ajustes reales; muestra 1 monitor/0 destinos y guía Win+P, sin estado falso de emisión |
| C1-02 | Conectar HDMI en modo Extender y refrescar | Aparecen dos displays con tamaños, IDs y roles correctos |
| C1-03 | Elegir operador + principal, guardar, cerrar y abrir Configuración | Configuración idéntica, guardado real y persistencia |
| C1-04 | Reiniciar JA con mismo hardware | Preferencia se restaura sin proyectar por sí sola |
| C1-05 | Intentar asignar el mismo monitor a operador y proyección | Error claro, no cambia ajustes ni emite señal |
| C1-06 | Cancelar cambios o introducir ajuste no válido | Valores anteriores intactos; UI refleja estado |
| C1-07 | Cambiar principal a dispositivo distinto mientras proyección activa | Confirmación explícita; salida original no cambia sin aprobar; revertir posible |
| C1-08 | Desconectar display configurado y reabrir ajustes | Etiqueta desconectado, principal no se sustituye, botón Proyectar seguro |
| C1-09 | Vincular carpeta real de Himnario y reiniciar | Se conserva ruta y se listan archivos; el original permanece |
| C1-10 | Desvincular carpeta externa | Desaparece del catálogo; archivos externos no se borran |
| C1-11 | Editar tamaño/color/fondo en Configuración y abrir Biblia | Valores coinciden, proyección actualiza cuando corresponda |
| C1-12 | Simular JSON ajustes inválido/migración 0.4 | Aviso, copia de recuperación, no perder carpetas ni libros |
| C1-13 | Configurar audio sin backend A1 terminado | Control deshabilitado y estado informado; no simula un dispositivo seleccionado |
| C1-14 | Repetir regresiones esenciales R01–R07 de plan maestro | No se altera sesión de otra salida ni desaparece Vista previa |

**Cierre C1:** C1-01 a C1-14 aprobadas o explícitamente fuera de alcance por depender de S1/A1 y aceptadas como tales, con informe de Windows; ninguna incidencia S0/S1, sin regresiones de Biblia/Himnario/HDMI. Antes del inicio de S1, exponer matriz de rutas y estados, pruebas en equipos reales y evidencia de persistencia.

## 8. Siguiente unidad implementable (no ejecutar hasta aprobación)
**C1-01 Inventario/configuración central:** auditar IDs/handlers del prototipo, crear UI Configuración real (secciones Pantallas + Bibliotecas + Biblia + Diagnóstico ya soportadas), adaptar `desktop/main.cjs`, `desktop/preload.cjs`, `desktop/core.cjs` sin romper stores, tests para validación/migración/rollback, build Windows y prueba de configuración con 1 monitor. Repetir para C1-02/03 S1 con monitor externo. Otras pestañas avanzadas se conectan después, respetando el mismo diseño y backend.

## 9. Contraejemplos prohibidos
No marcar "HDMI funcionando" por mostrar una tarjeta, ni "NDI conectado" por disponer de menú. No permitir agregar tres pantallas ficticias; no elegir la pantalla Windows principal como principal JA implícita. No reescribir el motor para arreglar CSS. No usar un control sin estado confirmado por backend. No cerrar PR, no fusionar main ni borrar `engine/` histórico.
