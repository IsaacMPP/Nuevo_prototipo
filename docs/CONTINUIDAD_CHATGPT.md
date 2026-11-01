# Prompt autocontenido — JA Proyecciones funcional E2-B

Continuamos el proyecto **JA Nuevo Prototipo, ahora primera base funcional**, en el repositorio https://github.com/IsaacMPP/Nuevo_prototipo, rama `feature/escritorio-prototipo-ja`, PR #1 abierto en borrador. **No tocar ni fusionar main**, ni modificar JA_Proyecciones2.

Historia: `prototype/index.html` y `desktop/` eran una simulación Electron v0.1.1 con carpetas y monitores reales. El motor FreeShow/JA 1.6.7 independiente en `engine/` proviene de `76b6cb371e68f8ce36bcaea0223e4041a1dfd638`. Se autorizó dar paso a un sistema funcional, por lo que `npm start` usa ahora el motor Electron/Svelte de `engine/`. `npm run start:legacy` conserva el shell visual.

Modificaciones E2-B:
- `engine/src/frontend/components/ja/JAQuickStart.svelte` montado en `MainLayout.svelte`: botones a Himnario, Biblia, Multimedia, YouTube, Presentaciones y ajustes de pantallas, únicamente cambian los stores de navegación nativa. No ejecutan `setOutput`.
- `engine/src/types/Tabs.ts`: añadida la pestaña hymns al tipo.
- `engine/src/electron/utils/files.ts`, `jaContentFolders.ts`, `data/store.ts`: carpetas bajo `Documentos/JA Proyecciones 2 - Prototipo` y configuración independiente de FreeShow en `AppData/JA Nuevo Prototipo Funcional`. No migrar ni sobrescribir directorios previos.
- `engine/config/building/ja-windows.yml` y workflow Windows: ahora construyen el motor, tests unitarios/Svelte, instalador JA sin firma.
- `package.json`: `npm run setup:engine`, `npm start`, `npm run check:engine`, `npm run pack:win`; modo legado separado.

Debe leerse `docs/E2_AUDITORIA_BASE_FUNCIONAL.md`, `docs/ARQUITECTURA.md` y `docs/PRUEBAS.md`. Verificar si el último workflow funciona; **no afirmar compilación exitosa ni hardware probado si no se confirmó**. Siguiente entrega: corregir fallos CI de raíz, validar carga real de Biblia RV1909/FSB/XML, Himnario y rutas vinculadas, Multimedia, YouTube, presentaciones, salida HDMI con audio principal y auxiliares mudas; probar NDI/OBS. Después migrar componentes visuales del HTML a Svelte de manera progresiva, con proyectos y escenarios compatibles y autoguardado sin emitir al abrir. Evitar una segunda implementación de motores y parches aislados. Al finalizar cualquier cambio, ejecutar pruebas, documentar y generar otro prompt de continuidad.
