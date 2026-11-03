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
 assert.ok(s.includes("!destinationId || !available.includes(destinationId)"),"No se ha protegido el destino marcado explícito");
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
 assert.ok(source.includes('void sendScriptureToJAOutputs([destinationId]).then('))
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
 assert.ok(scripture.includes("export async function prepareGeminiScriptureDraft(outputId?:string)"),"Falta composición de plantilla real por salida")
 const factory=scripture.split("export async function prepareGeminiScriptureDraft(outputId?:string)")[1].split("// Ordinary")[0]
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
 assert.ok(settings.includes('dispatch("previewAutoplayChange"') && shell.includes("else if (previewAutoplay)") && shell.includes('void m.play().catch('),"Preferencia de autoplay no conectada al reproductor")
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
 assert.ok(shell.includes('},false,destinationId)'),"El envío individual debe nombrar la salida marcada, nunca proyectar implícitamente a todas")
 assert.ok(shell.includes('if(scriptureSlide && (scriptureSlide.id==="temp" || scriptureSlide.id==="tempText"))'),"Debe limpiar solo el pasaje temporal")
 assert.ok(shell.includes('clearSlide(true,destinationId)'),"La Biblia previa debe retirarse del destino marcado")
 assert.ok(shell.includes('clearBlackBeforePublishing([destinationId])'),"Cortina negra no puede ocultar el siguiente contenido marcado")
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
 assert.ok(f.includes("get(outputs)[destinationId]?.active"),"No proyectar en salida inactiva")
 assert.ok(f.includes("!destinationId || !available.includes(destinationId)"),"No permitir difusión sin destino marcado")
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

test("Logo propio: selector nativo de imagen, efecto enlazado y configuración persistente",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 for(const item of [
  'channel:"JA_GEMINI_LOGO_IMAGE"',
  'configureLogoPath(files[0])',
  'logoEffectItem()',
  'image.src=toJALogoImageURL(path)',
  'localStorage.setItem("ja-gemini-logo-path",customLogoPath)',
  'on:chooseLogo={selectLogoImage}',
  'on:logoPositionChange=',
  'on:logoScaleChange='
 ])assert.ok(shell.includes(item),"Logo sin conexión real: "+item)
 assert.ok(settings.includes('Logo y marca') && settings.includes('dispatch("chooseLogo")'),"Debe existir panel funcional del logo")
 assert.ok(settings.includes('dispatch("logoPositionChange"'),"Posición sin manejar")
 assert.ok(settings.includes('dispatch("logoScaleChange"'),"Escala sin manejar")
 assert.ok(!shell.includes('items:[{type:"asset",path:"./ja-logo.png"'),"El Logo no debe seguir fijo")
});
test("Regresar al mismo vídeo puede revincular Vista previa sin reiniciar Programa",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const body=shell.split("function prepare(path: string)")[1].split("function project()")[0]
 assert.ok(body.includes('VideoPlayer.getPlaying(playingPath,[selectedId])'),"La revinculación requiere sesión pública real")
 assert.ok(body.includes("followProgram=samePlayingVideo"),"Falta recuperar el vínculo del mismo medio")
 assert.ok(body.includes('if (samePlayingVideo && type==="video")'),"No reiniciar desde cero si el vídeo ya está en Programa")
 assert.ok(body.includes("syncLinkedPreview()"),"Debe obtener el tiempo y pausa del vídeo real")
});

test("Pantallas Windows: detección física, identificación y salidas únicamente creadas con confirmación",()=>{
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(settings.includes("requestMain(Main.GET_DISPLAYS)"),"Se deben leer monitores reales desde Electron")
 assert.ok(settings.includes('send(OUTPUT,["IDENTIFY_SCREENS"],physicalDisplays)'),"Identificar debe usar FreeShow")
 assert.ok(settings.includes('dispatch("createDisplayOutput"'),"Creación de salidas debe ser explícita")
 assert.ok(settings.includes('dispatch("assignDisplay"'),"Asignación de monitor debe requerir selección")
 assert.ok(settings.includes("window.confirm("),"Evitar movimientos físicos sin confirmación")
 assert.ok(shell.includes('addOutput(false,"",false,name)'),"Primero registrar una salida deshabilitada")
 assert.ok(shell.includes('toggleOutputs([id],{state:true})'),"Crear debe activar la ventana nueva, no solo registrarla")
 assert.ok(shell.includes('toggleOutputs([outputId],{state:true})'),"La asignación debe activar la ventana nativamente")
 const native=read("engine/src/electron/output/helpers/OutputVisibility.ts")
 assert.ok(native.includes("await OutputHelper.Lifecycle.createOutput(output)"),"Debe esperar la creación antes de intentar mostrar la ventana")
});
test("Logo personalizado reconstruye clave del renderizador y no conserva imagen antigua",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(s.includes('activeLogoEffectId = JA_LOGO + "_" + uid()'),"El renderizador debe remontar la imagen activa")
 assert.ok(s.includes("ids.some(isJaLogoEffect)"),"Hay que actualizar las salidas que muestran el logo")
 assert.ok(s.includes('setOutput("effects",[...remaining,nextId],false,outputId)'),"Remontaje de efecto en Programa faltante")
 assert.ok(s.includes('active.some(isJaLogoEffect)'),"Interruptor debe reconocer el logo renovado")
});
test("Salida seleccionada mantiene control único; las secundarias empiezan sin audio",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const pub=s.split("function publishPreparedMedia()")[1].split("function toggleFollowProgram()")[0]
 assert.ok(pub.includes("!destinationId || !available.includes(destinationId)"),"Se requiere salida marcada")
 assert.ok(!pub.includes("available.length!==1"),"No bloquear Programa al configurar más salidas")
 assert.ok(pub.includes("muted:available.length>1 && destinationId!==mainId"),"Secundarias deben empezar silenciadas")
 assert.ok(pub.includes('},false,destinationId)'),"Nunca hacer broadcast por omisión")
});

