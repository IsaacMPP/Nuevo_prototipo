"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
test("El diseño Gemini se conserva sin el controlador demostrativo",()=>{
 const s=read("engine/src/frontend/components/ja/gemini-fragment.generated.ts");
 const css=read("engine/public/ja-gemini.css");
 assert.ok(s.length>30000,"No se puede sustituir Gemini por un panel pequeño");
 assert.ok(css.length>5000,"Debe incluir Tailwind local y estilos originales");
 for(const id of ["previewCanvasContent","programCanvasContent","btnProgramPause","multiscreenCardsList"]){
  assert.ok(s.includes(id),"Falta elemento visual "+id);
 }
 assert.ok(!/<script\b/i.test(s),"No se deben incrustar scripts del prototipo");
});
test("El adaptador usa salidas reales de FreeShow, nunca los vídeos ficticios",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte");
 for(const expected of ["setOutput(","PreviewOutput","videoSync(","VideoPlayer.pause(","VideoPlayer.play(","VideoPlayer.seekTo(","clearBackground(selectedId)","get(outputs)","Main.READ_FOLDER","hymnVideos"]){
  assert.ok(s.includes(expected), "Falta cableado real: "+expected);
 }
 assert.ok(s.includes("available.length!==1"),"No se ha protegido la etapa de salida única");
});
test("El arranque no deja llamadas a auxiliares desaparecidos",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 for(const fn of ["collectMockText","renderRealHeader","connectMediaTypeFilters","installFolderPicker","removeInertGeminiControls"]){
  assert.ok(source.includes("function "+fn+"("),fn+" necesita implementación antes de crear instalador")
 }
})
test("FreeShow conserva MainOutput y su proceso de salida original",()=>{
 const s=read("engine/src/frontend/App.svelte");
 assert.ok(s.includes("<MainOutput />"),"Se cambió la ventana de proyección");
 assert.ok(s.includes("<JaGeminiShell"),"No se cargó Gemini en operador");
 assert.ok(!s.includes("<MainLayout />"),"FreeShow clásico no debe montarse en la interfaz");
 assert.ok(!s.includes("on:classic"),"No debe existir ruta de vuelta a otra consola");
});

test("Vista previa real inicia silenciada y conserva controles independientes",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(source.includes('m.addEventListener("loadeddata"'),"Falta arranque de vídeo local")
 assert.ok(source.includes("if (previewMedia !== m || !m.isConnected) return"),"Debe evitar reproducción de vista previa obsoleta")
 assert.ok(source.includes("m.muted = true"),"No debe duplicar audio de Programa al seleccionar")
 assert.ok(source.includes('bind("btnPreviewPlay"'),"Controles manuales deben permanecer")
})
test("Volumen y transporte usan la sesión nativa, nunca sliders de muestra",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const css=read("engine/public/ja-gemini-layout.css")
 assert.ok(source.includes("VideoPlayer.getPlaying(playingPath, [selectedId])"))
 assert.ok(source.includes("VideoPlayer.updateVolume(playingPath)"))
 assert.ok(!source.includes('vol.disabled = true; vol.title = "Volumen fino pendiente'))
 assert.ok(source.includes('programSeek.id = "jaProgramSeek"'))
 assert.ok(css.includes(".ja-program-transport") && css.includes(".ja-program-seek"))
})
test("Biblia alinea la pestaña real antes de proyectar en Gemini",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(source.includes("activeSubTab !== activeBibleId"))
 assert.ok(source.includes("get(activeScripture).reference?.verses?.[0]?.length"))
 assert.ok(source.includes('void playScripture().then('))
 const css=read("engine/public/ja-gemini-layout.css")
 assert.ok(css.includes('select[data-role="ja-bibles"] option'))
 assert.ok(!source.includes('dispatch("classic")'),"No mostrar atajos al diseño clásico")
})

