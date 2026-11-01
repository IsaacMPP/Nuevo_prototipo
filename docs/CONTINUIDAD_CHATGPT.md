# Continuidad obligatoria — Nuevo_prototipo

Repositorio EXCLUSIVO: https://github.com/IsaacMPP/Nuevo_prototipo
Rama de desarrollo: feature/escritorio-prototipo-ja
No modificar IsaacMPP/JA_Proyecciones2, su main ni su PR #2; ese repo es fuente de consulta para preservar funcionalidades.

Propósito: adaptar el HTML original (`prototype/index.html`) a aplicación Windows Electron, manteniendo diseño y reutilizando después motor y funcionalidades verdaderas de FreeShow/JA: Biblia original con FSB, RV1909, fondos y flechas; Himnario separado; Multimedia con carpetas vinculadas y caché; YouTube real, Presentaciones/canvas, Fondos, Listas, consola de preview/Programa y multipantalla con audio principal, NDI y escenas.

Contrato: una sola interfaz (no hay «modo Culto Divino / Culto Joven»). Proyectos, escenarios reutilizables y autoguardado: abrir nunca emite automáticamente. La carpeta de Prototipo es distinta de la app anterior y enlaces externos nunca se alteran.

Proceso: antes de modificar programar: auditar, especificar impacto/dependencias, modificar en bloques, pruebas CI/Windows, documentar. Tras cada cambio entregar prompt autocontenido.
Estado inicial: el HTML entregado es una simulación. El shell Electron puede ofrecer servicios nativos de archivos y pantallas, pero aún NO es el reproductor multipantalla de FreeShow; no proclamar paridad hasta probarla.