test("Operador queda bloqueado por identificador nativo, no por número de Windows",()=>{
 const main=read("engine/src/electron/IPC/responsesMain.ts")
 const settings=read("engine/src/frontend/components/ja/JaGeminiSettings.svelte")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(main.includes("jaOperatorDisplay: display.id === operator.id"))
 assert.ok(main.includes("displays.find(display => display.internal)"))
 assert.ok(main.includes("screen.getDisplayMatching(getMainWindow()!.getBounds())"))
 assert.ok(settings.includes("disabled={isOperatorDisplay(display)}"),"Laptop debe ser no seleccionable")
 assert.ok(settings.includes('if(!display || isOperatorDisplay(display))return'),"Bloquear operador también en controlador")
 assert.ok(shell.includes('if(!operator || !requested || operator.id===requested.id)return null'),"Proteger nuevamente en ejecución")
 assert.ok(shell.includes('knownExternalDisplayIds.has(String(value.screen))'),"Quick targets no debe listar outputs sin monitor externo")
});
test("La activación nativa espera creación de la ventana antes de informar estado",()=>{
 const native=read("engine/src/electron/output/helpers/OutputVisibility.ts")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(native.includes("static async toggleOutputs("))
 assert.ok(native.includes("await OutputVisibility.toggleOutput("))
 assert.ok(native.includes("await OutputHelper.Lifecycle.createOutput(output)"))
 assert.ok(shell.includes('toggleOutputs([outputId],{state:true})'))
 assert.ok(shell.includes('toggleOutputs([id],{state:true})'))
 assert.ok(shell.includes("Activando salida en "))
 assert.ok(!shell.includes('send(OUTPUT,["CREATE"],{...outputSnapshot'),"CREATE por sí solo deja la ventana oculta")
 assert.ok(shell.includes('configure.onclick=()=>{settingsStartSection="screens";settingsOpen=true}'),"Configuración debe ser accesible desde Envío rápido")
});

test("Logo Windows: rutas file:/// válidas, dimensionamiento independiente de pixeles y todas las salidas",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const type=read("engine/src/types/Effects.ts")
 const effect=read("engine/src/frontend/components/output/effects/effectRenderer.ts")
 assert.ok(shell.includes('encodeFilePath(path).replace(/\\\\/g,"/")'),"Normalizar barras de Windows")
 assert.ok(shell.includes('"file:///" + encoded'),"Un path C:\\ necesita URL file:///")
 assert.ok(shell.includes('path:toJALogoImageURL(customLogoPath)'),"Usar URL válida en ambas ventanas")
 assert.ok(shell.includes('size:logoScale,fitWidth'),"Logo requiere ancho de lienzo en lugar de pixeles")
 assert.ok(type.includes('fitWidth?: number'),"Opt-in para no cambiar otros efectos")
 assert.ok(effect.includes('const desiredWidth = this.width *'),"La escala debe usar proporción del canvas")
 assert.ok(effect.includes('if (!image?.complete || !image.naturalWidth'),"No dibujar assets sin imagen válida")
 assert.ok(shell.includes('for(const [outputId,out] of Object.entries(get(outputs)))'),"Cambios de logo deben actualizar salidas activas")
 const css=read("engine/public/ja-gemini-layout.css")
 assert.ok(css.includes('justify-content: flex-start !important'),"No separar tarjetas multipantalla verticalmente")
})
test("Biblia Gemini utiliza los destinos marcados en Envío rápido (único o grupo)",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const s=shell.split('project.className="ja-bible-project"')[1].split('bar.append(project)')[0]
 assert.ok(s.includes('const marked=markedGroupTargets()'),"Usar el selector de pantallas de Envío rápido")
 assert.ok(s.includes('if(marked.length>1){void sendPreparedToGroup();return}'),"Grupo de Biblia no conectado")
 assert.ok(s.includes('const destinationId=marked[0] || ""'),"Ruta de Biblia a un destino marcado")
 assert.ok(s.includes('ids.includes(destinationId)'),"Validar salida activa")
 assert.ok(s.includes('sendScriptureToJAOutputs([destinationId])'),"Envío directo debe ser explícito")
 assert.ok(!s.includes('playScripture().then'),"No usar un principal implícito")
})

test("Envío rápido multiselección reemplaza el panel grande sin ocultar tarjetas",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const css=read("engine/public/ja-gemini-layout.css")
 assert.ok(shell.includes("let syncedTargetIds = new Set<string>()"),"Destinos deben ser separados de inspección de Programa")
 assert.ok(shell.includes("let quickTargetsInitialized = false"),"No debe iniciar un grupo arbitrario de varias pantallas")
 assert.ok(shell.includes('target.className="ja-target ja-quick-target'),"Checkbox visual solo en barra Envío rápido")
 assert.ok(shell.includes('target.setAttribute("aria-label","Incluir "'),"No se identifican los destinos con accesibilidad")
 assert.ok(shell.includes('if(syncedTargetIds.has(id))syncedTargetIds.delete(id)'),"Botón de cada pantalla no es reversible")
 assert.ok(shell.includes('target.onclick=()=>{'),"Los destinos no tienen controlador")
 assert.ok(shell.includes('if(syncedTargetIds.size===1)'),"Una sola pantalla marcada debe actualizar el monitor inspeccionado")
 assert.ok(shell.includes('inspectOutput([...syncedTargetIds][0])'),"Una selección individual debe recuperar el monitor inspeccionado y su control")
 assert.ok(shell.includes('send.onclick=sendToQuickTargets'),"Acción rápida desconectada")
 assert.ok(!shell.includes('group.id="jaSyncPanel"'),"No se debe conservar bloque de sincronización en Multipantalla")
 assert.ok(!shell.includes('list?.append(group)'),"Multipantalla solo presenta tarjetas")
 assert.ok(css.includes(".ja-quick-target"),"Falta estilo compacto de barra")
 assert.ok(!css.includes(".ja-sync-panel"),"No conservar CSS del panel retirado")
 assert.ok(shell.includes("for(const id of [...syncedTargetIds])if(!available.includes(id))syncedTargetIds.delete(id)"),"No se retiran salidas desconectadas")
});
test("Quick Play y Cortar envían al destino marcado; al marcar varias usan un reloj",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const p=shell.split("function publishPreparedMedia()")[1].split("function toggleFollowProgram()")[0]
 assert.ok(p.includes("const targets=markedGroupTargets()"),"No usar el destino marcado")
 assert.ok(p.includes("if(!targets.length)"),"No emitir sin destinos")
 assert.ok(p.includes("if(targets.length>1){void sendPreparedToGroup();return}"),"Enviar grupo no está conectado a Quick Play")
 assert.ok(p.includes("const destinationId=targets[0]"),"Envío individual debe seguir funcionando")
 assert.ok(p.includes('},false,destinationId)'),"Envío individual debe llevar un outputId explícito")
 assert.ok(p.includes("selectedId===destinationId"),"No vincular Vista previa a un Programa distinto al inspeccionado")
 assert.ok(shell.includes('send.onclick=sendToQuickTargets'),"Acción de barra no utiliza mismo destino")
 assert.ok(shell.includes('bind("btnBridgeQuickPlay",project)'),"No modificar el control Quick Play")
});
test("Multimedia sincronizada realiza una única emisión atómica y audio de primaria",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const helpers=read("engine/src/frontend/components/helpers/output.ts")
 const fn=shell.split("async function sendPreparedToGroup()")[1].split("function publishPreparedMedia()")[0]
 assert.ok(fn.includes('sendToJAOutputs("background",{'),"Debe usar el motor nativo multipantalla")
 assert.ok(fn.includes('},targets,{replaceScripture:true,requireAll:true})'),"La emisión debe ser atómica y sustituir solo pasajes de destinos elegidos")
 assert.ok(fn.includes('muted:!targets.includes(mainId)'),"No activar audio fuera de la principal")
 assert.ok(fn.includes("await VideoPlayer.stop(session.path,id)"),"Un vídeo ya activo debe reiniciarse en sesión compartida")
 assert.ok(fn.includes("!targets.every(id=>live.includes(id))"),"Revalidar monitor tras detener sesión anterior")
 assert.ok(fn.includes("mediaPath!==prepared"),"No proyectar una selección cambiada mientras se prepara")
 assert.ok(helpers.includes("options.requireAll && valid.length!==requested.length"),"El router puede enviar parcialmente a un grupo inválido")
 const video=read("engine/src/frontend/components/media/video/videoPlayer.ts")
 assert.ok(video.includes("linkedOutputIds: linkedOutputIds || []"),"La sesión de VideoPlayer debe ser compartida")
 assert.ok(video.includes("if (jaPrimary && outputId !== jaPrimary) return true"),"Las salidas secundarias deben seguir silenciadas")
});
test("El mismo grupo puede recibir Biblia sin alterar destinos no marcados",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const fn=shell.split("async function sendPreparedToGroup()")[1].split("function publishPreparedMedia()")[0]
 assert.ok(fn.includes("await sendScriptureToJAOutputs(targets)"),"La Biblia debe usar el mismo grupo de destinos")
 assert.ok(fn.includes("biblePreviewReady"),"No emitir Biblia antes de preparar vista previa")
 assert.ok(!fn.includes("sendScriptureToJAOutputs(available)"),"No emitir Biblia a todas por omisión")
});

