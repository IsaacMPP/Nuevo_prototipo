# Prompt de continuidad — JA Proyecciones motor propio v0.3

Continuemos **JA Nuevo Prototipo**. Repositorio https://github.com/IsaacMPP/Nuevo_prototipo, rama nueva `feature/motor-propio-v1`. Esta rama empezó del último prototipo previo a la integración, commit `a9790c27c1b5876fd4b185c20ccd72a5ee25b603`. **No tocar `main`, no fusionar ningún PR sin autorización, no modificar `JA_Proyecciones2`; el PR #1 de FreeShow sigue borrador.**

El usuario autorizó construir una base real con motor propio, sin reutilizar código FreeShow: conservar diseño JA unificado, bibliotecas, Biblia y proyección Windows lo antes posible. `engine/` permanece histórico (GPL-3.0) pero el nuevo arranque, pruebas e instalador NO lo ejecutan ni incluyen.

Implementación nueva bajo `desktop/`:
- `console.html` / `console.js`: consola operativa JA azul, secciones Himnario Adventista, Cantos Juveniles, Biblia, Multimedia, Vista previa local, Programa, destinos y controles.
- `main.cjs` / `preload.cjs`: IPC seguro, detección de monitores, configuración independiente operador/principal, envío explícito a pantalla física. Cada monitor externo puede tener su ventana de salida y sesión.
- `output.html`, `output.js`, `output-preload.cjs`: emisión nativa multimedia/versículos fullscreen con pausa, play, restart, black, clear; auxiliar mute por defecto.
- `bible.cjs`: FSB JSON/JSON con validación y límite, importación sin sobrescribir; `scripts/prepare-rv1909.py` genera RV1909 oficial dominio público con SHA-256 aprobado para incrustarla en instalador; admite biblias aportadas por usuario.
- `projection-policy.cjs`: valida destino distinto al operador, formatos soportados (MP4/WebM, MP3/WAV/OGG/M4A, JPG/PNG/WebP/GIF), comandos.
- `tests/native-projection.test.cjs` + `tests/core.test.cjs`: cobertura de seguridad y bibliotecas.
- `package.json`: v0.3, `npm start` arranca el escritorio propio, `npm run prepare:bible`, `npm run check`, `npm run pack:win`. Workflow Windows para la nueva rama sin `npm --prefix engine`.

**Tarea inmediata:** consultar último run del CI de `feature/motor-propio-v1`, revisar logs de fallos reales, corregirlos sin parches ni ocultar pruebas, generar instalador Windows descargable, ensayar en PC con proyector HDMI extendido y realizar verificación funcional de Himnario/RV1909. Revisar la documentación `docs/MOTOR_PROPIO_V1.md` y `README.md`. No afirmar compatibilidad MKV/AVI, XML, NDI, YouTube o presentaciones nativas todavía: quedan para fases posteriores. No afirmar que funciona en hardware real sin prueba del usuario.

Después de cada cambio: pruebas CI, revisión de regresiones y nuevo prompt autocontenido.