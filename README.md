# JA Proyecciones — motor propio + diseño original Gemini (Windows)

**Objetivo:** utilizar una consola de proyección real, ligera y autónoma, sin el motor FreeShow ni sus dependencias nativas. Esta rama inicia desde la última versión funcional del shell (a9790c27), conserva el prototipo HTML original y crea el motor propio en `desktop/`. No se modifica `main`, la rama FreeShow ni `JA_Proyecciones2`.

## Plan formal de entregas y calidad (P0 — 2026-11-01)

Antes de ampliar el motor, se ha definido una ruta de desarrollo con **una sola etapa activa**, revisión de fallos bloqueantes, tests de regresión y aceptación real en Windows:

- [Plan maestro: etapas, contratos y pruebas](docs/PLAN_MAESTRO_DESARROLLO.md)
- [Inventario de funciones del proyecto anterior y motor propio](docs/INVENTARIO_FUNCIONES_JA.md)
- [Especificación C1: Configuración, conexiones, pantallas, audio y bibliotecas](docs/C1_CONFIGURACION_ESPECIFICACION.md)

**Estado:** P0 documentado; siguiente C1 Centro de Configuración, pendiente de aprobación de alcance. Documentación no habilita ninguna función nueva ni implica validación de hardware. Para el software vigente, la última versión comprobada de código sigue siendo 0.4.0, CI Windows 41342172359 (23 tests aprobados; test físico pendiente).

## Restauración del diseño Gemini (v0.3.1)
La pantalla principal ahora usa **exactamente el HTML de estructura original** de `prototype/index.html`: encabezado JA, Vista previa ámbar, puente de controles, Programa verde, Multipantalla y panel inferior con Biblia cuadriculada, Himnario, Multimedia, etc. No se utiliza `desktop/console.html` para iniciar.

`scripts/build-ui.cjs` conserva su HTML/CSS y **elimina el controlador inline de demostración** que inventaba pantallas (4/4), videos y citas. `desktop/bridge.js` conecta el diseño visible al motor real `main.cjs`/IPC. Los botones inacabados se señalan como pendientes y no simulan resultados. El contador muestra monitores detectados y el Programa representa su estado real; no promete una captura de cada fotograma en vivo.

**Para esta fase:** funcionan en código la navegación y cuadrícula real de libros/capítulos/versículos de biblias FSB/JSON compatibles, importación bíblica, vinculación/búsqueda de carpetas Himnario/Cantos/Multimedia, vista previa y envío a monitor físico externo. En ausencia de archivos, la UI muestra tarjetas vacías con instrucciones (no videos inventados). Las fuentes externas Google pueden variar sin red; hay tipografías de respaldo.

**Limitación vigente:** transiciones Fundido, logo como superposición, limpiar solo texto manteniendo fondo, proyectos activos, YouTube, NDI, PowerPoint y captura de imagen de Programa siguen sin motor. Controles no disponibles están deshabilitados. Las pruebas automatizadas validan la estructura, no reemplazan el ensayo físico HDMI/video/audio en Windows.

## Instalar y probar
En Windows, con Node.js 22 o 24 instalado:

```powershell
git clone -b feature/motor-propio-v1 https://github.com/IsaacMPP/Nuevo_prototipo.git
cd Nuevo_prototipo
npm install
npm start
```

**Biblia RV1909:** el instalador construido en CI la trae incluida cuando se supera la validación criptográfica del archivo público oficial. En desarrollo, para instalar la RV1909 localmente ejecutar `npm run prepare:bible` con Python 3.12+ y conexión. También se pueden importar biblias en formato **FSB (JSON) o JSON** desde la aplicación. Por ahora no se admite XML ni todos los formatos FSB específicos de terceros; esos archivos deben validarse o convertirse mediante un importador posterior. No se incluyen RV1960/RV1995/NVI por derechos de autor.

## Uso básico
1. Conectar un monitor/proyector adicional con el escritorio Windows en **modo Extender**.
2. En **Pantallas**, elegir el monitor del operador y la **salida principal**, guardar. La consola impide usar el monitor del operador como destino.
3. Seleccionar **Himnario Adventista**, vincular una carpeta con videos compatibles y elegir un archivo. La vista previa local aparece en la consola; presionar **Enviar a proyección** para iniciar la salida física.
4. En **Biblia**, elegir RV1909 o **Importar FSB/JSON**, seleccionar libro, capítulo y versículo; después enviar a proyección. Se puede avanzar/retroceder por versículos.
5. Usar los controles de Programa: reproducir, pausar, reiniciar, negro, limpiar.

La interfaz reconstruye los paneles originales aprobados (no la consola básica anterior). La aplicación conserva por separado las carpetas, recursos y proyectos experimentales en `Documentos/JA Proyecciones 2 - Prototipo`. Las carpetas externas vinculadas se leen sin mover ni modificar los archivos originales.