test("Biblia: flechas y botones Anterior/Siguiente controlan Preview y seguimiento nativo en salidas en vivo",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const scripture=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 assert.ok(shell.includes('getLiveScriptureOutputIds, refreshLiveScripture'),"Navegación debe usar seguimiento nativo")
 assert.ok(shell.includes('previous.className="ja-bible-prev"') && shell.includes('next.className="ja-bible-next"'),"Faltan controles visibles")
 assert.ok(shell.includes('previous.onclick=()=>enqueueBibleNavigation(true)'))
 assert.ok(shell.includes('next.onclick=()=>enqueueBibleNavigation(false)'))
 assert.ok(shell.includes('enqueueBibleNavigation(e.key === "ArrowLeft")'),"Flechas deben usar el mismo controlador")
 assert.ok(shell.includes('let bibleFollowEnabled = false'),"El seguimiento no debe arrancar sin publicar")
 assert.ok(shell.includes('if(confirmed) armBibleFollow(targets,before)'),"Seguir al grupo solo tras proyectar")
 assert.ok(shell.includes('else armBibleFollow([destinationId],version)'),"Seguir a salida individual solo tras proyectar")
 assert.ok(shell.includes('const draft=await prepareGeminiScriptureDraft()'),"Componer Preview antes de publicar siguiente versículo")
 assert.ok(shell.includes('await refreshLiveScripture()'),"La flecha debe actualizar Programa cuando esté siguiendo")
 assert.ok(shell.includes('bibleFollowGroupStillLive() && !get(outLocked)'),"Nunca actualizar Programa sin grupo real y desbloqueado")
 assert.ok(shell.includes('bibleFollowTargets.every(id=>actual.includes(id))'),"Navegar solo grupo original aún activo")
 assert.ok(shell.includes('bibleFollowEnabled=false') && shell.includes('versions.onchange=()=>'),"Cambiar traducción no debe enviar por accidente")
 assert.ok(shell.includes('bibleNavigationQueue.length>=8'),"Evitar ráfagas que saturen el motor")
 assert.ok(scripture.includes('export async function refreshLiveScripture()'),"No reinventar proyección de Biblia")
});

test("Biblia: edición de destinos o referencia en vuelo no puede armar una sesión antigua",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('if(syncedTargetIds.size===1) inspectOutput([...syncedTargetIds][0])'),"Casillas futuras no deben apagar seguimiento")
 assert.ok(!shell.includes('if(mode==="biblia" && bibleFollowEnabled)'),"Marcar destinos no debe revocar control")
 assert.ok(shell.includes('referenceSent===JSON.stringify(get(activeScripture).reference||null)'),"Control de referencia grupal obsoleto")
 assert.ok(shell.includes('JSON.stringify(get(outputs)[id]?.out?.slide?.scriptureReference||null)===referenceSent'),"Grupo solo se arma si su texto enviado coincide")
 assert.ok(shell.includes('JSON.stringify(result?.scriptureReference||null)!==referenceSent'),"Salida individual no debe armar referencia antigua")
});

test("Biblia: control recuperable por pantalla y grupo de proyección",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const nav=read("engine/src/frontend/components/drawer/bible/Scripture.svelte")
 const scripture=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 const recovery=shell.split("async function restoreBibleControlForOutput(id: string)")[1].split("function rebuildOutputs()")[0]
 assert.ok(shell.includes("card.onclick = () => inspectOutput(id)"),"La tarjeta controla su salida")
 assert.ok(recovery.includes("jaControlledOutputId.set(id)"),"Vincular destino nativo de navegación")
 assert.ok(recovery.includes("scriptureView?.restoreGeminiPreparedReference"),"Recuperar selección de la salida")
 assert.ok(recovery.includes("getLiveScriptureOutputIds()"),"Usar grupo nativo")
 assert.ok(recovery.includes("const sameGroup="),"Respetar seguimiento desactivado")
 assert.ok(recovery.includes("generation!==bibleControlGeneration"),"Cancelar recuperación obsoleta")
 const method=nav.split("export async function restoreGeminiPreparedReference(")[1].split("// API explícita")[0]
 assert.ok(method.includes("await openBook(reference.book"),"Restaurar libro capítulo y versículo")
 assert.ok(!method.includes("refreshLiveScripture(")&&!method.includes("sendScriptureToJAOutputs("),"No proyectar al recuperar")
 assert.ok(scripture.includes("followed.navigationGroup === owner.navigationGroup"),"Envíos independientes conservan su grupo")
});
test("Biblia: vista superior sincronizada con inferior y cancelación de flechas obsoletas",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('button.className="ja-bible-view"')&&shell.includes("button.dataset.view=which"))
 assert.ok(shell.includes("const uBibleMode = scriptureMode.subscribe("))
 assert.ok(shell.includes("updateBibleViewButtons()"))
 assert.ok(shell.includes("routeGeneration!==bibleControlGeneration"))
 assert.ok(shell.includes("bibleControlRestoring"))
});