test("Proyección bíblica resuelve la plantilla de la salida principal JA sin ReferenceError",()=>{
 const source=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 assert.match(source,/function getScriptureTemplateId\(\) \{[\s\S]*?const styleId = getJAMainOutput\(\)\?\.style \|\| ""/,"La plantilla debe usar la misma salida principal que playScripture")
 assert.ok(!/\bgetFirstActiveOutput\s*\(/.test(source),"Referencia a helper no importado en proyección bíblica")
 assert.ok(source.includes("import { getAllNormalOutputs, getJAMainOutput, sendToJAOutputs, setOutput }"),"Falta la resolución explícita del destino principal")
})

test("El operador dispone de una sola consola JA y configuración propia operativa",()=>{
 const app=read("engine/src/frontend/App.svelte")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 assert.ok(app.includes("<JaGeminiShell />"),"Gemini debe ser la única consola")
 assert.ok(!app.includes("MainLayout") && !app.includes("jaGeminiEnabled") && !app.includes("ja-classic-return"),"No debe quedar escape a FreeShow clásico")
 assert.ok(!shell.includes('["classic"') && !shell.includes('dispatch("classic")'),"No debe existir menú de consola clásica")
 assert.ok(shell.includes('bind("btnOpenSettingsModal", () => { settingsOpen = true })'),"Configuración debe abrir su panel real")
 assert.ok(shell.includes("<JaGeminiSettings"),"Falta panel JA")
 for(const event of ["selectOutput","linkMedia","linkHymn","refreshMedia","refreshHymn","close"]){
   assert.ok(settings.includes('dispatch("'+event+'"'),"Acción de configuración sin conexión: "+event)
 }
 assert.ok(settings.includes("scriptureMode.set("),"Cambio de vista bíblica sin implementar")
})

test("Biblia Gemini prepara en un renderizador FreeShow aislado y no actualiza Programa al navegar",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const navigator=read("engine/src/frontend/components/drawer/bible/Scripture.svelte")
 const scripture=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 const preview=read("engine/src/frontend/components/ja/JaGeminiBiblePreview.svelte")
 assert.ok(shell.includes("prepareGeminiScriptureDraft()"),"Falta preparación bíblica")
 assert.ok(shell.includes("keyboardGeminiBible"),"Faltan flechas Gemini")
 assert.ok(shell.includes("geminiPreviewOnly:true"),"Navegador no está aislado de Programa")
 assert.ok(navigator.includes("!geminiPreviewOnly && hasLiveScriptureOutput"),"Selección puede actualizar Programa sin autorizar")
 assert.ok(navigator.includes("export async function navigatePreparedVerse"),"Falta navegación privada")
 assert.ok(scripture.includes("export async function prepareGeminiScriptureDraft()"),"Falta composición de plantilla real")
 const factory=scripture.split("export async function prepareGeminiScriptureDraft()")[1].split("// Ordinary")[0]
 assert.ok(!factory.includes("setOutput(") && !factory.includes("sendToJAOutputs("),"El borrador nunca debe emitir")
 assert.ok(preview.includes("outOverride={prepared}"),"Vista previa debe aislar contenido sin escribir en outputs")
})

test("Al editar plantillas o seleccionar versículos en Gemini no se actualiza una Biblia ya emitida",()=>{
 const navigator=read("engine/src/frontend/components/drawer/bible/Scripture.svelte")
 assert.ok(navigator.includes("if (geminiPreviewOnly || !templateId"),"Un cambio de plantilla podría actualizar Programa")
 assert.ok(navigator.includes("if (!geminiPreviewOnly && hasLiveScriptureOutput"),"La actualización asíncrona podría afectar una salida activa")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes("isScriptureDraft || !previewMedia"),"Los controles de transporte se deben aislar durante una vista bíblica")
})

test("Doble clic y búsqueda bíblica no pueden emitir desde Gemini",()=>{
 const navigator=read("engine/src/frontend/components/drawer/bible/Scripture.svelte")
 assert.ok(navigator.includes("if (playWhenLoaded && !geminiPreviewOnly)"),"La búsqueda puede publicar sin pulsar Proyectar")
 assert.ok(navigator.includes("geminiPreviewOnly || (hasLiveScripture && !e.ctrlKey"),"El doble clic puede publicar accidentalmente")
})

