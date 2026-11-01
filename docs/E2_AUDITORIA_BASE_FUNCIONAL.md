# Auditoría de integración E2-B — JA Proyecciones funcional
**Fecha:** 2026-11-01. **Rama:** `feature/escritorio-prototipo-ja`. **Fuente motor:** FreeShow/JA 1.6.7, copia de `76b6cb371e68f8ce36bcaea0223e4041a1dfd638`.

## Hallazgos comprobados
- `desktop/main.cjs` carga el prototipo HTML y declara `projectionEngineReady:false`; su `package.json` original no empaquetaba `engine/`.
- `engine/src/electron/index.ts` ya mantiene ventanas nativas y canales STARTUP/MAIN/OUTPUT, con el renderer en `engine/src/frontend/App.svelte`: `MainLayout.svelte` para control, `MainOutput.svelte` para salida.
- `engine/src/frontend/components/helpers/output.ts` tiene `setOutput(type,data,toggle,outputId,add)`, `sendToJAOutput` y `sendToJAOutputs`. Los controles existentes en `MediaControls.svelte` y `videoSync.ts` utilizan `outputId`. No crear reproductor alterno.
- Biblia nativa en `components/drawer/bible/Scripture.svelte`, `converters/bible.ts` con `validateLocalFSB`, RV1909 local y formatos XML admitidos.
- Himnario nativo en `components/drawer/hymns/HymnCatalog.svelte`, directorios vinculados y miniaturas en `utils/jaHymnLibrary.ts`. Media/YouTube: `components/drawer/media/Media.svelte` pestaña `online` y reproductores `components/drawer/player`.
- Salidas: `engine/src/electron/output/OutputHelper.ts`, `OutputLifecycle.ts`, NDI sender/worker separado en `engine/src/electron/ndi/`. Las salidas NDI no equivalen a monitores de Windows.
- Almacenamientos nativos previamente apuntaban a `Documentos/FreeShow`, `Documentos/JA Proyecciones 2` y configuración Electron de FreeShow. Se aislaron los dos en `Documentos/JA Proyecciones 2 - Prototipo` y `AppData/JA Nuevo Prototipo Funcional` para no tocar las instalaciones previas.

## Implementado
1. Ruta principal `npm start` inicia `engine/`, conservando `npm run start:legacy` para el HTML experimental.
2. Navegación superior de módulos JA mediante `JAQuickStart.svelte` dentro de `MainLayout`; usa stores del motor para seleccionar `hymns`, `scripture`, `media`, `shows`, `settings`. Seleccionar contenido no equivale a proyectar.
3. Tipo `DrawerTabIds` corregido para incluir `hymns`.
4. `engine/config/building/ja-windows.yml` separado de FreeShow, sin configuración de firma empresarial.
5. CI Windows ejecuta pruebas y compilación nativas y crea un instalador experimental cuando finaliza correctamente.

## No implementado ni verificado
- Recrear toda la nueva consola HTML en Svelte (la barra de módulos es el primer paso).
- Convertir automáticamente los JSON de proyectos/escenarios experimentales al esquema `engine/src/types/Projects.ts`; sus campos y control de cambios no coinciden.
- Medición física HDMI, NDI/OBS, video simultáneo independiente, audio y mute, presentación y overlapped text, interacción YouTube y FSB en PC de usuario. Las pruebas automatizadas no sustituyen esas verificaciones.
- Declarar equivalencia funcional total o estabilidad de producción antes de CI y hardware Windows.

## Próximas pruebas de aceptación
1. Confirmar que `npm run check:engine` y GitHub Actions terminan en verde; atender errores de causa raíz.
2. En Windows, desde la consola seleccionar Himnario, vincular directorio, visualizar miniatura/video y proyectar en principal asignada. Secundaria con otro video nunca interrumpe audio principal.
3. Desde Biblia, comprobar RV1909, importar FSB validado, seleccionar capítulo/versículo, fondos y navegación. Texto bíblico sobre video solo si se habilita.
4. YouTube: pausar y retroceder en panel central, proyección y medidor de audio real. Presentaciones: abrir/editar/proyectar, flechas por pantalla, regreso al panel después de mostrar video.
5. NDI: configurar salida lógica y verificar señal en OBS (no inferir de detección HDMI).