test("Biblia: editor real aplica el mismo estilo en Vista previa, Programa y navegación",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const editor=read("engine/src/frontend/components/ja/JaGeminiBibleEditor.svelte")
 const bible=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 const renderer=read("engine/src/frontend/components/output/Output.svelte")
 const output=read("engine/src/frontend/components/helpers/output.ts")
 const model=read("engine/src/frontend/utils/jaBibleAppearance.ts")
 const schema=read("engine/src/types/Show.ts")
 assert.ok(shell.includes('editorButton.textContent="✎ Editar apariencia"'),"Editor no visible en Biblia")
 assert.ok(shell.includes("<JaGeminiBibleEditor outputId={selectedId}"),"Editor no recibe destino inspeccionado")
 assert.ok(shell.includes("loadJABibleAppearances()"),"No se hidratan estilos guardados")
 assert.ok(shell.includes("jaBibleAppearances.subscribe"),"Los cambios de edición no actualizan Vista previa")
 assert.ok(shell.includes("prepareGeminiScriptureDraft(selectedId)"),"Preview usa un estilo global incorrecto")
 assert.ok(editor.includes('setJABibleAppearance(outputId'),"Editor no guarda estilos por pantalla")
 for(const field of ["fontFamily","fontSize","fontWeight","textColor","textAlign","verticalAlign","shadow","backgroundMode","backgroundColor","backgroundPath"])
    assert.ok(editor.includes(field),"Falta opción visible "+field)
 assert.ok(model.includes("localStorage.setItem(JA_BIBLE_APPEARANCE_KEY"),"Sin persistencia local por salida")
 assert.ok(schema.includes("jaBibleAppearance?: JABibleAppearance"),"No se transporta estilo dentro de diapositiva")
 assert.ok(output.includes("applyJABibleAppearanceToItems(boundItems,outSlide.jaBibleAppearance)"),"Render nativo ignora estilos")
 assert.ok(bible.includes('jaBibleAppearance: appearance'),"No hay apariencia en la diapositiva proyectada")
 assert.ok(renderer.includes('jaBibleAppearance = slide?.id==="temp"'),"No se compone fondo personalizable")
 assert.ok(bible.includes("const appearance = getJABibleAppearance(outputIds.length>1 ? mainOutput.id : outputIds[0])"),"Grupo no hereda estilo principal")
 assert.ok(bible.includes("copyJABibleAppearanceToTargets(mainOutput.id,outputIds)"),"Estilo grupal no se conserva")
 assert.ok(bible.includes('if(appearance?.backgroundMode==="image")mediaStyle.fit="cover"'),"Fondo de imagen no llena área")
 assert.ok(!model.includes("templates.update("),"Editor nunca debe mutar plantillas globales")
});
test("Biblia: aplicar estilo en vivo no modifica pasajes ajenos ni envía una referencia distinta",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const p=shell.split("async function applyBibleStyleToProgram()")[1].split("function updateBibleUI()")[0]
 assert.ok(p.includes("getLiveScriptureOutputIds()"),"Debe usar grupo nativo seleccionado")
 assert.ok(p.includes('live.includes(selectedId)'),"No editar salida ajena")
 assert.ok(p.includes("scriptureReference"),"Confirmar que el versículo sigue proyectado")
 assert.ok(p.includes("biblePreviewReady"),"No enviar antes de renderizar")
 assert.ok(p.includes("await refreshLiveScripture()"),"Aplicar debe usar proyección FreeShow existente")
 assert.ok(!p.includes("sendToJAOutputs("),"No enviar una nueva diapositiva a un destino implícito")
});

test("Biblia: editar un solo ajuste conserva el resto de la plantilla original",()=>{
 const model=read("engine/src/frontend/utils/jaBibleAppearance.ts")
 const bible=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 const output=read("engine/src/frontend/components/output/Output.svelte")
 assert.ok(model.includes("enabledFields: string[]"),"Registrar solo propiedades cambiadas")
 assert.ok(model.includes("enabled.has(\"fontSize\")"),"Tamaño debe ser un override opcional")
 assert.ok(model.includes('textFit:enabled.has("fontSize")'),"No alterar auto ajuste al cambiar fondo")
 assert.ok(model.includes("hasJABibleBackgroundOverride"),"Diferenciar fondo no editado de personalizado")
 assert.ok(bible.includes("hasJABibleBackgroundOverride(appearance)"),"No borrar fondo de plantilla al editar otra propiedad")
 assert.ok(output.includes("jaBibleBackgroundOverride"),"No ocultar fondo de plantilla cuando solo se cambia tipografía")
 assert.ok(model.includes("if(changed){jaBibleAppearances.set(next);persist()}"),"No redibujar Preview innecesariamente al navegar grupo")
});

test("Biblia: editor preserva referencia, traducción y tamaño original de títulos",()=>{
 const model=read("engine/src/frontend/utils/jaBibleAppearance.ts")
 assert.ok(model.includes("sourceDynamicKey"),"Identificar texto bíblico real")
 assert.ok(model.includes('const hasVerseKeys=items.some('),"Distinguir cuerpo de versículos")
 assert.ok(model.includes("if(hasVerseKeys && !hasVerses)return item"),"No tocar marcos de título o referencia")
 assert.ok(model.includes("verseKey(segment.sourceDynamicKey)"),"No cambiar tamaño de la referencia")
 assert.ok(model.includes("const enabledFields=[...new Set("),"No duplicar cambios al arrastrar el tamaño")
});

test("Biblia: editor bloquea navegación accidental mientras está abierto",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(shell.includes('settingsOpen || bibleEditorOpen || bibleControlRestoring'),"Botones no deben navegar al editar")
 assert.ok(shell.includes('settingsOpen || bibleEditorOpen || playlistOpen || !["ArrowLeft"'),"Atajos no deben navegar al editar Biblia o playlists")
});

