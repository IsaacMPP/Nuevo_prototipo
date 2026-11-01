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


## Entrega experimental Windows validada por CI (2026-11-01)
- Último commit de código/paquete: 1b31bd4c5f5c231f87b3a2d43065030b6ddfb93a.
- GitHub Actions https://github.com/IsaacMPP/Nuevo_prototipo/actions/runs/41363147336 : SUCCESS.
- Pruebas básicas de puente/diseño: 3/3. Compilación Svelte y TypeScript Electron: SUCCESS.
- Dependencias nativas, RV1909, servidores FreeShow, postBuild e instalador NSIS x64: SUCCESS.
- Artefacto Windows verificado: https://github.com/IsaacMPP/Nuevo_prototipo/actions/runs/41363147336/artifacts/13106352015
- ZIP de 137012942 bytes; nombre JA-Gemini-FreeShow-Experimental-Windows.
- appId experimental distinto al de JA2; hacer respaldo de datos y usar otra carpeta de instalación. Aislamiento de ajustes no probado.
- ACEPTACIÓN FÍSICA WINDOWS/HDMI/SPACEDESK PENDIENTE. CI verde no valida audio ni controles funcionales.
- No se modificaron main, feature/motor-propio-v1 ni JA_Proyecciones2.

### Continuidad para nuevo chat
Continuar JA Gemini + FreeShow en IsaacMPP/Nuevo_prototipo, rama experiment/gemini-freeshow.
Último código empacado 1b31bd4, workflow 41363147336 SUCCESS, 3/3 pruebas, artifact 13106352015.
La rama oficial feature/motor-propio-v1, versión 0.6.1 y PR #2 draft permanecen intactos.
Objetivo inmediato: probar físicamente en Windows el diseño Gemini versus HTML aprobado,
importar carpeta vía FreeShow clásico, preparar MP4, enviar a una sola salida, Play/Pausa,
seek, mute y limpiar Programa preservando Vista previa. Registrar resultados/reproducir
incidencias, corregir raíz y repetir CI. Multipantalla, audio por dispositivo, Biblia,
Himnario JA y miniaturas aún no aceptados. No fusionar ni tocar main/JA_Proyecciones2.
Entregar prompt autocontenido después de cada cambio.
