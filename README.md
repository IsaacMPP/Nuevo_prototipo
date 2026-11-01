# Nuevo prototipo · JA Proyecciones 2

Proyecto independiente para evaluar una nueva interfaz de escritorio de proyección basada en la propuesta HTML de JA, sin modificar el repositorio [JA_Proyecciones2](https://github.com/IsaacMPP/JA_Proyecciones2).

**Estrategia:** el HTML es la referencia de diseño y NO es el motor de proyección. La aplicación utilizará un shell Electron con servicios reales y un plan para incorporar el motor FreeShow/JA ya probado, sin reimplementar sus controles de video, Biblia, YouTube, escenas y salidas. La separación evita que acciones del prototipo de demostración aparenten funcionar sin proyección real.

**Estado:** desarrollo experimental; ninguna pantalla, NDI, audio o proyección se considera validada en Windows hasta completar pruebas de hardware.

Consulta `docs/ARQUITECTURA.md`, `docs/PRUEBAS.md` y `docs/CONTINUIDAD_CHATGPT.md` en la rama de desarrollo.