test("Biblia: opacidad del rectángulo editada por pantalla, sin transparencia en letras",()=>{
 const model=read("engine/src/frontend/utils/jaBibleAppearance.ts")
 const editor=read("engine/src/frontend/components/ja/JaGeminiBibleEditor.svelte")
 const scripture=read("engine/src/frontend/components/drawer/bible/scripture.ts")
 const renderer=read("engine/src/frontend/components/helpers/output.ts")
 assert.ok(model.includes("lineBackgroundOpacity: number"),"Guardar la opacidad como parte de la configuración por salida")
 assert.ok(model.includes('lineBackgroundOpacity:clampPercent(v.lineBackgroundOpacity'),"Normalizar 0..100 incluso tras reiniciar")
 assert.ok(model.includes('"lineBackgroundOpacity","backgroundMode"'),"Registrar un cambio aislado")
 assert.ok(model.includes('enabled.has("lineBackgroundOpacity")'),"No modificar plantillas existentes sin editar el control")
 assert.ok(model.includes('withVerseBackdropOpacity(styled,a.lineBackgroundOpacity,verseKey,hasVerseKeys)'),"Aplicar en los items de la diapositiva nativa")
 assert.ok(model.includes("bibleBackdropColor(existingLineBg,percent)"),"Respetar fondos lineBg de FreeShow")
 assert.ok(model.includes("changeCssBackdrop(item.style"),"Respetar rectángulo existente del item")
 assert.ok(model.includes("changeCssBackdrop(line.align"),"Respetar fondo existente de la línea")
 assert.ok(model.includes("changeCssBackdrop(part.style"),"Respetar fondo de segmento")
 assert.ok(!model.includes("opacity:${alpha}"),"No cambiar la opacidad del elemento completo")
 assert.ok(editor.includes('aria-label="Opacidad del rectángulo detrás de los versículos"'),"Control visible")
 assert.ok(editor.includes('setStyle("lineBackgroundOpacity",Number(e.currentTarget.value))'),"Control conectado al guardado local por salida")
 assert.ok(editor.includes('min="0" max="100" step="1"'),"Slider permite 0 y 100")
 assert.ok(model.includes("copyJABibleAppearanceToTargets(sourceId:string,targets:string[])"),"Sincronización reutiliza estilo completo de Primario")
 assert.ok(scripture.includes("jaBibleAppearance: appearance"),"Proyección lleva los ajustes a cada versículo")
 assert.ok(renderer.includes("applyJABibleAppearanceToItems(boundItems,outSlide.jaBibleAppearance)"),"Programa usa compositor FreeShow")
});

test("P3: restaurar tarjetas originales sin recorte de 160 y conservar el catálogo completo",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const css=read("engine/public/ja-gemini-layout.css")
 const helper=read("engine/src/frontend/utils/jaGeminiLibrary.ts")
 const append=s.split("function appendLibraryCards()")[1].split("function onLibraryScroll(")[0]
 assert.ok(s.includes("const LIBRARY_FIRST_BATCH = 160"),"Mantener la carga inicial original y sus miniaturas")
 assert.ok(s.includes("const LIBRARY_NEXT_BATCH = 80"),"Añadir nuevos elementos de forma progresiva")
 assert.ok(append.includes("libraryFiles.slice(libraryRendered,next)"),"La lista avanza más allá del video 160")
 assert.ok(append.includes('item.className="ja-media-card p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"'),"Mantener clases originales de las tarjetas")
 assert.ok(append.includes('visual.className="aspect-video rounded-md bg-[#06132a] flex items-center justify-center text-sky-300 overflow-hidden"'),"Conservar la altura 16:9 y el contenedor de miniatura anterior")
 assert.ok(append.includes('label.className="text-xs text-slate-200 truncate mt-2"'),"Conservar las etiquetas originales")
 assert.ok(append.includes("showNativeThumbnail(visual,file)"),"Conservar decodificación de miniaturas real y diferida")
 assert.ok(append.includes("area.append(item)"),"Insertar tarjetas existentes sin rehacer el grid al hacer scroll")
 assert.ok(append.includes("more.onclick=appendLibraryCards"),"Dejar acceso manual a los videos restantes")
 assert.ok(s.includes("grid.addEventListener(\"scroll\",listener,{passive:true})"),"Continuar cargando dentro de la biblioteca")
 assert.ok(s.includes("geminiHymnSearch(files,searchInput?.value||\"\")"),"Buscar el total de himnos")
 assert.ok(helper.includes("export function geminiHymnSearch"),"Mantener búsqueda por número completo")
 assert.ok(!css.includes(".ja-library-item"),"No aplicar el CSS de tarjetas colapsadas")
 assert.ok(!s.includes('className="ja-media-card ja-library-item"'),"No cambiar a tarjetas que no respetan los estilos originales")
 assert.ok(!s.includes("shown.slice(0, 160)"),"No mantener el corte fijo en el catálogo")
 assert.ok(!append.includes("setOutput(") && !append.includes("sendToJAOutputs("),"Cargar tarjetas no debe proyectar")
});

test("Himnario: coincidencias parciales por número y palabras sin alterar tarjetas",()=>{
 const h=read("engine/src/frontend/utils/jaGeminiLibrary.ts")
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const fn=h.split("export function geminiHymnSearch(")[1]
 assert.ok(!fn.includes("const exact="),"No usar coincidencia numérica exclusiva")
 assert.ok(fn.includes("number.startsWith(needle)")&&fn.includes("number.includes(needle)"),"00 debe mostrar 001,002,003 y demás coincidencias")
 assert.ok(fn.includes("Number(number)===Number(needle)"),"Priorizar número exacto con ceros iniciales")
 assert.ok(fn.includes("terms.every(term=>title.includes(term))"),"Buscar por fragmentos separados del título")
 assert.ok(fn.includes('normalize("NFD")'),"No distinguir tildes ni mayúsculas")
 assert.ok(fn.includes("ranked.sort((a,b)=>a.score-b.score||a.index-b.index)"),"Ordenar sin omitir resultados")
 assert.ok(fn.includes('items.filter(item=>item.kind==="video")'),"Solo Himnario")
 assert.ok(s.includes('geminiHymnSearch(files,searchInput?.value||"")'),"Buscar en todos los archivos")
 assert.ok(s.includes('hymnSearch?.addEventListener("input", renderLibrary)'),"Filtrar conforme se escribe")
 assert.ok(s.includes('visual.className="aspect-video rounded-md bg-[#06132a] flex items-center justify-center text-sky-300 overflow-hidden"'),"Respetar miniaturas originales")
 assert.ok(!fn.includes("setOutput(") && !fn.includes("sendToJAOutputs("),"Buscar no puede proyectar")
});

