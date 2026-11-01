# Matriz de pruebas / criterios de aceptación

| ID | Prueba | Criterio |
|---|---|---|
| S01 | Arranque de aplicación | Abre ventana Electron sin habilitar Node en renderer |
| S02 | HTML visual | Se conserva interfaz original; no botones eliminados |
| S03 | Sin internet | La UI base carga estilos locales; YouTube muestra estado de conexión |
| L01 | Primer arranque | Se crean las carpetas de Prototipo en Documentos |
| L02 | Carpeta externa | Vinculación persistente sin mover archivos de origen |
| L03 | Archivos agregados | Reindexación del catálogo y filtros por módulo |
| L04 | Carpeta desconectada | No se eliminan enlaces ni metadatos |
| P01 | Crear proyecto | JSON escrito atómicamente y editable |
| P02 | Autoguardado | Datos quedan tras cerrar y reabrir |
| P03 | Escenarios | Cambiar preparación NO altera contenido al aire |
| D01 | 1 monitor | Pantalla de control protegida |
| D02 | HDMI extendido | Detecta dispositivo adicional |
| D03 | Desconectar/reconectar | No reasigna automáticamente a otro destino |
| D04 | Windows duplicado | No promete salidas independientes |
| B01 | Importar FSB real | Validación, persistencia y selección correctas |
| B02 | Fondo bíblico | Cambios de color/imagen visibles en pantalla correcta |
| B03 | Flechas | Avanza solo el grupo/control actual, sin captar caret de inputs |
| A01 | Audio principal | Cambios en secundarias no cortan ni duplican audio |
| Y01 | YouTube | Pausa/reanudar/seek reales en panel central |
| N01 | NDI | Emite a OBS receptor autorizado; salida lógica separada |
| G01 | CI Windows | Compila, tests OK y genera instalador si está configurado |

Los casos B*, A*, Y*, N* se dejan **pendientes hasta que el motor nativo esté integrado**. CI no sustituye pruebas físicas.

## Diagnóstico CI — 2026-11-01
- El shell existente mantiene 7/7 pruebas exitosas.
- Error reproducido en workflow nuevo: `grandiose@1.0.0 install` -> `node-gyp rebuild` -> VS 2026 (18.x) no reconocida por node-gyp 11.5.0.
- Remedio en rama: runner `windows-2022`, Python 3.12, comprobación del compilador C++ y npm ci reproducible para engine. Validación `vswhere`: superada.
- Necesario generar Biblia RV1909 durante build (asset `public/ja-bibles/rv1909.fsb` no está en git) y las imágenes JA para NSIS.
- No dar por aprobados el build Svelte, instalador ni HDMI/NDI/audio sin resultado verificable.
