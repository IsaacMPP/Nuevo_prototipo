# H1-01 — Auditoría técnica y contrato de autodescubrimiento del videohimnario

Fecha: 2026-10-27. Rama: `feature/base-freeshow-diseno-ja`. Estado: diseño auditado; H1-02 pendiente de implementación y pruebas.

## Fuentes comprobadas
- `src/electron/utils/jaContentFolders.ts`: crea las 11 carpetas bajo Documentos/JA Proyecciones 2 y expone rutas mediante `getJAContentFolders`.
- `src/frontend/utils/jaMediaFolders.ts`: registra `Fondos Personalizados`, `Imagenes` y `Videos` en `mediaFolders`; `Audio` y, erróneamente para este contenido, `Cantos Juveniles` en `audioFolders`. Himnario Adventista no está conectado.
- `src/frontend/components/drawer/media/Media.svelte`: la vista «Todos» lee rutas de `mediaFolders`, y carpetas registradas también se leen mediante `Main.READ_FOLDER`.
- `src/frontend/components/drawer/navigation/MediaTabs.svelte`: los recuentos y las carpetas visibles provienen de `mediaFolders`.
- `src/frontend/values/tabs.ts` / `drawer/Navigation.svelte`: no existe pestaña Himnario.
- Referencia anterior `IsaacMPP/Ja_Proyeccion`, `jaVideoLibrary.ts`: normaliza tildes/números y reconoce bibliotecas por prefijo de ruta. Era un filtro de Multimedia, no un módulo independiente.

## Contrato vinculante
1. Los videos de `Himnario Adventista` y `Cantos Juveniles` se detectan automáticamente por la ruta canónica de Documentos (arranque, apertura de módulo y cambios en el disco). Si un usuario elige directorios externos adicionales, se vinculan explícitamente al módulo.
2. La biblioteca de Himnario es independiente de `mediaFolders` y `audioFolders`. No se usan archivos TXT ni conversión a diapositivas. No duplicar archivos.
3. Multimedia debe excluir las rutas exclusivas del Himnario tanto del catálogo/listado como de la búsqueda global y recuentos; proteger la situación en la que un usuario registra como Multimedia la carpeta madre `JA Proyecciones 2` o una carpeta superpuesta. La exclusión tiene que aplicar también a subdirectorios.
4. Importar en Biblia y autodescubrir `Biblias` son responsabilidades del módulo Biblia; no afirmar que el solo directorio ya importa traducciones. Una futura unidad examinará si el importador actual puede registrar archivos depositados allí sin duplicar registros.
5. Reutilizar `Main.READ_FOLDER`, miniaturas y el reproductor/proyección de FreeShow; solo registrar rutas separadas y crear interfaz/consulta de Himnario. Cualquier archivo no compatible debe resultar visible como incidencia, no reproducirse artificialmente.
6. Minimizar watchers por sistema: reconciliación al abrir el módulo y al recuperar foco; watcher de sistema con limpieza al cerrarse y tratamiento de errores si está disponible.
7. El estado persistente debe guardar preferencia/colecciones adicionales, no índices de ruta absoluta duplicados para cada video. Los videos pertenecen al usuario.

## Riesgos y mitigación
- Compatibilidad de AVI/MKV: el reconocimiento de extensión no garantiza reproducción del códec. Probar en Windows.
- Carpetas desconectadas: no eliminar su configuración ni mostrar datos fantasma.
- Seguridad/rutas: normalizar separadores, mayúsculas/minúsculas en Windows y comprobar límite entre directorios (evitar prefijos falsos).
- Registros heredados: `Cantos Juveniles` registrado anteriormente como Audio requiere migración acotada; nunca borrar carpetas externas del usuario.
- Multisalida: H1 solo reutiliza FreeShow; la independencia de salidas y audio se desarrolla en M1.

## Secuencia de implementación
H1-02a: construir utilidad comprobable de clasificación y exclusión por ruta de carpeta, con tests unitarios de solapamiento, mayúsculas y separadores.
H1-02b: instalar almacén/registro separado de carpetas de Himnario y reconciliación; ajustar la clasificación anterior de Cantos Juveniles.
H1-03: pestaña Himnario junto a Escrituras con catálogo numerado y categorías; no lanzar a proyección al seleccionar.
H1-04: búsqueda por número/título.
H1-05: vista previa y reproducción con motor FreeShow.
H1-06: CI, pruebas de copia/renombrado/eliminación en Windows y verificación de exclusión total de Multimedia.

## Condición de cierre de H1-01
Fuentes localizadas, restricciones documentadas y contrato de fases aprobado por el propietario en conversación. La documentación no implica código funcional; ninguna prueba Windows de H1 está aprobada aún.
