# JA Proyecciones — primera base funcional Windows

Este repositorio tiene **dos interfaces**: el HTML de referencia en `prototype/index.html` (con shell en `desktop/`) y, como ejecución principal desde esta etapa, el **motor real FreeShow/JA 1.6.7** en `engine/` con su renderer Svelte, ventanas físicas y reproductores originales. La nueva banda de accesos JA usa los stores reales del motor.

## Ejecutar en Windows
Requiere Node.js 22, npm, Python 3.12, Visual Studio 2022 con **Desarrollo de escritorio con C++**, e internet al instalar dependencias nativas. La compilación automatizada utiliza Windows Server 2022 porque node-gyp 11 no reconoce correctamente VS 2026.

```powershell
git clone https://github.com/IsaacMPP/Nuevo_prototipo.git
cd Nuevo_prototipo
git checkout feature/escritorio-prototipo-ja
npm run setup:engine
npm start
```

La consola ejecuta **Himnario Adventista, Cantos Juveniles, Biblia RV1909, importación FSB/XML, Multimedia, YouTube, editor de presentaciones, vista previa/Programa y salidas del motor**. Accesos rápidos superiores llevan a los módulos existentes; no proyectan solo por abrirlos.

Himnario: colocar videos en `Documentos/JA Proyecciones 2 - Prototipo/Himnario Adventista` y usar la pestaña Himnario; puede vincular otras carpetas en su navegación. Biblia: entrar a la pestaña Biblia, seleccionar RV1909 o importar un FSB/XML propio, escoger libro/capítulo/versículo y usar las acciones nativas de salida. Multimedia y YouTube se manejan en sus pestañas originales; las pantallas se configuran en Ajustes > Pantallas. El ordenador del operador y las salidas de proyección no son equivalentes.

**Aislamiento:** los archivos nativos se almacenan bajo `Documentos/JA Proyecciones 2 - Prototipo`; la configuración de Electron se almacena en `AppData/JA Nuevo Prototipo Funcional`. No se sobrescriben los datos ni la instalación de `JA_Proyecciones2`, ni se usa `Documentos/FreeShow`. Las biblias con copyright solo se importan desde archivos autorizados del usuario.

## Pruebas y empaquetado

```powershell
npm run check:engine
npm run pack:win
```

El flujo `pack:win` genera RV1909, prueba el motor, compila Svelte y prepara el icono JA antes de empaquetar. El workflow `.github/workflows/windows-desktop.yml` instala, prueba y compila el engine en Windows 2022; si finaliza exitosamente adjunta un instalador **JA-Proyecciones-Funcional-Windows** sin firma. Se conserva `npm run start:legacy` para examinar el HTML, `npm run check:legacy` para las pruebas del shell. Para estas últimas debe instalarse también npm en la raíz.

## Alcance de esta entrega
- Está conectado el inicio principal al motor real y existe navegación rápida a funciones nativas. No hay un segundo motor audiovisual.
- La copia íntegra del HTML original **todavía no ha sido rediseñada totalmente en componentes Svelte**. Ese traslado visual sigue pendiente: el motor y los módulos funcionan a través de la interfaz nativa JA.
- CI/código no sustituyen las pruebas físicas de HDMI, dos pantallas, NDI, volumen independiente, YouTube, Biblia y cambios entre video/presentación.
- Los escenarios JSON del shell se conservan pero todavía no se han convertido al esquema de proyectos del engine; no importarlos automáticamente ni proyectar al abrir.

## Protección del proyecto
Repositorio exclusivo: `IsaacMPP/Nuevo_prototipo`. Rama: `feature/escritorio-prototipo-ja`. PR #1 borrador. No modificar ni fusionar main ni tocar `JA_Proyecciones2`. Conservar GPL-3.0 y atribuciones del motor. Consultar `docs/ARQUITECTURA.md`, `docs/PRUEBAS.md`, `docs/E2_AUDITORIA_BASE_FUNCIONAL.md` y `docs/CONTINUIDAD_CHATGPT.md`.

## Incidente de compilación 2026-11-01
Los primeros workflows de E2-B fallaron al ejecutar `npm install --prefix engine`: `grandiose` (NDI) llamó a `node-gyp@11.5.0`, que no reconoció Visual Studio 2026 (18.x). Es un problema del compilador nativo, no del contenido de Himnario/Biblia. Se fijó Windows 2022, Python 3.12 y se comprobó el compilador C++ con vswhere. La nueva ruta genera además la RV1909 validada (66 libros) y el arte del instalador. **Hasta que el workflow actualizado termine en verde, no hay instalador funcional confirmado ni pruebas de pantalla/audio realizadas.**