test("Multimedia P3: videos, imágenes y audio se gestionan por rutas reales aisladas",()=>{
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const renderer=read("engine/src/frontend/components/output/layers/Media.svelte")
 const background=read("engine/src/frontend/components/output/layers/BackgroundMedia.svelte")
 const audio=read("engine/src/frontend/components/ja/JaGeminiAudioControls.svelte")
 const css=read("engine/public/ja-gemini-layout.css")
 const extensions=read("engine/src/frontend/values/extensions.ts")
 const onlyAudio=shell.split("async function publishPreparedAudio(path:string,targets:string[])")[1].split("async function joinAlreadyPlayingPrimary(")[0]
 assert.ok(shell.includes('import { AudioPlayer } from "../../audio/audioPlayer"'),"Debe usar motor de audio FreeShow")
 assert.ok(onlyAudio.includes("AudioPlayer.start(path,{name:fileName(path)},{playMultiple:true,startPaused:true})"),"No borrar sesiones ajenas al iniciar audio")
 assert.ok(onlyAudio.includes("jaAudioPath")&&onlyAudio.includes("AudioPlayer.stop(previous)"),"Solo reemplazar pista de JA")
 assert.ok(onlyAudio.includes('targets.includes(primary)'),"No habilitar audio fuera de pantalla principal")
 assert.ok(onlyAudio.includes('targetSnapshot!==markedGroupTargets().join("|")'),"Prevenir reproducción tras cambios de destinos")
 assert.ok(onlyAudio.includes("AudioPlayer.getPlaying(path)"),"Confirmar sesión nativa antes de indicar éxito")
 assert.ok(!onlyAudio.includes("setOutput(")&&!onlyAudio.includes("sendToJAOutputs("),"Audio no debe borrar imágenes ni enviar un fondo no soportado")
 assert.ok(shell.includes('if(kind==="audio"){void publishPreparedAudio(mediaPath,targets);return}'),"Envío grupal de audio separado del video")
 assert.ok(shell.includes('if(kind==="audio"){void publishPreparedAudio(mediaPath,[destinationId]);return}'),"Envío individual de audio separado del video")
 assert.ok(background.includes('if (type === "video" || type === "image") type = "media"'),"Motor solo muestra imágenes y videos")
 assert.ok(renderer.includes('{#if type === "video"}')&&renderer.includes('{:else if type === "image"}'),"Conservar renderizador nativo")
 for(const ext of ["mp4","webm","jpg","png","mp3","wav","ogg","flac","m4a"])assert.ok(extensions.includes('"'+ext+'"'),"Extensión no indexada: "+ext)
 assert.ok(shell.includes('poster.className="ja-native-audio-preview"'),"Vista previa debe mostrar audio de forma comprensible")
 assert.ok(shell.includes('img.onerror=()=>{if(img.isConnected)'),"Imagen inválida no se debe reportar como éxito")
 assert.ok(audio.includes("AudioPlayer.pause(path)")&&audio.includes("AudioPlayer.play(path)")&&audio.includes("AudioPlayer.stop(path)"),"Controles de audio reales")
 assert.ok(audio.includes("AudioPlayer.setTime(path"),"Seek de audio real")
 assert.ok(audio.includes("AudioAnalyser.setSourceVolume(path"),"Control de ganancia del audio nativo")
 assert.ok(css.includes(".ja-native-audio-panel")&&css.includes(".ja-native-audio-preview"),"Estilos de audio sin cambiar tarjetas")
 assert.ok(shell.includes('item.className="ja-media-card p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"'),"Conservar miniaturas aprobadas")
});

test("Multimedia: solo una pestaña Videos/Imágenes/Audio queda resaltada",()=>{
 const source=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const show=source.split("function showCounts()")[1].split("function renderToolbar()")[0]
 const filter=source.split("function connectMediaTypeFilters()")[1].split("function installFolderPicker()")[0]
 assert.ok(show.includes('const active = mode === "multimedia" && typeFilter === type'),"La selección debe derivar del único filtro actual")
 assert.ok(show.includes('btn.setAttribute("aria-pressed", String(active))'),"Pestaña accesible seleccionada")
 assert.ok(show.includes('btn.classList.toggle("ja-media-filter-active", active)'),"Mantener clase visual sincronizada")
 assert.ok(show.includes('btn.style.background = active ? "#2169a5" : "#101e41"'),"Desactivar explícitamente color Y degradado del diseño original")
 assert.ok(show.includes('btn.style.borderColor = active ? "#4cd1fd" : "#30466f"'),"Desactivar borde de la pestaña anterior")
 assert.ok(show.includes('btn.style.boxShadow = active ? "inset 0 0 0 1px rgba(76,209,253,.18)" : "none"'),"Quitar halo del filtro anterior")
 assert.ok(!show.includes('typeFilter === type ? "#2169a5" : ""'),"No volver a dejar que Tailwind conserve azul al desmarcar")
 assert.ok(filter.includes('const handler = () => { typeFilter = type; renderLibrary() }'),"Cada clic actualiza el estado y catálogo")
 assert.ok(source.includes('typeFilter: GeminiMediaType | "all" = "video"'),"Conservar Videos como pestaña inicial")
 assert.ok(source.includes('item.className="ja-media-card p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"'),"No rediseñar miniaturas")
});

test("P3 video: seleccionar pantalla recupera Preview sin modificar su video en Programa",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const inspect=s.split("function inspectOutput(id: string)")[1].split("async function restoreBibleControlForOutput")[0]
 assert.ok(s.includes("card.onclick = () => inspectOutput(id)"),"La tarjeta inspecciona la salida real")
 assert.ok(inspect.includes('const path=bg?.path || ""'),"Leer archivo real de la pantalla")
 assert.ok(inspect.includes('kind!=="video" && kind!=="image"'),"No confundir vídeos con Biblia u otras capas")
 assert.ok(inspect.includes("prepare(path)"),"Recuperar vídeo o imagen en Vista previa")
 assert.ok(inspect.includes("followProgram=true"),"Reenganchar Vista previa al video en vivo")
 assert.ok(!inspect.includes("setOutput(")&&!inspect.includes("VideoPlayer.seekTo(")&&!inspect.includes("VideoPlayer.stop("),"Inspeccionar no cambia Programa ni reloj")
});
test("P3 video: añadir nuevos destinos al reloj de Primario sin reiniciarlo",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const player=read("engine/src/frontend/components/media/video/videoPlayer.ts")
 const out=read("engine/src/frontend/components/helpers/output.ts")
 const join=s.split("async function joinAlreadyPlayingPrimary(mediaPath:string,targets:string[])")[1].split("function updateJAPlaylist(")[0]
 const attach=player.split("static attachOutputsToLiveSession(")[1].split("static updateProperties(")[0]
 assert.ok(join.includes('localStorage.getItem("ja-main-projector")'),"Confirmar fuente principal")
 assert.ok(join.includes("newTargets=targets.filter(id=>!source.linkedOutputIds.includes(id))"),"Solo las pantallas nuevas reciben contenido")
 assert.ok(join.includes("await VideoPlayer.stop(session.path,id)"),"Liberar solamente el reloj anterior del nuevo destino")
 assert.ok(join.includes("VideoPlayer.attachOutputsToLiveSession(sourcePath,mainId,newTargets)"),"Compartir reloj nativo exacto")
 assert.ok(join.includes("startAt:currentTime,jaReuseClockFrom:mainId"),"Incorporar los nuevos monitores en el tiempo actual")
 assert.ok(join.includes("targetSnapshot===markedGroupTargets().join"),"No usar selección obsoleta")
 assert.ok(join.includes("get(playingVideos).includes(source)"),"Evitar reloj de un archivo sustituido")
 assert.ok(!join.includes("VideoPlayer.stop(sourcePath,mainId)"),"Nunca detener reloj origen")
 assert.ok(!join.includes("VideoPlayer.seekTo("), "No rebobinar origen")
 assert.ok(!join.includes("startAt:0"),"No volver al comienzo")
 assert.ok(attach.includes("source.linkedOutputIds=[...new Set("),"Reutilizar exactamente el objeto sesión")
 assert.ok(attach.includes("this.initSyncClock()"),"Replicar tiempo y pausa para los nuevos outputs")
 assert.ok(!attach.includes("this.start(")&&!attach.includes("audio.currentTime="),"Nunca crear reloj nuevo ni mover fuente")
 assert.ok(out.includes('if(data.jaReuseClockFrom && getMediaType(getExtension(newPath))==="video")'),"FreeShow no debe iniciar un audio nuevo")
 assert.ok(out.includes('if(!live || !outs.every(id=>live.linkedOutputIds.includes(id)))'),"Verificar sesión antes de omitir audio nuevo")
 assert.ok(s.includes('if(kind==="video" && await joinAlreadyPlayingPrimary(mediaPath,targets))return'),"Enviar grupo debe probar primero reconexión viva")
 assert.ok(s.includes('void joinAlreadyPlayingPrimary(mediaPath,[destinationId])'),"Enviar a un destino también debe poder recuperar reloj")
});

