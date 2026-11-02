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
 for(const expected of ["setOutput(","PreviewOutput","videoSync(","VideoPlayer.pause(","VideoPlayer.play(","VideoPlayer.seekTo(","clearBackground(selectedId)","get(outputs)","Main.READ_FOLDER","hymnVideos","dispatch(\"classic\")"]){
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
 assert.ok(s.includes("<MainLayout />"),"Debe mantenerse acceso al gestor clásico");
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
test("Biblia alinea la pestaña real antes de proyectar y conserva FreeShow de respaldo",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(source.includes("activeSubTab !== activeBibleId"))
 assert.ok(source.includes("get(activeScripture).reference?.verses?.[0]?.length"))
 assert.ok(source.includes('void playScripture().then('))
 const css=read("engine/public/ja-gemini-layout.css")
 assert.ok(css.includes('select[data-role="ja-bibles"] option'))
 assert.ok(source.includes('dispatch("classic")'),"No quitar el gestor FreeShow mientras falten módulos")
})
