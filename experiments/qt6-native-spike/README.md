# JA Proyecciones — prueba AISLADA de Qt 6

La rama experimental NO reemplaza la aplicación 0.6.1 ni altera el PR #2.

## Alcance implementado
- Ventana nativa Qt Quick/QML sin Electron ni FreeShow. Se reproducen las zonas clave del diseño Gemini, **no** la fidelidad exacta píxel a píxel.
- Dos sesiones reales independientes Qt Multimedia: Vista previa y Programa. Programa y su ventana externa dibujan **el mismo fotograma decodificado por un único QMediaPlayer** mediante QVideoSink y FrameSurface. No se sincronizan con currentTime.
- Abrir archivo local, play/pause, buscar, volumen, mute, reinicio, proyectar y limpiar sólo Programa; estados tomados de Qt.
- Detección de monitores por Qt y una ventana fullscreen independiente que bloquea la pantalla operador; hay que validar en Windows Extend.
- Sólo **detección opcional de DLL libobs** por símbolo obs_startup; no inicializa libobs, no es compositor OBS y no equivale a prueba de motor OBS.
- Prueba automatizada --self-test comprueba aislamiento básico de dos reproductores y estados independientes. No verifica fotogramas físicos.

## Limitaciones
Este spike usa Qt Multimedia, NO libobs. La conversión de frames QVideoFrame -> QImage usa CPU y puede añadir latencia; no es un motor final GPU/HDMI/NDI. Una sola ventana de salida externa. No permite proyecciones independientes ni ruteo de audio HDMI. No conecta Biblias, Himnario, proyectos ni carpetas originales.

## Construcción
Windows 2022 + Qt 6.8.3 MSVC2022 x64 con Multimedia, Qt Quick, QuickControls2 y CMake.
CMake desde la raíz del repositorio:
cmake -S experiments/qt6-native-spike -B .build/qt6-native-spike -G "Visual Studio 17 2022" -A x64 -DCMAKE_PREFIX_PATH="%QT_ROOT_DIR%"
cmake --build .build/qt6-native-spike --config Release
ctest --test-dir .build/qt6-native-spike -C Release --output-on-failure
El flujo de GitHub produce carpeta portátil para pruebas, no instalador JA.

## Aceptación física Windows
1. Abrir dos archivos y comprobar Vista previa independiente de Programa.
2. Proyectar: ambos muestran mismo frame desde un decoder; pausar/seek/volumen y observar estados.
3. Limpiar Programa: Preview sigue intacta.
4. HDMI Extender: mostrar salida externa, no invadir operador.
5. Probar MP4 H264/AAC y Spacedesk, cuantificar retrasos.
6. Verificar dispositivo de audio Windows por separado. No considerar libobs aprobado.

No tocar main ni feature/motor-propio-v1, no fusionar PR, no declarar solución final hasta validación Qt+libobs nativo e interfaz fiel.
