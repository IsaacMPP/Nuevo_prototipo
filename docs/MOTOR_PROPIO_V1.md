# Motor propio JA v0.3 — arquitectura, aceptación y límites
Fecha: 2026-11-01. Base: `a9790c27`, rama `feature/motor-propio-v1`. El PR #1 de FreeShow continúa sin cambios.

## Decisión
Arranque aislado: `package.json > main: desktop/main.cjs` abre `desktop/console.html` y los contenidos de proyección `desktop/output.html`, no `engine/`. La consola gráfica retoma la línea azul JA y divide operador (Vista previa) / salidas (Programa). El HTML anterior sigue en `prototype/index.html` como referencia de diseño, sin integrarse en el renderer nuevo para evitar estados de demostración.

### Contratos principales
- `desktop/core.cjs`: carpetas por módulo y vinculadas, acceso a archivos autorizado mediante realpath y lista blanca; proyectos JSON del shell anterior.
- `desktop/bible.cjs`: FSB JSON/JSON, límite 25 MB, estructura tipada libro-capítulo-versículo, importación sin sobrescribir originales, caché acotada.
- `desktop/projection-policy.cjs`: selección de monitor externo, rechazo del operador, whitelist de comandos, formatos multimedia.
- `desktop/main.cjs`: único registro Electron IPC, creación/reutilización de ventanas por ID físico; sesiones `Map<displayId, data>`, rutas seguras, propagación de estado; destrucción de sesiones cuando desaparece un monitor.
- `desktop/output-preload.cjs` + `output.js`: renderer de salida aislado, solo escucha instrucciones de `ja:output:render` y comunica estado; sin acceso libre a Node.
- `desktop/console.js`: selección de bibliotecas, vistas previas locales silenciadas, composición de referencias, botón explícito de emisión y controles.

### Reglas de seguridad
Nunca auto-proyectar al abrir proyecto, archivo o conectar monitor. No permitir el monitor del operador como destino; no reasignar automáticamente si desaparece. No permitir nombres/rutas introducidas por páginas web; navegar solo archivos locales permitidos. Para Biblia texto seguro con `textContent`, no insertar HTML. Destinos HDMI/DisplayPort solo desde `screen.getAllDisplays`; NDI es destino virtual y no está implementado. No presentar formatos AVI/MKV como reproducibles hasta incorporar adaptador. Sin audio para salidas auxiliares; audio en pantalla principal depende del dispositivo predeterminado del sistema y requiere validación física.

### Datos
No modificar `JA_Proyecciones2`. Conservar `Documentos/JA Proyecciones 2 - Prototipo`. La importación de Biblia copia FSB/JSON validado a la biblioteca local con nombre nuevo cuando existe. Biblias protegidas únicamente mediante archivos autorizados del usuario.

## Pruebas de aceptación antes de usar durante un servicio
1. Ejecutar `npm run check`: sintaxis Electron, pruebas de rutas, carpetas, importación FSB, controles y pantalla segura.
2. En CI: `npm run prepare:bible` compara SHA-256 oficial, construye 66 libros, empaqueta y publica instalador de Windows. Ningún atajo omite validación.
3. En Windows con monitor extendido: configurar operador y salida; verificar que jamás se proyecta sobre el operador; previsualizar un MP4 H.264 conocido y enviar.
4. Confirmar reproducir, pausar, reiniciar, negro, limpiar; cambiar desde Himnario a Biblia y viceversa; comprobar que no quedan overlays.
5. Desconectar y reconectar monitor en medio de reproducción; la sesión desaparecida debe cerrarse sin enviar contenido a una pantalla distinta.
6. Comprobar volumen en HDMI principal y muting de auxiliares; con salida secundaria, un cambio no debe detener el video principal.
7. Verificar RV1909 Génesis 1:1, Salmo 23:1, Juan 3:16; importar un FSB propio; avanzar capítulo/versículo; revisar que JSON incorrecto se rechace sin tocar biblioteca.
8. Reiniciar aplicación y comprobar persistencia de enlaces y asignaciones; sin proyección automática.

## No implementado / fase siguiente
Proyección NDI, YouTube, presentación PowerPoint, fondos para textos, transición Cut/Fade, salida con superposiciones opcionales, reloj, escenarios guardados, versión móvil y diagnóstico de codecs. El Programa en la consola muestra estado, no copia de la imagen externa. La implementación de alta frecuencia/multimonitor requiere pruebas con GPU Windows y displays reales antes de considerarse estable.

## Entregas y responsabilidades
Primera versión usable: Biblioteca de videos e imágenes, FSB/JSON y proyección física explícita. El instalador de CI no es certificación de compatibilidad física. Ante fallos de CI corregir causa raíz, sin importar FreeShow ni desactivar pruebas. Después de cada modificación actualizar `docs/CONTINUIDAD_CHATGPT.md`.

## E2 visual Gemini — restauración de shell v0.3.1 (2026-11-01)
El usuario rechazó explícitamente el aspecto de `desktop/console.html` y volvió a aportar la interfaz original y su HTML. Decisión ejecutada: abrir `build/index.html`, generado desde `prototype/index.html` por Tailwind local. Quitar la demostración inline que simulaba cuatro pantallas, salida en vivo y temporizadores. Nuevo `desktop/bridge.js` enlaza ID del prototipo con IPC ya presente. Módulos reales en este corte: cuadrícula/libros/capítulos/versículos FSB, importar Biblia, carpetas Himnario/Cantos Juveniles/Multimedia y Vista previa + enviar por IDs de pantalla; sin autoenvío. Programa muestra estados y representación de texto/foto pero no fotogramas reales del video proyectado. Los botones sin capacidad real se deshabilitan o anuncian pendiente. Nuevas pruebas visuales exigen estructura Gemini y ausencia del mock. Los assets de ejemplo generados dentro del mock no se reproducen ni se hacen pasar por contenido real. Compilación y prueba física pendientes de confirmar en el commit final.
