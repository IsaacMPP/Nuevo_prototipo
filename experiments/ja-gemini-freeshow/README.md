# Experimento JA Gemini + motor FreeShow (solo rama aislada)

**Objetivo:** usar el DOM y estilos del Gemini original de JA como consola, con
el motor FreeShow 1.6.7 que ya se encuentra en engine/. Sin volver a escribir
el reproductor de salidas ni copiar el mock JS.

**No modifica** main, JA_Proyecciones2 ni feature/motor-propio-v1.
No mezclar ni fusionar con PR #2 sin pruebas de aceptación en Windows.
Código FreeShow conserva su licencia GPL-3.0; no eliminar avisos existentes.

## Etapa implementada
- Gemini sale del HTML aprobado en prototype/index.html; se genera offline con
  npm run build:ui (Tailwind local) y prepare-gemini.cjs. No se ejecutan
  controles, cuatro pantallas, vídeos ni biblias ficticias del mock original.
- En App.svelte solo se reemplaza la consola del operador; la rama output
  mantiene MainOutput y los servicios FreeShow originales.
- Programa usa el componente existente PreviewOutput (captura real cuando está
  disponible y espejo existente como fallback), no un video DOM independiente.
- Biblioteca usa rutas indexadas en el store real media de FreeShow. Vista previa
  decodifica localmente y **no cambia** Programa hasta pulsar Proyectar.
- Proyectar, Play/Pausa, seeking y Mute de Programa se envían a VideoPlayer y
  setOutput nativos. Limpiar fondo afecta Programa, no la vista previa.
- Hay botón "Biblioteca FreeShow" para acceder al gestor original, importar
  carpetas y regresar a Gemini. En esta prueba una sola salida habilitada:
  se bloquea enviar/limpiar con varias salidas para no interferir con audio ajeno.

## Limitaciones explícitas
Sin navegación bíblica, miniaturas, volumen fino, audio por dispositivo, NDI
ni salidas múltiples JA. Los botones de estas funciones quedan deshabilitados.
Esta etapa NO certifica sincronía HDMI, Spacedesk, vídeo GPU ni fidelidad en
todas las resoluciones hasta la prueba física; no es instalador de producción.

## Construir
Desde la raíz:
1. npm ci
2. npm run build:ui
3. node experiments/ja-gemini-freeshow/prepare-gemini.cjs
4. cd engine
5. npm ci
6. npm run build:frontend:prod
7. npm run build:electron:prod

Windows: usar el arranque de desarrollo de engine/ solo después de compilar
su frontend y main. Se entrega CI separado; no ejecutar el workflow oficial.

## Gates siguientes
1. Svelte y Electron compilan; la consola conserva el HTML exacto.
2. En Windows, FreeShow clásico importa carpeta real, Gemini enumera archivos.
3. Vista previa local independiente; Proyectar envia un MP4 a una salida real.
4. Programa muestra la captura/imagen real; pausa, play y seek confirman estado.
5. X borra fondo del Programa sin limpiar Vista previa; audio se detiene.
6. Las salidas adicionales NO se tocan; luego aislar checkAudio y compartir
   fuentes correctamente, antes de habilitar multipantalla.
7. Auditar cierre, audio principal, Spacedesk y permisos; añadir tests de UI
   end-to-end y gate físico, no solo asserts de strings.
