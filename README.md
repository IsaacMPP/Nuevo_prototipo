# JA Proyecciones — primera versión del motor propio (Windows)

**Objetivo:** utilizar una consola de proyección real, ligera y autónoma, sin el motor FreeShow ni sus dependencias nativas. Esta rama inicia desde la última versión funcional del shell (a9790c27), conserva el prototipo HTML original y crea el motor propio en `desktop/`. No se modifica `main`, la rama FreeShow ni `JA_Proyecciones2`.

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

La aplicación conserva por separado las carpetas, recursos y proyectos experimentales en `Documentos/JA Proyecciones 2 - Prototipo`. Las carpetas externas vinculadas se leen sin mover ni modificar los archivos originales.

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