test("Controles generales: restablecimiento seguro, ampliar monitor y limpiar solo texto bíblico",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 for(const command of [
   'bind("btnResetTargets", resetTargetSelection)',
   'bind("btnPreviewFullscreen"',
   'bind("btnProgramFullscreen"',
   'bind("btnMultiScreenMenu", openScreenSettings)',
   'bind("btnBridgeClearText", clearSelectedTextLayer)'
 ]) assert.ok(shell.includes(command),"Falta acción real: "+command)
 assert.ok(shell.includes('if (!output.out?.slide) return notice('),"No se deben limpiar salidas sin una capa de diapositiva")
 assert.ok(shell.includes('clearSlide(true, selectedId)'),"La limpieza no está dirigida a una salida específica")
 const resets=shell.split("function resetTargetSelection()")[1]?.split("function toggleLocalFullscreen")[0] || ""
 assert.ok(!resets.includes('setOutput(') && !resets.includes('clearBackground(') && !resets.includes('clearSlide('),"Restablecer selección no debe alterar Programa")
 assert.ok(settings.includes('window.confirm('),"Restablecer preferencias debe solicitar confirmación")
 assert.ok(settings.includes('dispatch("previewAutoplayChange"') && shell.includes("if (previewAutoplay) void m.play()"),"Preferencia de autoplay no conectada al reproductor")
 assert.ok(settings.includes('dispatch("compactUiChange"') && shell.includes('ja-compact-ui'),"Densidad de interfaz no conectada")
 assert.ok(shell.includes('bind("btnBridgeBlack",()=>setOperatorEffect(JA_BLACK))'),"Cortina negra debe usar el efecto de salida nativo")
 assert.ok(shell.includes('bind("btnBridgeLogo",()=>setOperatorEffect(JA_LOGO))'),"Logo debe usar el efecto de salida nativo")
})

test("Botones Agregar Multimedia y A+ operan en la consola, sin tocar la proyección",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 assert.ok(shell.includes('bind("btnAddMultimedia", toggleAddMediaMenu)'),"Agregar Multimedia debe abrir opciones reales para archivos y carpetas")
 assert.ok(shell.includes('bind("btnLargeTextToggle",'),"A+ necesita manejador")
 assert.ok(shell.includes('ja-large-ui'),"A+ debe tener efecto visible en UI")
 assert.ok(settings.includes('dispatch("largeUiChange"'),"Preferencia tipográfica desconectada")
 assert.ok(!shell.includes('["btnLargeTextToggle","btnOpenDiagModal"'),"A+ quedó deshabilitado")
})

test("Regresiones físicas de cuatro botones: Restablecer, Ampliar, Agregar y Limpiar",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const css=read("engine/public/ja-gemini-layout.css")
 const fragment=read("engine/src/frontend/components/ja/gemini-fragment.generated.ts")
 for(const id of ["btnResetTargets","btnPreviewFullscreen","btnProgramFullscreen","btnAddMultimedia","btnBridgeClearText"]){
   // La fuente versionada es placeholder hasta prepare-gemini; este gate se
   // completa mediante audit-controls del HTML real en el workflow.
   assert.ok(shell.includes('bind("'+id+'"'),"El control no está conectado: "+id)
 }
 const reset=shell.split("function resetTargetSelection()")[1].split("function closeLocalExpanded()")[0]
 assert.ok(reset.includes('preview.replaceChildren()') && reset.includes('prepared = ""'),"Restablecer debe limpiar una Vista previa visible")
 for(const unsafe of ["setOutput(","clearBackground(","clearSlide("])assert.ok(!reset.includes(unsafe),"Restablecer no debe alterar Programa")
 assert.ok(shell.includes('target.classList.add("ja-console-expanded")') && css.includes('.ja-console-expanded'),"Ampliar debe funcionar dentro de JA")
 assert.ok(!shell.includes("requestFullscreen()"),"No depender de Fullscreen API en Electron")
 assert.ok(shell.includes("Main.OPEN_FILE") && shell.includes("ToMain.OPEN_FILE2"),"Agregar debe importar archivos reales desde Windows")
 assert.ok(shell.includes("Main.OPEN_FOLDER"),"También debe permitir vincular carpetas")
 const clear=shell.split("function clearSelectedTextLayer()")[1].split("function openScreenSettings()")[0]
 assert.ok(clear.includes("clearSlide(true, selectedId)"),"Debe limpiar solo la diapositiva del destino")
 assert.ok(!clear.includes("clearBackground(") && !clear.includes("setOutput("),"No borrar fondos ni interferir audio al limpiar texto")
})