## Cobertura de la primera versión
- **Implementado en código:** detección real de monitores, destino explícito, ventanas Electron fullscreen para emitir imágenes/video/audio/versículos, sesiones independientes por salida, principal con audio y auxiliares silenciadas por defecto, Vista previa del operador, Biblia FSB/JSON con importación validada, carpetas vinculadas, controles de reproducción y borrado.
- **Sin garantía aún:** pruebas físicas con proyector/audio específico, pantalla Programa con imagen en vivo sincronizada (muestra estado), rendimiento con múltiples videos y compatibilidad con todas las variantes H.264/HEVC/MKV/AVI.
- **Pendiente para posteriores fases:** NDI, XML/OSIS/Zefania, fondos personalizables para versículos, transiciones, YouTube, importación PowerPoint/PDF, adaptador de proyectos/escenarios y autoguardado con restauración.

Los archivos MP4 requieren codecs soportados por Chromium, habitualmente H.264/AAC; AVI/MKV/MOV pueden aparecer en las carpetas pero se marcan **requiere conversión** y no se envían al motor actual.

## Instalador
El workflow de GitHub Actions para esta rama instala solo dependencias del escritorio propio, valida los 66 libros de RV1909, ejecuta pruebas nativas y genera el instalador no firmado **JA-Proyecciones-Motor-Propio-Windows**.

<Link omitted in Markdown; buscar el artifact en https://github.com/IsaacMPP/Nuevo_prototipo/actions >

```powershell
npm run check
npm run pack:win
```

`npm run pack:win` presupone que `npm run prepare:bible` se ejecutó si se requiere la Biblia integrada; GitHub Actions ejecuta automáticamente su preparación. No afirmar éxito del instalador hasta que CI esté verde y se ensaye con Windows real.

## Alcance legal
Se conservó `engine/` (copia anterior de FreeShow GPL-3.0) como referencia histórica aislada. **No se instala, ejecuta ni empaqueta desde esta rama.** No borrar ni cambiar sus licencias. El motor nuevo de `desktop/` no importa código FreeShow; se debe revisar la distribución/licencia del repositorio completo antes de publicar una versión comercial.

Ver `docs/MOTOR_PROPIO_V1.md` y `docs/CONTINUIDAD_CHATGPT.md`. PR #1 anterior sigue borrador; esta versión lleva su propia rama y PR borrador.


## Novedades operativas 0.4.0
El botón **Fondo / Opciones** de Biblia ahora permite modificar y guardar tamaño, fuente, colores, alineación, placa y fondo. **Vincular fondos** permite seleccionar carpetas externas y elegir imágenes reales JPG/PNG/WebP. `Fondos` también tiene biblioteca independiente para preparar/proyectar imágenes y video.
La pestaña **Vista Cuadrícula** ya no deja texto oscuro sobre el fondo oscuro cuando está inactiva; los números y los libros tienen colores legibles. **Limpiar texto** conserva la escena bíblica de fondo.
Para multimedia MP4/WebM, MP3/WAV/OGG/M4A, la Vista previa dispone de transporte y Programa tiene volumen independiente por salida real. Los videos deben usar codecs compatibles con Chromium (MP4 H.264/AAC recomendado); AVI/MKV aún no compatibles. Los archivos se leen desde las carpetas vinculadas reales, no son ejemplos precargados.
**Importante:** si Windows detecta solo un monitor (como en la captura del usuario), el programa no proyectará sobre el monitor del operador. Para la salida real conectar una segunda pantalla en modo Extender, abrir ⚙️ Pantallas y asignar operador/principal. Las pruebas de compilación no sustituyen pruebas físicas de GPU, HDMI, códecs y audio.


## Biblia en vivo y transiciones reales — v0.6.0
El sistema conserva la interfaz aprobada, pero las flechas de Biblia **pueden cambiar el versículo en las salidas reales seleccionadas** cuando ya muestran la misma versión bíblica. No se crea una proyección ni se altera un video si sólo estás preparando contenido en Vista previa. Los cambios cruzan capítulos/libros y respetan la independencia de cada monitor.

Desde la barra de Biblia o **Configuración → Biblia**, selecciona **Fundido** (120–1200 ms) o **Corte**; la preferencia se guarda con los demás ajustes. El fundido animará únicamente letras y referencia, conservando fondo y placa; otras funciones del motor audiovisual siguen por etapas. **Negro** permite seguir preparando cambios bajo la cortina, y **Proyectar** vuelve a mostrar el versículo. Las flechas no actúan mientras Configuración o un diálogo están abiertos.

Consulta [plan de aceptación y pruebas B1](docs/B1_BIBLIA_PROYECCION_TRANSICIONES.md). CI y pruebas Windows con dos pantallas deben completarse antes de declarar B1 aceptado. El fundido general de video/imágenes no está habilitado todavía; continuará en la etapa L1.