test("P3: sincronización al agregar pantalla funciona también con video pausado",()=>{
 const model=read("engine/src/types/Show.ts")
 const media=read("engine/src/frontend/components/output/layers/Media.svelte")
 const video=read("engine/src/frontend/components/media/Video.svelte")
 const render=video.split("function loaded()")[1].split("onMount(",1)[0]
 assert.ok(model.includes("jaReuseClockFrom?: string"),"La diapositiva debe transportar el marcador de reloj existente")
 assert.ok(media.includes("joinExistingClock={!!data.jaReuseClockFrom}"),"Solo los videos nuevos del grupo usan la preparación del reloj")
 assert.ok(video.includes("export let joinExistingClock = false"),"No cambiar video normal")
 assert.ok(video.includes("const stateTime = $playingVideoState[playingKey]?.currentTime"),"Leer fotograma actual incluso en pausa")
 assert.ok(video.includes("if (video && playingTime>0) video.currentTime = playingTime"),"Al montar mostrar fotograma que ya está en Primario")
 assert.ok(video.includes("if(joinExistingClock)startAt=0"),"No saltar al tiempo anterior cuando se reproduce")
 assert.ok(!render.includes("VideoPlayer.play(")&&!render.includes("VideoPlayer.stop("),"Montar otra pantalla no afecta el reloj origen")
});

test("P5: playlists tipadas para audio, video, himnos y YouTube con persistencia",()=>{
 const m=read("engine/src/frontend/utils/jaGeminiPlaylists.ts")
 const p=read("engine/src/frontend/components/ja/JaGeminiPlaylistPanel.svelte")
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 assert.ok(m.includes('JA_PLAYLISTS_KEY = "ja-gemini-playlists-v1"'),"Persistencia separada de FreeShow")
 assert.ok(m.includes('source: JAPlaylistSource')&&m.includes('audioOnly: boolean'),"Tipo de origen y modo por entrada")
 assert.ok(m.includes('geminiFileType(path)')&&m.includes('jaYoutubeId(value:string)'),"Validación de archivos y enlaces")
 assert.ok(m.includes('host==="youtu.be"')&&m.includes('host==="youtube.com"'),"Solo dominios de YouTube")
 assert.ok(m.includes('e.kind==="youtube"')&&m.includes('!e.audioOnly'),"No separar audio de YouTube")
 assert.ok(m.includes('localStorage.setItem(JA_PLAYLISTS_KEY'),"Guardar listas sin modificar archivos")
 assert.ok(m.includes('JA_MAX_ENTRIES = 200'),"Límite de seguridad")
 assert.ok(p.includes("Añadir archivo preparado")&&p.includes("Pegar URL de YouTube"),"Mezcla de archivos locales y YouTube")
 assert.ok(p.includes('action("move"')&&p.includes('action("autoNext"')&&p.includes('action("playMode"'),"Orden, avance automático y modos")
 assert.ok(s.includes("jaPlaylists.set(jaReadPlaylists())"),"Restaurar al arrancar")
 assert.ok(s.includes('else if(id==="listas")'),"Acceso a listas desde la navegación")
 assert.ok(s.includes('playlistBtn.textContent="☰ Listas"'),"Acceso sin alterar tarjetas")
 assert.ok(s.includes("<JaGeminiPlaylistPanel"),"Panel montado en Gemini")
});
test("P5: Solo audio de MP4 e himnos nunca borra fondo o Biblia",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const audio=s.split("async function playJAOnlySound(path:string,targets:string[],valid:()=>boolean)")[1].split("function jaOnlyAudioSend(")[0]
 assert.ok(audio.includes('kind!=="audio" && kind!=="video"'),"Aceptar pista de vídeo local")
 assert.ok(audio.includes('AudioPlayer.start(path,{name:fileName(path)},{playMultiple:true,startPaused:true})'),"Motor nativo de sonido")
 assert.ok(audio.includes('targets.includes(primary)'),"Una sola ruta de sonido Primario")
 assert.ok(audio.includes("liveVideo"),"Prevenir duplicar sonido de un video activo")
 assert.ok(audio.includes("jaAudioPath!==path"),"No interrumpir otro reproductor")
 assert.ok(audio.includes("showJAOwnedAudio(path)"),"Controles de audio reales")
 assert.ok(!audio.includes("setOutput(")&&!audio.includes("sendToJAOutputs(")&&!audio.includes("clearSlide(")&&!audio.includes("clearBackground("),"Solo audio no altera imagen o texto")
 assert.ok(s.includes('audioToggle.className="ja-target ja-only-audio-toggle'),"Modo rápido visible")
 assert.ok(s.includes("if(jaOnlyAudioSend(selected))return"),"Envío rápido respeta el modo")
});
test("P5: avanzar mixto usa el motor existente y YouTube visible",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const native=read("engine/src/frontend/components/output/layers/BackgroundMedia.svelte")
 const run=s.split("async function playJAPlaylistIndex(id:string,index:number)")[1].split("function advanceJAPlaylist(")[0]
 assert.ok(run.includes('item.kind==="audio"||item.audioOnly'),"Lista admite pistas locales")
 assert.ok(run.includes("playJAOnlySound(item.path,targets"),"Reproduce audio sin video")
 assert.ok(run.includes('playerVideos.update(data=>({...data,[youtubeId]'),"Registro nativo YouTube")
 assert.ok(run.includes('id:youtubeId,type:"player",loop:false'),"No reproducción oculta en YouTube")
 assert.ok(native.includes('<Player {outputId} {id} on:loaded />'),"YouTube usa el iframe de FreeShow")
 assert.ok(run.includes('type:"video",loop:item.loopVideo===true,muted:false,startAt:0'),"Video local con bucle por elemento")
 assert.ok(run.includes('sendToJAOutputs("background"'),"Proyección por destinos marcados")
 assert.ok(!run.includes('type:"youtube-audio"'),"No separar audio de YouTube")
 assert.ok(s.includes('playlistMonitor=setInterval(watchJAPlaylist,350)'),"Vigilar fin de sesión")
 assert.ok(s.includes('if(!manual && !list.autoNext)')&&s.includes('jaNextIndex(jaPlaybackMode(list.playMode,list.repeat)'),"Manual y modos repetición")
 assert.ok(s.includes('AudioPlayer.getPlaying(item.path)')&&s.includes('VideoPlayer.getPlaying(key,[primary])'),"Reconocer audio y video real")
});

