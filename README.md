# JA Nuevo Prototipo

Proyecto independiente de escritorio para experimentar con la nueva interfaz de **JA Proyecciones 2**, sin modificar ni fusionar [el proyecto original](https://github.com/IsaacMPP/JA_Proyecciones2).

## Estado real

La interfaz HTML completa compartida por el usuario se conserva en `prototype/index.html`. La ejecutamos como aplicación **Electron** mediante un shell seguro que añade capacidades reales de Windows: inventario de monitores, asignación de operador/principal, carpetas locales separadas, vinculación de carpetas externas, biblioteca indexada, vista previa de archivos y proyectos/escenarios guardados.

**La vista Programa, los cuatro monitores y varios botones del HTML original son demostraciones.** El shell impide que los controles de envío rápido simulen éxito. Antes de instalar motor FreeShow/JA no existen todavía salidas HDMI/NDI renderizadas, audio sincronizado, YouTube proyectado, importación bíblica operativa ni editor nativo de diapositivas. Véase `docs/ARQUITECTURA.md` para las etapas de integración y pruebas.

## Ejecutar en Windows

Requisitos: Node.js 22 o superior, npm e instalación de dependencias con internet la primera vez.

```powershell
git clone https://github.com/IsaacMPP/Nuevo_prototipo.git
cd Nuevo_prototipo
git checkout feature/escritorio-prototipo-ja
npm install
npm start
```

`npm run check` compila Tailwind local y prueba el módulo de almacenamiento. `npm run pack:win` crea un instalador Windows experimental mediante electron-builder. GitHub Actions genera un instalador sin firma en la rama de desarrollo cuando el workflow finaliza correctamente.

## Datos locales y privacidad

La aplicación crea `Documentos/JA Proyecciones 2 - Prototipo/` con:
`Biblias`, `Himnario Adventista`, `Cantos Juveniles`, `Fondos Personalizados`, `Audio`, `Imagenes`, `Videos`, `Importaciones`, `Presentaciones`, `Cache`, `Configuracion` y `Proyectos`.

Las bibliotecas del JA anterior **no se modifican**. En el botón **📂 Biblioteca real**, puedes vincular otras carpetas para consultar archivos sin copiarlos. En **🗂 Proyectos**, puedes crear y guardar proyectos y escenarios. En **🖥 Pantallas**, se ven los monitores reales y se guarda cuál es el del operador y cuál el principal JA, sin activar proyección.

## Arquitectura / próximos pasos

1. Reusar el motor FreeShow/JA 1.6.7 con auditoría de componentes, licencias y pruebas de regresión (no reimplementar reproductores).
2. Conectar los botones del prototipo a comandos reales de salida con monitor separado de destino; proteger audio principal, capas y escenarios.
3. Integrar Biblia nativa, importación FSB/XML, RV1909, navegación con flechas y fondos; Himnario, Multimedia, YouTube y Presentaciones como módulos reales.
4. Integrar NDI como salida lógica configurada, descubrir HDMI, sesiones/sincronización y autoguardado.
5. Probar hardware Windows e instalar únicamente después de validación.

**No hay dos modos «Culto Joven» y «Culto Divino»**: se organizan como proyectos y escenarios en una sola interfaz.

## Documentos de continuidad
- [Arquitectura](docs/ARQUITECTURA.md)
- [Decisiones](docs/DECISIONES.md)
- [Pruebas](docs/PRUEBAS.md)
- [Prompt de continuidad](docs/CONTINUIDAD_CHATGPT.md)

## Licencia
Se conserva la licencia GPL-3.0 y atribución de FreeShow/JA en el motor incorporado; ver [LICENSE](LICENSE) y los archivos de origen en `engine/`.
