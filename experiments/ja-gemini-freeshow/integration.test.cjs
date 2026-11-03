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
 assert.ok(shell.includes('selectedId=[...syncedTargetIds][0]'),"No se conserva la selección individual del operador")
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
