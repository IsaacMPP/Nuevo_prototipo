import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs
import QtQuick.Window
import JA.Native 1.0

ApplicationWindow {
    id: root
    visible: true
    width: 1500; height: 900
    minimumWidth: 1080; minimumHeight: 660
    color: "#05132e"
    title: "JA Proyecciones · PRUEBA AISLADA Qt 6 — NO versión 0.6.1"
    readonly property var monitors: Qt.application.screens

    FileDialog {
        id: picker
        title: "Archivo local para preparar en Vista previa"
        nameFilters: ["Vídeo (*.mp4 *.webm *.mov *.mkv)", "Audio (*.mp3 *.wav *.m4a)", "Todos (*.*)"]
        onAccepted: previewEngine.prepare(selectedFile)
    }
    Window {
        id: external
        visible: false; width: 1280; height: 720
        color: "black"
        flags: Qt.FramelessWindowHint | Qt.Window
        title: "JA · Programa compartido · Qt nativo"
        FrameSurface { anchors.fill: parent; media: programEngine }
        function showOn(index) {
            if(index < 0 || index >= root.monitors.length || root.monitors[index] === root.screen) {
                console.warn("No se permite proyectar en el monitor operador")
                return
            }
            screen = root.monitors[index]
            showFullScreen()
        }
    }

    component NativeButton: Button {
        id: b
        implicitHeight: 33; implicitWidth: 88
        font.pixelSize: 12; font.bold: true
        contentItem: Text {
            text: b.text; color: b.enabled ? "#f6fbff" : "#8597ac"
            font: b.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            radius: 7
            color: b.down ? "#1a6097" : "#143053"
            border.color: b.hovered ? "#4cd1fd" : "#3d5780"
        }
    }
    component PlayerCard: Rectangle {
        required property string heading
        required property color accent
        required property var engine
        color: "#081c35"; radius: 10; border.color: accent; border.width: 2
        ColumnLayout {
            anchors.fill: parent; anchors.margins: 10; spacing: 7
            RowLayout {
                Layout.fillWidth: true
                Text { text: heading; font.bold: true; font.pixelSize: 15; color: "white" }
                Item { Layout.fillWidth: true }
                Text { text: engine.playing ? "REPRODUCIENDO" : "PAUSADO / SIN EMISIÓN"; color: accent; font.pixelSize: 10 }
            }
            Rectangle {
                Layout.fillWidth: true; Layout.fillHeight: true
                color: "black"; clip: true; radius: 5
                FrameSurface { anchors.fill: parent; media: engine }
                Text {
                    visible: !engine.source.toString()
                    anchors.centerIn: parent
                    color: "#9bb2c9"; font.pixelSize: 12; text: heading + " · sin fuente"
                }
            }
            Text { Layout.fillWidth: true; color: "#bbcee2"; elide: Text.ElideMiddle; font.pixelSize: 11; text: engine.title || "Ningún archivo abierto" }
            Slider {
                Layout.fillWidth: true; implicitHeight: 19
                from: 0; to: Math.max(1, engine.duration); value: engine.position
                enabled: engine.duration > 0
                onMoved: engine.seek(value)
            }
            RowLayout {
                Layout.fillWidth: true; spacing: 5
                NativeButton { text: engine.playing ? "⏸ Pausa" : "▶ Play"; onClicked: engine.toggle() }
                NativeButton { text: "↺ Inicio"; onClicked: engine.restart() }
                NativeButton { text: engine.muted ? "🔇" : "🔊"; implicitWidth: 41; onClicked: engine.setMuted(!engine.muted) }
                Slider { Layout.fillWidth: true; from: 0; to: 100; value: engine.volume; onMoved: engine.setVolume(Math.round(value)) }
                Text { text: Math.floor(engine.position / 1000) + "/" + Math.floor(engine.duration / 1000) + "s"; color: "#b9c8dc"; font.pixelSize: 10 }
            }
            Text {
                visible: engine.error.length > 0
                text: engine.error; color: "#ff9f9f"; font.pixelSize: 11; wrapMode: Text.Wrap
                Layout.fillWidth: true
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent; anchors.margins: 14; spacing: 12
        Rectangle {
            Layout.fillWidth: true; height: 57; color: "#071a4c"; radius: 9; border.color: "#345178"
            RowLayout {
                anchors.fill: parent; anchors.margins: 15
                Rectangle {
                    width: 29; height: 29; radius: 6; color: "#4cd1fd"
                    Text { anchors.centerIn: parent; text: "JA"; color: "#071a4c"; font.bold: true }
                }
                ColumnLayout {
                    spacing: 1
                    Text { text: "JA PROYECCIONES"; color: "white"; font.bold: true; font.pixelSize: 17 }
                    Text { text: "Prueba nativa · distribución Gemini protegida"; color: "#acc9e1"; font.pixelSize: 10 }
                }
                Item { Layout.fillWidth: true }
                Text { text: "QT 6 · EXPERIMENTAL"; color: "#4cd1fd"; font.pixelSize: 12 }
            }
        }
        RowLayout {
            Layout.fillWidth: true; Layout.fillHeight: true; spacing: 12
            Rectangle {
                Layout.preferredWidth: 258; Layout.fillHeight: true
                color: "#0a1c3c"; radius: 9; border.color: "#2b4770"
                ColumnLayout {
                    anchors.fill: parent; anchors.margins: 13; spacing: 10
                    Text { text: "BIBLIOTECAS"; font.pixelSize: 14; font.bold: true; color: "white" }
                    Text { text: "Sin acceso a las bibliotecas ni ajustes de JA 0.6.1"; wrapMode: Text.Wrap; Layout.fillWidth: true; color: "#adc1db"; font.pixelSize: 12 }
                    NativeButton { text: "+ Abrir medio local"; Layout.fillWidth: true; onClicked: picker.open() }
                    Repeater {
                        model: ["📖 Biblia · pendiente", "♫ Himnario · pendiente", "▣ Multimedia · archivo local", "▣ YouTube · pendiente", "▣ Presentaciones · pendiente"]
                        delegate: Rectangle {
                            required property string modelData
                            Layout.fillWidth: true; height: 41; color: "#142d50"; radius: 5
                            Text { anchors.fill: parent; anchors.leftMargin: 9; verticalAlignment: Text.AlignVCenter; text: modelData; color: "#d2e2ef"; font.pixelSize: 11 }
                        }
                    }
                    Item { Layout.fillHeight: true }
                    Text { text: obsStatus; color: "#e7bd7a"; font.pixelSize: 11; wrapMode: Text.Wrap; Layout.fillWidth: true }
                    Text { text: "Qt Multimedia ≠ libobs. Sin migración aprobada."; color: "#9fb5d4"; font.pixelSize: 10; wrapMode: Text.Wrap; Layout.fillWidth: true }
                }
            }
            ColumnLayout {
                Layout.fillWidth: true; Layout.fillHeight: true; spacing: 10
                RowLayout {
                    Layout.fillWidth: true; Layout.fillHeight: true; spacing: 10
                    PlayerCard { Layout.fillWidth: true; Layout.fillHeight: true; heading: "VISTA PREVIA"; accent: "#efa837"; engine: previewEngine }
                    PlayerCard { Layout.fillWidth: true; Layout.fillHeight: true; heading: "PROGRAMA"; accent: "#33b87c"; engine: programEngine }
                }
                Rectangle {
                    Layout.fillWidth: true; height: 63; radius: 8; color: "#0a2040"; border.color: "#2e517a"
                    RowLayout {
                        anchors.fill: parent; anchors.margins: 10; spacing: 9
                        NativeButton {
                            implicitWidth: 118; text: "→ PROYECTAR"
                            onClicked: if (previewEngine.source.toString()) {
                                programEngine.prepare(previewEngine.source)
                                programEngine.play()
                            }
                        }
                        NativeButton { text: "✕ LIMPIAR"; onClicked: programEngine.clear() }
                        Text { text: "Limpiar solo afecta Programa"; color: "#b8cce8"; font.pixelSize: 11 }
                        Item { Layout.fillWidth: true }
                        Text { text: "Un decoder Programa compartido"; color: "#a5b9d7"; font.pixelSize: 10 }
                    }
                }
                Rectangle {
                    Layout.fillWidth: true; height: 113; radius: 8; color: "#0c1e3d"; border.color: "#2d4f78"
                    ColumnLayout {
                        anchors.fill: parent; anchors.margins: 10; spacing: 6
                        Text { text: "MULTIPANTALLA · " + root.monitors.length + " detectadas"; color: "white"; font.bold: true; font.pixelSize: 12 }
                        RowLayout {
                            Layout.fillWidth: true
                            ComboBox {
                                id: monitor
                                Layout.fillWidth: true
                                model: root.monitors.length
                                displayText: "Monitor " + (currentIndex + 1)
                            }
                            NativeButton { implicitWidth: 120; text: "Abrir salida"; onClicked: external.showOn(monitor.currentIndex) }
                            NativeButton { implicitWidth: 115; text: "Cerrar salida"; onClicked: external.hide() }
                        }
                        Text { text: "Sólo una salida espejo. HDMI, audio y Spacedesk requieren ensayo físico."; font.pixelSize: 10; color: "#aec3dd" }
                    }
                }
            }
        }
    }
}