test("Reglas de emisión: al publicar multimedia desaparece escritura temporal sin cortar audio de otros destinos",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('setOutput("background",{'),"Debe conservar el envío nativo a una salida de FreeShow")
 assert.ok(shell.includes('},false,selectedId)'),"El envío debe nombrar la salida, no proyectar implícitamente a todas")
 assert.ok(shell.includes('if(scriptureSlide && (scriptureSlide.id==="temp" || scriptureSlide.id==="tempText"))'),"Debe limpiar solo el pasaje temporal")
 assert.ok(shell.includes('clearSlide(true,selectedId)'),"La Biblia previa debe retirarse del destino")
 assert.ok(shell.includes('clearBlackBeforePublishing([selectedId])'),"Cortina negra no puede ocultar el siguiente contenido")
 const destinations=read("engine/src/frontend/utils/jaProjectionDestinations.ts")
 assert.ok(destinations.includes('!!o.screen'),"No permitir multi-output sin asignación física")
 const publisher=shell.split('function publishPreparedMedia(')[1].split('function toggleFollowProgram()')[0]
 assert.ok(!publisher.includes('sendToJAOutputs('),"La salida única NO puede depender del validador multipantalla")
})
test("Consola: transiciones, negro y logo usan capas de FreeShow; sincronización de vídeo es opt-in y silenciada",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 for(const fragment of [
   'bind("btnBridgeCut",publishPreparedMedia)',
   'el("btnBridgeFade")?.remove()',
   'bind("btnBridgeBlack",()=>setOperatorEffect(JA_BLACK))',
   'bind("btnBridgeLogo",()=>setOperatorEffect(JA_LOGO))',
   'setOutput("effects",next,false,selectedId)',
   'normalizeJAContentPath(prepared)===normalizeJAContentPath(playingPath)',
   'previewMedia.muted=true',
   'syncLinkedPreview()'
 ]) assert.ok(shell.includes(fragment),"No está enlazado "+fragment)
 assert.ok(shell.includes('el("btnBridgeFade")?.remove()'),"No se debe mostrar Fundido sin validar")
 assert.ok(!shell.includes('disable("btnBridgeBlack"'),"Negro no debe estar bloqueado")
})

test("Banner de Biblioteca no aparenta cambiar modo y controles multipantalla declaran su bloqueo real",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('dropdown.replaceWith(status)'),"Eliminar selector ficticio de Modo")
 assert.ok(shell.includes('status.textContent = "Biblioteca local · Archivos reales"'),"Mostrar origen real de datos")
 assert.ok(shell.includes('el("btnProgramToAll")?.remove()'),"No mostrar distribución no implementada")
 assert.ok(shell.includes('el("btnPreviewToAll")?.remove()'),"No mostrar vista previa múltiple ficticia")
 assert.ok(shell.includes('if(isLinkedVideo())VideoPlayer.seekTo(playingPath,selectedId,seconds)'),"La búsqueda vinculada necesita controlar la sesión pública")
})

test("Agregar multimedia tiene un único manejador: no abre carpetas de forma simultánea",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const filters=shell.split("function connectMediaTypeFilters()")[1].split("function installFolderPicker()")[0]
 assert.ok(!filters.includes('sendMain(Main.OPEN_FOLDER'),"El filtro no debe registrar un segundo diálogo de carpeta")
 assert.ok(shell.includes('bind("btnAddMultimedia", toggleAddMediaMenu)'),"Menú de importación faltante")
})

test("S0: el envío de una salida no exige campo screen ni primaryId de JA",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const router=read("engine/src/frontend/utils/jaProjectionDestinations.ts")
 const f=shell.split("function publishPreparedMedia(")[1].split("function toggleFollowProgram()")[0]
 assert.ok(f.includes("setOutput(\"background\""),"El envío único debe volver a FreeShow")
 assert.ok(!f.includes("sendToJAOutputs("),"Nunca bloquear la única salida con el router multipantalla")
 assert.ok(f.includes("get(outputs)[selectedId]?.active"),"No proyectar en salida inactiva")
 assert.ok(f.includes("available.length!==1"),"No permitir difusión insegura")
 assert.ok(router.includes("!primaryId"),"El router de múltiples destinos exige primario; no reutilizarlo para la salida única")
});
test("Transiciones y controles visibles cumplen un contrato mínimo sin efectos simulados",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('function project() {publishPreparedMedia()}'))
 assert.ok(shell.includes('bind("btnBridgeCut",publishPreparedMedia)'))
 assert.ok(shell.includes('el("btnBridgeFade")?.remove()'))
 assert.ok(!shell.includes('transitionData.update('),"La emisión no debe cambiar transiciones globales")
 assert.ok(!shell.includes('"blur" | "scale" | "slide"'),"No ofrecer efectos sin validación física")
 assert.ok(!shell.includes("showTransitionOptions"),"No ofrecer menú ficticio de efectos")
 for (const id of ["btnProgramToAll","btnPreviewToAll"])assert.ok(shell.includes('el("'+id+'")?.remove()'),"Ocultar botón no implementado: "+id)
});