test("P5: Play nuevo inicia en cero sin perjudicar recuperación de reloj ni atajos bíblicos",()=>{
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const runner=s.split("async function playJAPlaylistIndex(id:string,index:number)")[1].split("function advanceJAPlaylist(")[0]
 const recovery=s.split("async function joinAlreadyPlayingPrimary(mediaPath:string,targets:string[])")[1].split("function updateJAPlaylist(")[0]
 assert.ok(runner.includes("await VideoPlayer.stop(session.path,outputId)"),"Play explicito de una lista inicia desde cero")
 assert.ok(runner.includes('startAt:0'),"No reanudar otro canto por accidente")
 assert.ok(!runner.includes("await joinAlreadyPlayingPrimary("),"Recuperar pantalla y reproducir nueva lista son acciones distintas")
 assert.ok(recovery.includes("VideoPlayer.attachOutputsToLiveSession"),"Recuperar monitor sigue compartiendo el reloj original")
 assert.ok(runner.includes("VideoPlayer.pause(oldPath,primary)"),"Evitar dos audios al cambiar a Solo audio")
 assert.ok(s.includes('if(playlistOpen){e.preventDefault();playlistOpen=false;return}'),"Escape cierra Listas")
 assert.ok(s.includes('settingsOpen || bibleEditorOpen || playlistOpen'),"No navegar versículos mientras se editan listas")
});

test("P5: modos normal, aleatorio, repetir lista/canción y migración existente",()=>{
 const m=read("engine/src/frontend/utils/jaGeminiPlaylists.ts")
 const s=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const p=read("engine/src/frontend/components/ja/JaGeminiPlaylistPanel.svelte")
 assert.ok(m.includes('JA_PLAYBACK_MODES: JAPlaybackMode[] = ["normal","repeat-all","shuffle","repeat-one"]'))
 assert.ok(m.includes('playMode:jaPlaybackMode(v.playMode,v.repeat===true)'),"Importar listas antiguas sin perder repetir lista")
 assert.ok(m.includes('return [start,...order]'),"Aleatorio recorre todos sin repetir")
 assert.ok(m.includes('if(!manual && mode==="repeat-one")'),"Siguiente manual ignora repetir canción")
 assert.ok(s.includes("playlistShufflePosition=next.position"),"Seguir orden aleatorio real")
 assert.ok(s.includes('void playJAPlaylistIndex(list.id,next.index,true)'),"Motor usa índice real")
 assert.ok(s.includes('if(event.type==="togglePause")'),"Pausa nativa")
 assert.ok(p.includes('label:"Normal"')&&p.includes('label:"Aleatorio"'))
 assert.ok(p.includes('label:"Repetir lista"')&&p.includes('label:"Repetir canción"'))
 assert.ok(p.includes('aria-pressed={current.playMode===playbackMode.id}'),"Indicador activo")
 assert.ok(p.includes('action("loopVideo"'),"Bucle video distinto al modo lista")
});

test("P5: Biblioteca integrada real y agregado rápido sin modificar reproducción",()=>{
 const panel=read("engine/src/frontend/components/ja/JaGeminiPlaylistPanel.svelte")
 const shell=read("engine/src/frontend/components/ja/JaGeminiShell.svelte")
 const model=read("engine/src/frontend/utils/jaGeminiPlaylists.ts")
 assert.ok(panel.includes('role="dialog"')&&panel.includes('aria-modal="false"'),"Panel integrado no modal de pantalla completa")
 assert.ok(panel.includes('class="dock-library"')&&panel.includes('class="dock-queue"'),"Biblioteca y cola simultáneas")
 assert.ok(panel.includes('matches.slice(0,shown)'),"No cargar 613 canciones en el DOM")
 assert.ok(panel.includes('on:input={()=>shown=60}'),"Búsqueda en toda la biblioteca")
 assert.ok(panel.includes('on:click={()=>addOne(file)}'),"Añadir una canción sin preparar")
 assert.ok(panel.includes('on:click={addChecked}'),"Añadir varios archivos")
 assert.ok(panel.includes('on:dragstart={e=>onLibraryDrag(e,file)}')&&panel.includes('on:drop={e=>onQueueDrop(e,index)}'),"Arrastrar de biblioteca y reordenar")
 assert.ok(shell.includes('libraryFiles={playlistLibraryFiles}'),"Usar índices de archivos reales")
 assert.ok(shell.includes('geminiLocalFiles($hymnVideos as FileFolder[],[])'),"Himnario completo disponible desde cualquier módulo")
 assert.ok(shell.includes('if(event.type==="addFiles")'),"Controlador de agregado directo")
 assert.ok(shell.includes('if(event.type==="reorder")'),"Mover posiciones de cola")
 assert.ok(model.includes("export function jaMoveEntryTo"),"Ordenar entradas sin cambiar IDs")
 assert.ok(panel.includes("Pegar URL de YouTube"),"Conservar enlaces de YouTube")
 assert.ok(!panel.includes("ja-media-card"),"No alterar las tarjetas originales del catálogo")
});
