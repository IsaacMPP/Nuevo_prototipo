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
 assert.ok(s.includes("ids.length !== 1"),"No se ha protegido la etapa de salida única");
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
