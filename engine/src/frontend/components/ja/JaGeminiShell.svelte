<script lang="ts">
    // Puente real Gemini -> servicios FreeShow. No ejecuta los scripts del mock.
    import { onMount } from "svelte"
    import { uid } from "uid"
    import type { FileFolder } from "../../../types/Main"
    import type { AssetItem } from "../../../types/Effects"
    import { Main } from "../../../types/IPC/Main"
    import { ToMain } from "../../../types/IPC/ToMain"
    import { requestMain, sendMain, receiveToMain, destroyMain } from "../../IPC/main"
    import { geminiCounts, geminiFileType, geminiLocalFiles, geminiSearch, type GeminiFile, type GeminiMediaType } from "../../utils/jaGeminiLibrary"
    import { isPathInJACollection, normalizeJAContentPath } from "../../utils/jaHymnPaths"
    import { hymnVideos, hymnCollectionPaths, hymnSourcePaths, hymnLinks, hymnSourceStatus, linkHymnFolder, unlinkHymnFolder, refreshJAHymnLibrary } from "../../utils/jaHymnLibrary"
    import { registerJAMediaFolders } from "../../utils/jaMediaFolders"
    import { videoExtensions, imageExtensions, audioExtensions } from "../../values/extensions"
    import { queuedHymnThumbnail } from "../../utils/jaHymnThumbnailQueue"
    import { registerJARV1909 } from "../drawer/bible/jaBundledBible"
    import { playScripture, prepareGeminiScriptureDraft } from "../drawer/bible/scripture"
    import Scripture from "../drawer/bible/Scripture.svelte"
    import { get } from "svelte/store"
    import { geminiHtml, geminiBodyClasses } from "./gemini-fragment.generated"
    import { activeScripture, effects, mediaFolders, outputs, outLocked, playingVideos, saved, scriptures, scriptureMode, scriptureSettings, templates, drawerTabsData } from "../../stores"
    import { encodeFilePath, getExtension, getMediaType } from "../helpers/media"
    import { clearBackground, clearSlide } from "../output/clear"
    import { addOutput, setOutput } from "../helpers/output"
    import { OUTPUT } from "../../../types/Channels"
    import { send } from "../../utils/request"
    import { VideoPlayer } from "../media/video/videoPlayer"
    import { videoSync } from "../media/video/videoSync"
    import PreviewOutput from "../output/preview/PreviewOutput.svelte"
    import JaGeminiBiblePreview from "./JaGeminiBiblePreview.svelte"
    import JaGeminiSettings from "./JaGeminiSettings.svelte"

    let host: HTMLDivElement
    let settingsOpen = false
    let settingsStartSection: "general" | "screens" | "libraries" | "playback" | "branding" | "shortcuts" = "general"
    let previewAutoplay = true
    let followProgram = false
    // La fase S0 mantiene solo envío directo: transiciones no validadas se ocultan.
    const JA_BLACK = "ja_gemini_blackout_effect"
    const JA_LOGO = "ja_gemini_logo_effect"
    let activeLogoEffectId = JA_LOGO
    const isJaLogoEffect = (id:string) => id === JA_LOGO || id.startsWith(JA_LOGO+"_")
    let customLogoPath = ""
    let logoScale = 1.35
    let logoPosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" = "center"
    let logoRequestGeneration = 0
    let compactUi = false
    let largeUi = false
    let prepared = ""
    let selectedId = ""
    let mode: "multimedia" | "himnario" | "biblia" = "multimedia"
    let scriptureView: Scripture | null = null
    let scriptureTarget: HTMLElement | null = null
    let activeBibleId = ""
    let screenRenderers: PreviewOutput[] = []
    let screenStructure = ""
    let collection = "Himnario Adventista"
    let typeFilter: GeminiMediaType | "all" = "video"
    let indexedMedia: GeminiFile[] = []
    let selectedMediaPaths: string[] = []
    let addMediaMenu: HTMLElement | null = null
    let expandedTarget: HTMLElement | null = null
    let expandedClose: HTMLButtonElement | null = null
    let scanErrors: string[] = []
    let scanning = false
    let scanGeneration = 0
    let thumbObserver: IntersectionObserver | null = null
    let libraryToolbar: HTMLDivElement | null = null
    const mockNodes: Array<{node: Text; original: string}> = []
    let programRenderer: PreviewOutput | null = null
    let renderedOutput = ""
    let playingPath = ""
    let listeningOutput = ""
    let programMute: HTMLButtonElement | null = null
    let previewLinkButton: HTMLButtonElement | null = null
    let stopVideoState: (() => void) | null = null
    let cleanup: Array<() => void> = []
    let programSeek: HTMLInputElement | null = null
    let programVolume: HTMLInputElement | null = null
    let previewMedia: HTMLMediaElement | null = null
    let biblePreviewRenderer: JaGeminiBiblePreview | null = null
    let biblePreviewTimer: ReturnType<typeof setTimeout> | null = null
    let biblePreviewGeneration = 0
    let biblePreviewReady = false
    let biblePreviewReference = ""
    let timer: ReturnType<typeof setTimeout> | null = null
    let videoState = { paused: true, muted: false, currentTime: 0, duration: 0 }

    const el = (id: string) => host?.querySelector<HTMLElement>("#" + id) || null
    const fileName = (path: string) => path.split(/[\\/]/).pop() || path
    const time = (seconds: number) => {
        const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
    }
    function notice(message: string) {
        const label = el("jaToastText")
        const toast = el("jaToast")
        if (label && toast) {
            label.textContent = message
            toast.classList.remove("hidden")
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => toast.classList.add("hidden"), 4500)
        } else console.info("[JA Gemini]", message)
    }
    function bind(id: string, fn: () => void) {
        const element = el(id)
        if (!element) return
        element.addEventListener("click", fn)
        cleanup.push(() => element.removeEventListener("click", fn))
    }
    function disable(id: string, reason: string) {
        const element = el(id) as HTMLButtonElement | null
        if (!element) return
        element.disabled = true
        element.setAttribute("aria-disabled", "true")
        element.title = reason
    }
    function saveOperatorPreferences() {
        try {
            localStorage.setItem("ja-gemini-preview-autoplay", String(previewAutoplay))
            localStorage.setItem("ja-gemini-compact-ui", String(compactUi))
            localStorage.setItem("ja-gemini-large-ui", String(largeUi))
        } catch (error) { notice("No se pudieron guardar las preferencias de esta consola: " + String(error)) }
    }
    function resetOperatorPreferences() {
        previewAutoplay = true
        compactUi = false
        largeUi = false
        saveOperatorPreferences()
        notice("Preferencias visuales y de Vista previa restauradas. Programa permanece intacto.")
    }
    // Restablecer nunca limpia Programa ni reubica salidas físicas.
    // El botón original restablecía solo la selección (invisible con una salida).

    const logoPositions: Record<string,{x:number;y:number}> = {
        center:{x:0.5,y:0.5},"top-left":{x:0.15,y:0.17},"top-right":{x:0.85,y:0.17},
        "bottom-left":{x:0.15,y:0.83},"bottom-right":{x:0.85,y:0.83}
    }
    function logoEffectItem(): AssetItem {
        const point=logoPositions[logoPosition] || logoPositions.center
        return {type:"asset",path:customLogoPath?encodeFilePath(customLogoPath):"./ja-logo.png",
            size:logoScale,x:point.x,y:point.y}
    }
    function updateLogoEffect() {
        // The canvas renderer caches its Image instance by effect item. Changing
        // settings while active must remount the effect with a different Svelte
        // {#each} key, otherwise the old default logo may stay on screen.
        activeLogoEffectId = JA_LOGO + "_" + uid()
        const nextId=activeLogoEffectId
        effects.update(current=>{
            const next={...current}
            for(const id of Object.keys(next))if(isJaLogoEffect(id))delete next[id]
            next[nextId]={name:"JA · Logotipo",color:null,placeUnderSlide:false,
                style:"width:100%;height:100%;",background:"transparent",opacity:1,items:[logoEffectItem()]}
            return next
        })
        for(const [outputId,out] of Object.entries(get(outputs))){
            const ids=out.out?.effects||[]
            if(!ids.some(isJaLogoEffect))continue
            const remaining=ids.filter(id=>!isJaLogoEffect(id))
            setOutput("effects",[...remaining,nextId],false,outputId)
        }
    }
    function persistLogoSettings() {
        try {
            localStorage.setItem("ja-gemini-logo-path",customLogoPath)
            localStorage.setItem("ja-gemini-logo-size",String(logoScale))
            localStorage.setItem("ja-gemini-logo-position",logoPosition)
        }catch(error){notice("El logo fue ajustado, pero no se guardaron las preferencias: "+String(error))}
    }
    function configureLogoPath(path: string) {
        if (!/\.(png|jpe?g|webp)$/i.test(path) || /^(?:https?:|data:|blob:)/i.test(path)) {
            notice("El efecto Logo admite PNG, JPG y WEBP; el vídeo necesita una capa multimedia independiente.")
            return
        }
        const generation=++logoRequestGeneration
        const image=new Image()
        image.onload=()=>{
            if(generation!==logoRequestGeneration)return
            if(!image.naturalWidth || !image.naturalHeight)
                return notice("El archivo de logo no contiene una imagen válida")
            customLogoPath=path
            updateLogoEffect()
            persistLogoSettings()
            notice("Logo cargado: "+fileName(path)+". Utiliza el botón Logo para mostrarlo u ocultarlo.")
        }
        image.onerror=()=>{if(generation===logoRequestGeneration)notice("No se pudo abrir el logo elegido. Revisa el archivo y vuelve a seleccionarlo.")}
        image.src=encodeFilePath(path)
    }
    function selectLogoImage() {
        sendMain(Main.OPEN_FILE,{id:"ja-gemini-logo-image",channel:"JA_GEMINI_LOGO_IMAGE",
            title:"Elegir logo transparente o imagen",multiple:false,read:false,
            filter:{name:"Imágenes PNG, JPG o WEBP",extensions:["png","jpg","jpeg","webp"]}})
    }
    function resetLogoImage() {
        logoRequestGeneration++
        customLogoPath=""
        logoScale=1.35
        logoPosition="center"
        updateLogoEffect()
        persistLogoSettings()
        notice("Logo predeterminado restaurado. Programa no cambia hasta activar/desactivar Logo.")
    }
    function ensureJAOutputEffects() {
        activeLogoEffectId=JA_LOGO
        effects.update(current => ({
            ...current,
            [JA_BLACK]: {name:"JA · Cortina negra",color:null,placeUnderSlide:false,style:"width:100%;height:100%;",background:"#000000",opacity:1,items:[]},
            [JA_LOGO]: {name:"JA · Logotipo",color:null,placeUnderSlide:false,style:"width:100%;height:100%;",background:"transparent",opacity:1,
                items:[logoEffectItem()]}
        }))
        // Reconcile any JA logo keyed by a prior app session.
        for(const [outputId,out] of Object.entries(get(outputs))){
            const ids=out.out?.effects||[]
            if(ids.some(id=>isJaLogoEffect(id) && id!==activeLogoEffectId))
                setOutput("effects",[...ids.filter(id=>!isJaLogoEffect(id)),activeLogoEffectId],false,outputId)
        }
    }
    function setOperatorEffect(id: string) {
        if (get(outLocked)) return notice("La salida está bloqueada")
        const output = selectedId ? get(outputs)[selectedId] : null
        if (!output?.active || !output.enabled) return notice("Selecciona una salida activa")
        const active = output.out?.effects || []
        const logoRequested = id===JA_LOGO
        const hadEffect = logoRequested ? active.some(isJaLogoEffect) : active.includes(id)
        const next = logoRequested
            ? (hadEffect ? active.filter(effectId=>!isJaLogoEffect(effectId))
                : [...active.filter(effectId=>!isJaLogoEffect(effectId)),activeLogoEffectId])
            : (hadEffect ? active.filter(effectId=>effectId!==id) : [...active,id])
        setOutput("effects",next,false,selectedId)
        const button = el(id===JA_BLACK?"btnBridgeBlack":"btnBridgeLogo")
        button?.setAttribute("aria-pressed",String(!hadEffect))
        notice((id===JA_BLACK?"Cortina negra":"Logo")+(hadEffect?" desactivado":" activado")+" en "+(output.name||selectedId))
    }
    function clearBlackBeforePublishing(outputIds: string[]) {
        const current=get(outputs)
        for(const id of outputIds) {
            const enabledEffects=current[id]?.out?.effects || []
            if(enabledEffects.includes(JA_BLACK))
                setOutput("effects",enabledEffects.filter(effect=>effect!==JA_BLACK),false,id)
        }
    }
    // En esta fase únicamente se publica a UNA salida real de FreeShow.
    // El validador JA de múltiples destinos exige asignación física de monitor
    // y primario persistido; ese requisito NO debe bloquear la salida única
    // que FreeShow ya podía controlar. No usar este método para fan-out.
    function publishPreparedMedia() {
        if(mode==="biblia") {
            const button=el("moduleView_biblia")?.querySelector<HTMLButtonElement>(".ja-bible-project")
            if(button)button.click()
            else notice("Prepara un versículo antes de proyectar")
            return
        }
        if(!prepared)return notice("Selecciona un archivo antes de proyectarlo")
        const available=chooseOutput()
        if(!selectedId || !available.includes(selectedId))
            return notice("Selecciona una salida JA configurada antes de enviar contenido.")
        if(get(outLocked) || !get(outputs)[selectedId]?.active)
            return notice("La salida seleccionada está inactiva o bloqueada.")
        const mediaPath=prepared
        const kind=getMediaType(getExtension(mediaPath))
        // No sobreescribir transiciones globales ni estilos: restaurar exactamente
        // la ruta nativa que sí publicaba archivos antes de la regresión.
        try {
            const previous=get(outputs)[selectedId]
            // Una nueva imagen o vídeo principal REEMPLAZA el pasaje bíblico.
            // No limpiar otras diapositivas ni overlays de otros destinos.
            const scriptureSlide=previous?.out?.slide
            if(scriptureSlide && (scriptureSlide.id==="temp" || scriptureSlide.id==="tempText"))
                clearSlide(true,selectedId)
            clearBlackBeforePublishing([selectedId])
            // Ruta nativa que operaba en la primera prueba física de Windows.
            // El ID explícito impide difundir a otras salidas no configuradas.
            const mainId=localStorage.getItem("ja-main-projector") || (available.length===1?selectedId:"")
            if(available.length>1 && !mainId)
                return notice("Selecciona la salida principal en Configuración JA antes de emitir con varios monitores.")
            // Secondary screens cannot emit duplicated audio by default.
            setOutput("background",{
                path:mediaPath,type:kind,loop:false,muted:available.length>1 && selectedId!==mainId,startAt:0
            },false,selectedId)
            const actual=get(outputs)[selectedId]?.out?.background
            // La actualización del store indica recepción interna, NO que
            // HDMI o spacedesk hayan mostrado correctamente el contenido.
            if(!actual || !actual.path) {
                followProgram=false
                return notice("FreeShow no registró el contenido en Programa. Revisa la salida activa.")
            }
            if(previewMedia && kind==="video"){
                previewMedia.pause()
                try{previewMedia.currentTime=0}catch{}
                previewMedia.muted=true
                followProgram=true
            }else followProgram=false
            updatePreviewProgress()
            notice("Enviado al motor de Programa: "+fileName(mediaPath)+". Confirma la salida física.")
        } catch(error) {
            followProgram=false
            notice("Error al enviar a Programa: "+String(error))
        }
    }
    function toggleFollowProgram() {
        if(!previewMedia || !playingPath || normalizeJAContentPath(prepared)!==normalizeJAContentPath(playingPath))
            return notice("Para vincular, prepara el mismo vídeo que está en Programa")
        followProgram=!followProgram
        if(followProgram) previewMedia.muted=true
        syncLinkedPreview()
        updatePreviewProgress()
        notice(followProgram?"Vista previa sigue a Programa (silenciada)":"Vista previa independiente")
    }
    function isLinkedVideo() {
        return !!(followProgram && previewMedia && playingPath && prepared &&
            normalizeJAContentPath(prepared)===normalizeJAContentPath(playingPath))
    }
    function syncLinkedPreview() {
        if(!isLinkedVideo() || !previewMedia)return
        previewMedia.muted=true
        if(Number.isFinite(videoState.currentTime) && Math.abs(previewMedia.currentTime-videoState.currentTime)>0.65)
            try{previewMedia.currentTime=videoState.currentTime}catch{}
        if(videoState.paused && !previewMedia.paused)previewMedia.pause()
        else if(!videoState.paused && previewMedia.paused)
            void previewMedia.play().catch(()=>notice("Vista previa no pudo seguir el vídeo de Programa"))
    }
    function resetTargetSelection() {
        closeLocalExpanded()
        closeAddMediaMenu()
        previewMedia?.pause()
        previewMedia = null
        biblePreviewGeneration++
        if (biblePreviewTimer) clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy()
        biblePreviewRenderer = null
        biblePreviewReady = false
        biblePreviewReference = ""
        prepared = ""
        followProgram = false
        const preview = el("previewCanvasContent")
        if (preview) {
            preview.replaceChildren()
            preview.textContent = "Vista previa restablecida. Elige el siguiente contenido."
        }
        const counter = el("previewTimeCounter")
        if (counter) counter.textContent = "Sin contenido preparado"
        const seek = el("previewSeekSlider") as HTMLInputElement | null
        if (seek) { seek.disabled = true; seek.value = "0" }
        const remembered = (() => { try { return localStorage.getItem("ja-main-projector") || "" } catch { return "" } })()
        const choices = chooseOutput()
        if (choices.length) selectedId = choices.includes(remembered) ? remembered : choices[0]
        rebuildOutputs()
        updatePreviewProgress()
        notice("Vista previa restablecida; Programa y salidas físicas no cambiaron.")
    }
    function closeLocalExpanded() {
        expandedTarget?.classList.remove("ja-console-expanded")
        expandedTarget?.removeAttribute("aria-expanded")
        expandedTarget = null
        expandedClose?.remove()
        expandedClose = null
    }
    function toggleLocalFullscreen(targetId: string) {
        const target = el(targetId)
        if (!target) { notice("No existe el monitor solicitado en la interfaz"); return }
        if (expandedTarget === target) { closeLocalExpanded(); return }
        closeLocalExpanded()
        expandedTarget = target
        target.classList.add("ja-console-expanded")
        target.setAttribute("aria-expanded","true")
        const close = document.createElement("button")
        close.type = "button"
        close.className = "ja-expanded-close"
        close.textContent = "✕ Cerrar vista ampliada"
        close.title = "Volver a la consola sin modificar Programa (Esc)"
        close.setAttribute("aria-label","Cerrar vista ampliada")
        close.onclick = closeLocalExpanded
        host.append(close)
        expandedClose = close
    }
    function closeAddMediaMenu() {
        addMediaMenu?.remove()
        addMediaMenu = null
        el("btnAddMultimedia")?.setAttribute("aria-expanded","false")
    }
    function openIndividualFiles() {
        closeAddMediaMenu()
        sendMain(Main.OPEN_FILE, {
            id:"ja-gemini-local-media",channel:"JA_GEMINI_MEDIA_FILES",
            title:"Seleccionar vídeos, imágenes o audio",
            multiple:true,read:false,
            filter:{name:"Vídeos, imágenes y audio",extensions:[...new Set([...videoExtensions,...imageExtensions,...audioExtensions])]}
        })
    }
    function openMediaFolder() {
        closeAddMediaMenu()
        sendMain(Main.OPEN_FOLDER,{channel:"JA_GEMINI_MEDIA_FOLDER",title:"Vincular carpeta de Multimedia"})
    }
    function toggleAddMediaMenu() {
        if (addMediaMenu) return closeAddMediaMenu()
        const anchor = el("btnAddMultimedia")
        if (!anchor) return notice("No se encontró el botón Agregar multimedia")
        const menu = document.createElement("div")
        menu.className = "ja-add-media-menu"
        menu.setAttribute("role","group")
        menu.setAttribute("aria-label","Formas de agregar multimedia")
        const fileButton = document.createElement("button")
        fileButton.type="button";fileButton.textContent="Añadir archivos…"
        fileButton.onclick=openIndividualFiles
        const folderButton = document.createElement("button")
        folderButton.type="button";folderButton.textContent="Vincular carpeta…"
        folderButton.onclick=openMediaFolder
        menu.append(fileButton,folderButton)
        host.append(menu)
        addMediaMenu=menu
        anchor.setAttribute("aria-expanded","true")
        const anchorBounds=anchor.getBoundingClientRect(), hostBounds=host.getBoundingClientRect()
        const availableX = Math.max(4,host.clientWidth-menu.offsetWidth-8)
        const availableY = Math.max(4,host.clientHeight-menu.offsetHeight-8)
        menu.style.left=Math.min(availableX,Math.max(4,anchorBounds.left-hostBounds.left))+"px"
        menu.style.top=Math.min(availableY,Math.max(4,anchorBounds.bottom-hostBounds.top+4))+"px"
        fileButton.focus()
    }
    function outsideMediaMenu(e: MouseEvent) {
        if (!addMediaMenu) return
        const node = e.target as Node | null
        if (node && (addMediaMenu.contains(node) || el("btnAddMultimedia")?.contains(node))) return
        closeAddMediaMenu()
    }
    function escapeConsole(e: KeyboardEvent) {
        if (e.key !== "Escape" || settingsOpen) return
        if (addMediaMenu) { e.preventDefault();closeAddMediaMenu();return }
        if (expandedTarget) { e.preventDefault();closeLocalExpanded() }
    }
    // El botón «Limpiar texto» actúa sobre la capa de diapositiva, no sobre
    // el archivo de imagen/vídeo que sirve de fondo ni sobre el audio.
    function clearSelectedTextLayer() {
        if (get(outLocked)) return notice("La salida está bloqueada")
        const output = get(outputs)[selectedId]
        if (!selectedId || !output?.enabled || !output.active) return notice("Selecciona una salida activa para limpiar texto")
        if (!output.out?.slide) return notice("Esta salida no contiene una capa de texto o diapositiva que limpiar")
        clearSlide(true, selectedId)
        notice("Capa de diapositiva retirada de " + (output.name || selectedId) + ". Fondo y audio conservados.")
    }
    function openScreenSettings() {
        settingsStartSection = "screens"
        settingsOpen = true
    }
    function operatorShortcuts(e: KeyboardEvent) {
        if (!(e.ctrlKey || e.metaKey) || e.key !== ",") return
        if (e.altKey || e.shiftKey) return
        e.preventDefault()
        e.stopImmediatePropagation()
        settingsStartSection = "general"
        settingsOpen = !settingsOpen
    }
    function assignMonitorToOutput(displayId: number, bounds: {x:number;y:number;width:number;height:number}, outputId: string) {
        const current = get(outputs)
        const target = current[outputId]
        if (!target || !target.enabled || target.stageOutput || !Number.isFinite(displayId))
            return notice("No se puede asignar la salida o monitor solicitado")
        if (Object.entries(current).some(([id,o])=>id!==outputId && o.enabled && o.screen===String(displayId)))
            return notice("El monitor ya está asignado a otra salida.")
        outputs.update(a=>({...a,[outputId]:{...a[outputId],screen:String(displayId),bounds:{...bounds}}}))
        send(OUTPUT,["UPDATE_BOUNDS"],{id:outputId,bounds})
        if (!localStorage.getItem("ja-main-projector"))localStorage.setItem("ja-main-projector",outputId)
        screenStructure = ""
        rebuildOutputs()
        notice("Salida "+(target.name||outputId)+" asignada al monitor "+displayId+". Comprueba visualmente antes de emitir.")
    }
    function createPhysicalOutput(displayId: number, bounds: {x:number;y:number;width:number;height:number}, name: string) {
        if (!Number.isFinite(displayId) || get(outLocked))return notice("No se puede crear una salida mientras esté bloqueada.")
        if(Object.values(get(outputs)).some(o=>o.enabled && o.screen===String(displayId)))
            return notice("Este monitor ya tiene una salida JA.")
        const previousMain=chooseOutput()[0] || ""
        if(previousMain && !localStorage.getItem("ja-main-projector"))
            localStorage.setItem("ja-main-projector",previousMain)
        const outputId=addOutput(false,"",false,name)
        if(!outputId)return notice("FreeShow no pudo registrar la nueva salida")
        let outputSnapshot: any = null
        outputs.update(a=>{
            const output=a[outputId]
            if(!output)return a
            outputSnapshot={...output,enabled:true,active:true,screen:String(displayId),
                bounds:{...bounds},boundsLocked:true,alwaysOnTop:true}
            return {...a,[outputId]:outputSnapshot}
        })
        if(!outputSnapshot)return notice("No se pudo preparar la salida "+name)
        // CREATE es la ruta nativa de FreeShow. La nueva salida comienza vacía:
        // NO se copia Programa ni se emite audio a monitores recién creados.
        send(OUTPUT,["CREATE"],{...outputSnapshot,id:outputId})
        screenStructure=""
        rebuildOutputs()
        notice("Salida creada para "+name+". Selecciónala en Envío rápido; verifica que la pantalla física muestra la ventana correspondiente.")
    }
    function chooseOutput() {
        const available = Object.entries(get(outputs))
            .filter(([, value]) => value && value.enabled && !value.stageOutput)
            .map(([id]) => id)
        if (!available.includes(selectedId)) selectedId = available[0] || ""
        return available
    }
    function rebuildOutputs() {
        if (!host) return
        const available = chooseOutput()
        const list = el("multiscreenCardsList")
        const targets = el("quickTargetButtons")
        const outputMap = get(outputs)
        // Reconstruct only when monitors/active flags change, not every playback tick.
        const structure = available.map(id=>id+":"+!!outputMap[id]?.active).join("|")
        if (structure !== screenStructure) {
            screenStructure = structure
            for (const component of screenRenderers) component.$destroy()
            screenRenderers = []
            list?.replaceChildren()
            targets?.replaceChildren()
            if (!available.length) {
                if (list) list.textContent = "Sin salidas configuradas. Abre Configuración JA."
                if (targets) targets.textContent = "Sin salida configurada"
            }
            for (const id of available) {
                const value = outputMap[id]
                const card = document.createElement("button")
                card.type = "button"
                card.dataset.output = id
                card.className = "ja-screen-card w-full rounded-xl border p-2 text-left flex items-center gap-3"
                const thumb = document.createElement("div")
                thumb.className = "ja-screen-preview"
                thumb.setAttribute("aria-label", "Vista de salida " + (value.name || id))
                try {
                    screenRenderers.push(new PreviewOutput({ target:thumb,props:{outputId:id,disableTransitions:true} }))
                } catch (error) {
                    console.warn("Salida sin vista previa renderizable:",id,error)
                    thumb.textContent = "Vista no disponible"
                }
                const info = document.createElement("div")
                info.className = "min-w-0 flex-1"
                const header = document.createElement("strong")
                header.className = "text-xs block truncate"
                header.textContent = value.name || "Salida " + id
                const state = document.createElement("span")
                state.className = "ja-screen-state block text-[10px] text-slate-300 truncate"
                info.append(header,state)
                const badge = document.createElement("span")
                badge.className = "ja-screen-badge text-[10px] px-2 py-1 rounded-xl whitespace-nowrap"
                info.append(badge)
                card.append(thumb,info)
                card.onclick = () => { selectedId=id; rebuildOutputs() }
                list?.append(card)
                const target = document.createElement("button")
                target.type = "button";target.dataset.output = id
                target.className = "ja-target rounded-lg border px-2 py-1 text-xs"
                target.textContent = value.name || "Salida " + id
                target.onclick = card.onclick
                targets?.append(target)
            }
        }
        for (const id of available) {
            const output = outputMap[id]
            const state = list?.querySelector<HTMLElement>('[data-output="' + CSS.escape(id) + '"]')
            state?.classList.toggle("ja-selected",id===selectedId)
            const file = output?.out?.background?.path || output?.out?.background?.id || ""
            const label = state?.querySelector(".ja-screen-state")
            if (label) label.textContent = file ? fileName(file) : "Salida libre"
            const badge = state?.querySelector(".ja-screen-badge")
            if (badge) badge.textContent = output.active ? "Activa" : "Inactiva"
            const target = targets?.querySelector<HTMLElement>('[data-output="' + CSS.escape(id) + '"]')
            target?.classList.toggle("ja-selected",id===selectedId)
        }
        syncProgram()
        if (mode === "biblia" && biblePreviewReady && biblePreviewRenderer) biblePreviewRenderer.$set({outputId: selectedId})
    }
    function syncProgram() {
        if (!host) return
        const target = el("programCanvasContent")
        const available = chooseOutput()
        const output = selectedId ? get(outputs)[selectedId] : null
        if (target && renderedOutput !== selectedId) {
            programRenderer?.$destroy()
            programRenderer = null
            renderedOutput = selectedId
            target.replaceChildren()
            if (selectedId) programRenderer = new PreviewOutput({ target, props: { outputId: selectedId } })
            else target.textContent = "Sin salida configurada"
        }
        const path = output?.out?.background?.path || output?.out?.background?.id || ""
        const valid = !!path && (getMediaType(getExtension(path)) === "video" || output?.out?.background?.type === "player")
        if (playingPath !== path || listeningOutput !== selectedId || (stopVideoState && (!selectedId || !valid))) {
            stopVideoState?.()
            stopVideoState = null
            playingPath = path
            listeningOutput = selectedId
            videoState = { paused: true, muted: false, currentTime: 0, duration: 0 }
            if (valid) stopVideoState = videoSync(path, selectedId, (next) => {
                videoState = {
                    paused: !!next.paused, muted: !!next.muted,
                    currentTime: Number(next.currentTime) || 0,
                    duration: Number(next.duration) || 0
                }
                updateTransport()
                syncLinkedPreview()
            })
        }
        const label = el("programStateLabel")
        if (label) label.textContent = output ? (path ? fileName(path) : "Salida libre") : "Sin salida"
        const badge = el("programBadgeText")
        if (badge) badge.textContent = output ? (path ? "Programa · Activo" : "Programa · Sin emisión") : "Programa · Sin salida"
        updateTransport()
        // La primera prueba no cambia automáticamente salidas no seleccionadas.
        if (available.length !== 1) disable("btnPreviewToAll", "Enviar a todos: se evaluará después de aislar sesiones")
    }
    function updateTransport() {
        const pause = el("btnProgramPause") as HTMLButtonElement | null
        if (pause) {
            pause.disabled = !playingPath || get(outLocked)
            pause.title = videoState.paused ? "Reproducir en Programa" : "Pausar Programa"
            pause.setAttribute("aria-label", pause.title)
            pause.textContent = videoState.paused ? "▶" : "Ⅱ"
        }
        if (programMute) {
            programMute.disabled = !playingPath || get(outLocked)
            programMute.textContent = videoState.muted ? "🔇" : "🔊"
            programMute.title = videoState.muted ? "Reactivar audio de Programa" : "Silenciar Programa"
        }
        const counter = el("programTimeCounter")
        if (counter) counter.textContent = playingPath ? time(videoState.currentTime) + " / " + time(videoState.duration) : "—"
        if (programVolume) {
            // The experimental slider changes only the one supervised session.
            // Do not enable it with multiple outputs until per-output audio is tested.
            const session = playingPath && selectedId ? VideoPlayer.getPlaying(playingPath, [selectedId]) : null
            programVolume.disabled = !session || get(outLocked) ||
                (chooseOutput().length>1 && selectedId!==localStorage.getItem("ja-main-projector"))
            programVolume.title = session ? "Volumen real de Programa: "+Math.round(VideoPlayer.getVolume(playingPath,[selectedId])*100)+"%" : "Sin sesión de vídeo con audio controlable en Programa"
            if (session && document.activeElement !== programVolume)
                programVolume.value = String(Math.round(Math.max(0, Math.min(1, VideoPlayer.getVolume(playingPath, [selectedId]))) * 100))
        }
        if (programSeek) {
            programSeek.disabled = !playingPath || !Number.isFinite(videoState.duration) || videoState.duration <= 0
            programSeek.max = String(Math.max(1, videoState.duration))
            if (document.activeElement !== programSeek) programSeek.value = String(videoState.currentTime)
        }
    }
    function sourceFiles(): GeminiFile[] {
        if (mode === "multimedia") return indexedMedia
        if (mode === "biblia") return []
        const roots = get(hymnCollectionPaths)[collection] || []
        return geminiLocalFiles(get(hymnVideos).filter(file =>
            roots.some(root => isPathInJACollection(file.path, root))
        ) as FileFolder[])
            .filter(file => file.kind === "video")
    }
    async function scanMediaFolders() {
        const generation = ++scanGeneration
        const roots = [...new Set(Object.values(get(mediaFolders)).map(f => f?.path || "").filter(Boolean))]
        const hymnRoots = get(hymnSourcePaths)
        scanning = true
        scanErrors = []
        renderToolbar()
        const entries: FileFolder[] = []
        const failures: string[] = []
        // Sequential reads keep the native file scanner predictable on slow disks.
        for (const root of roots) {
            try {
                const list = await requestMain(Main.READ_FOLDER, { path: root, depth: 5 }, undefined, 60000)
                if (generation !== scanGeneration) return
                if (!list) { failures.push(root); continue }
                entries.push(...Object.values(list))
            } catch (error) {
                if (generation !== scanGeneration) return
                failures.push(root)
                console.warn("[JA Gemini] No se pudo escanear", root, error)
            }
        }
        if (generation !== scanGeneration) return
        indexedMedia = geminiLocalFiles([...entries, ...selectedMediaPaths.map(path=>({path,name:fileName(path)}))], hymnRoots)
        scanErrors = failures
        scanning = false
        renderLibrary()
    }
    function showCounts() {
        if (!host) return
        const all = mode === "multimedia" ? indexedMedia : sourceFiles()
        const counts = geminiCounts(all)
        const multimedia = el("moduleView_multimedia")
        for (const btn of multimedia?.querySelectorAll<HTMLButtonElement>("button") || []) {
            const value = btn.textContent?.trim() || ""
            const m = value.match(/(Vídeos?|Videos?|Imágenes|Imagenes|Audio)\s*\(\d+\)/i)
            if (!m) continue
            const type = /v[ií]deo/i.test(m[1]) ? "video" : /im[aá]gen/i.test(m[1]) ? "image" : "audio"
            const textWalker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT)
            let n: Node | null
            while ((n = textWalker.nextNode())) {
                const current = n.nodeValue || ""
                if (/\(\s*\d+\s*\)/.test(current)) n.nodeValue = current.replace(/\(\s*\d+\s*\)/, "(" + counts[type] + ")")
            }
            btn.setAttribute("aria-pressed", String(typeFilter === type))
            btn.style.backgroundColor = typeFilter === type ? "#2169a5" : ""
            btn.style.borderColor = typeFilter === type ? "#4cd1fd" : ""
        }
    }
    function renderToolbar() {
        if (!host) return
        const area = el(mode === "multimedia" ? "multimediaCardsGrid" : "hymnModuleGrid")
        if (!area || !area.parentElement) return
        if (!libraryToolbar || libraryToolbar.parentElement !== area.parentElement) {
            libraryToolbar?.remove()
            libraryToolbar = document.createElement("div")
            libraryToolbar.className = "ja-library-toolbar"
            area.parentElement.insertBefore(libraryToolbar, area)
        }
        libraryToolbar.replaceChildren()
        const info = document.createElement("span")
        const count = sourceFiles().length
        info.textContent = mode === "multimedia"
            ? (scanning ? "Leyendo carpetas reales…" : count + " archivos reales · " + Object.values(get(mediaFolders)).filter(f=>!!f?.path).length + " carpetas")
            : (count + " vídeos reales · " + collection)
        libraryToolbar.append(info)
        if (mode === "himnario") {
            for (const name of ["Himnario Adventista", "Cantos Juveniles"]) {
                const tab = document.createElement("button")
                tab.type = "button"
                tab.textContent = name
                tab.setAttribute("aria-pressed", String(collection === name))
                tab.style.backgroundColor = collection === name ? "#195c97" : ""
                tab.onclick = () => { collection = name; renderLibrary() }
                libraryToolbar.append(tab)
            }
        }
        const add = document.createElement("button")
        add.type = "button"
        add.textContent = "+ Vincular carpeta"
        add.title = "Elegir una carpeta real de Windows, sin copiar ni mover archivos"
        add.onclick = () => sendMain(Main.OPEN_FOLDER, {
            channel: mode === "multimedia" ? "JA_GEMINI_MEDIA_FOLDER" : "JA_GEMINI_HYMN_FOLDER",
            title: mode === "multimedia" ? "Vincular Multimedia" : "Vincular " + collection
        })
        libraryToolbar.append(add)
        const refresh = document.createElement("button")
        refresh.type = "button"
        refresh.textContent = "↻ Actualizar"
        refresh.onclick = () => mode === "multimedia" ? void scanMediaFolders() : void refreshJAHymnLibrary()
        libraryToolbar.append(refresh)
        const extras = mode === "multimedia"
            ? Object.entries(get(mediaFolders)).filter(([key,f])=>key.startsWith("ja_gemini_") && !!f?.path).map(([key,f])=>({label:f.name || f.path || key,path:f.path || "",key}))
            : (get(hymnLinks)[collection] || []).map(path=>({label:path.split(/[\/\\]/).pop()||path,path,key:""}))
        if (extras.length) {
            const select = document.createElement("select")
            select.className = "bg-[#08172f] text-slate-100 rounded px-2 py-1 max-w-[180px]"
            select.setAttribute("aria-label", "Carpeta vinculada para desvincular")
            for (const f of extras) { const opt=document.createElement("option");opt.value=f.path;opt.textContent=f.label;select.append(opt) }
            libraryToolbar.append(select)
            const remove = document.createElement("button")
            remove.type = "button"; remove.textContent = "Desvincular"
            remove.title = "Quitar solo el enlace, sin borrar archivos del disco"
            remove.onclick = () => {
                const item = extras.find(f=>f.path===select.value)
                if (!item) return
                if (mode === "himnario") unlinkHymnFolder(collection, item.path)
                else mediaFolders.update(folders => {
                    const current = { ...folders }
                    if (item.key.startsWith("ja_gemini_")) delete current[item.key]
                    return current
                })
                notice("Enlace retirado. Los archivos del disco permanecen intactos.")
                renderToolbar()
            }
            libraryToolbar.append(remove)
        }
        const label = document.createElement("span")
        label.className = "ja-source-label"
        const errors = mode === "multimedia" ? scanErrors : Object.entries(get(hymnSourceStatus)).filter(([,s])=>s==="unavailable").map(([p])=>p)
        if (errors.length) { label.textContent = "No accesibles: " + errors.length + " · " + errors[0]; label.title=errors.join("\n"); label.style.color="#fcd34d" }
        else label.textContent = "Sin datos demostrativos"
        libraryToolbar.append(label)
    }
    function showNativeThumbnail(container: HTMLDivElement, file: GeminiFile) {
        if (file.kind === "audio") { container.textContent = "♫"; return }
        const make = (src: string) => {
            if (!container.isConnected) return
            const image = document.createElement("img")
            image.className = "ja-media-thumb"
            image.loading = "lazy"
            image.alt = ""
            image.src = encodeFilePath(src)
            image.onerror = () => { if (image.isConnected) image.replaceWith(document.createTextNode("Sin miniatura")) }
            container.replaceChildren(image)
        }
        if (file.kind === "image") { make(file.path); return }
        container.textContent = "▶"
        if (!thumbObserver) {
            thumbObserver = new IntersectionObserver((changes) => {
                for (const change of changes) {
                    if (!change.isIntersecting) continue
                    const box = change.target as HTMLDivElement
                    thumbObserver?.unobserve(box)
                    const mediaPath = box.dataset.mediaPath
                    if (!mediaPath) continue
                    void queuedHymnThumbnail(mediaPath).then(path=>{
                        if (path && box.isConnected && box.dataset.mediaPath === mediaPath) makeThumbnail(box, path)
                    }).catch(()=>{})
                }
            }, { root: el(mode === "himnario" ? "hymnModuleGrid" : "multimediaCardsGrid"), rootMargin: "200px" })
        }
        container.dataset.mediaPath = file.path
        thumbObserver.observe(container)
    }
    function makeThumbnail(container: HTMLDivElement, path: string) {
        const img = document.createElement("img")
        img.className="ja-media-thumb"; img.loading="lazy"; img.alt=""
        img.src=encodeFilePath(path)
        img.onerror=()=>{ if(img.isConnected) img.replaceWith(document.createTextNode("▶")) }
        container.replaceChildren(img)
    }
    function renderLibrary() {
        if (!host) return
        if (thumbObserver) { thumbObserver.disconnect(); thumbObserver = null }
        const area = el(mode === "himnario" ? "hymnModuleGrid" : "multimediaCardsGrid")
        if (!area) return
        const files = sourceFiles()
        const searchInput = el(mode === "himnario" ? "hymnModuleSearch" : "multimediaSearchInput") as HTMLInputElement | null
        const shown = geminiSearch(files, searchInput?.value || "", mode === "himnario" ? "video" : typeFilter)
        area.replaceChildren()
        if (!shown.length) {
            const msg = document.createElement("p")
            msg.className = "col-span-full p-5 text-sm text-slate-300"
            msg.textContent = scanning && mode==="multimedia" ? "Leyendo archivos del disco…" :
                mode==="himnario" ? "Sin vídeos encontrados en esta colección. Vincula tu carpeta de himnos o pulsa Actualizar." :
                files.length ? "No se encontraron archivos para este filtro." : "Sin archivos reales encontrados. Pulsa «Vincular carpeta» para elegir tus vídeos, imágenes o audio."
            area.append(msg)
        }
        for (const file of shown.slice(0, 160)) {
            const item = document.createElement("button")
            item.type = "button";item.title=file.path
            item.className = "ja-media-card p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"
            const visual = document.createElement("div")
            visual.className = "aspect-video rounded-md bg-[#06132a] flex items-center justify-center text-sky-300 overflow-hidden"
            const label = document.createElement("p")
            label.className = "text-xs text-slate-200 truncate mt-2"
            label.textContent = file.name
            item.append(visual,label)
            item.onclick=()=>prepare(file.path)
            area.append(item)
            showNativeThumbnail(visual,file)
        }
        if (shown.length>160) {
            const info=document.createElement("p")
            info.className="col-span-full text-xs text-slate-300 p-2"
            info.textContent="Mostrando 160 de "+shown.length+" archivos reales. Filtra por nombre para ver otros."
            area.append(info)
        }
        showCounts()
        renderToolbar()
    }
    function showModule(next: "multimedia" | "himnario" | "biblia") {
        if (mode === "biblia" && next !== "biblia") {
            scriptureView?.$destroy();scriptureView=null
            scriptureTarget=null
            el("moduleView_biblia")?.replaceChildren()
        }
        mode=next
        for(const [module,section] of [["multimedia","moduleView_multimedia"],["himnario","moduleView_himnario"],["biblia","moduleView_biblia"],["other","moduleView_other"]]) {
            const node=el(section)
            if(node) {node.classList.toggle("hidden",module!==next);node.classList.toggle("flex",module===next)}
        }
        setupNavigation()
        if(next==="biblia") {void registerJARV1909().then(()=>{updateBibleUI();scheduleBiblePreview()});updateBibleUI();scheduleBiblePreview()}
        else {renderLibrary();if(next==="himnario")void refreshJAHymnLibrary()}
    }
    // Render the private next Scripture with FreeShow's actual slide compositor.
    // No calls to setOutput, VideoPlayer or remote output windows occur here.
    function scheduleBiblePreview() {
        if (mode !== "biblia") return
        const generation = ++biblePreviewGeneration
        biblePreviewReady = false
        if (biblePreviewTimer) clearTimeout(biblePreviewTimer)
        biblePreviewTimer = setTimeout(() => { void renderBiblePreview(generation) }, 90)
    }
    async function renderBiblePreview(generation: number) {
        const before = JSON.stringify(get(activeScripture).reference || null)
        const bibleId = activeBibleId
        try {
            const draft = await prepareGeminiScriptureDraft()
            if (generation !== biblePreviewGeneration || mode !== "biblia" ||
                bibleId !== activeBibleId || before !== JSON.stringify(get(activeScripture).reference || null)) return
            const target = el("previewCanvasContent")
            if (!target) return
            biblePreviewRenderer?.$destroy()
            biblePreviewRenderer = null
            previewMedia?.pause()
            previewMedia = null
            prepared = ""
            target.replaceChildren()
            if (!draft || !selectedId) {
                target.textContent = "Selecciona un versículo para preparar Vista previa"
                return
            }
            biblePreviewRenderer = new JaGeminiBiblePreview({
                target, props: { outputId: selectedId, prepared: draft.out }
            })
            biblePreviewReference = before
            biblePreviewReady = true
            const counter = el("previewTimeCounter")
            if (counter) counter.textContent = "Biblia · Vista previa"
            const slider = el("previewSeekSlider") as HTMLInputElement | null
            if (slider) slider.disabled = true
            updatePreviewProgress()
        } catch (error) {
            if (generation !== biblePreviewGeneration) return
            biblePreviewReady = false
            notice("No se pudo preparar Vista previa bíblica: " + String(error))
        }
    }
    function keyboardGeminiBible(e: KeyboardEvent) {
        if (mode !== "biblia" || settingsOpen || !["ArrowLeft","ArrowRight"].includes(e.key)) return
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const focused = document.activeElement as HTMLElement | null
        const target = e.target as HTMLElement | null
        const interactive = "input,textarea,select,button,[contenteditable],[role='textbox'],[role='slider']"
        if (target?.closest?.(interactive) || focused?.closest?.(interactive)) return
        if (!scriptureView) return
        e.preventDefault()
        e.stopImmediatePropagation()
        void (scriptureView as any).navigatePreparedVerse(e.key === "ArrowLeft").catch((error: unknown) => notice("No se pudo cambiar de versículo: " + String(error)))
    }
    function updateBibleUI() {
        if (mode !== "biblia") return
        const area = el("moduleView_biblia")
        if (!area) return
        if (!scriptureTarget) {
            area.replaceChildren()
            area.classList.remove("hidden")
            area.classList.add("flex")
            area.style.flexDirection="column"
            const bar = document.createElement("div")
            bar.className="ja-library-toolbar"
            const title=document.createElement("strong")
            title.textContent="Escrituras reales"
            bar.append(title)
            const versions=document.createElement("select")
            versions.className="bg-[#08172f] text-white border border-[#355681] rounded px-2 py-1"
            versions.setAttribute("aria-label","Seleccionar traducción bíblica instalada")
            versions.dataset.role="ja-bibles"
            versions.onchange=()=>{
                activeBibleId=versions.value
                drawerTabsData.update(data => ({...data,scripture:{...data.scripture,activeSubTab:activeBibleId}}))
                scriptureView?.$set({active:activeBibleId})
                scheduleBiblePreview()
            }
            bar.append(versions)
            for (const [label,which] of [["Vista cuadriculada","grid"],["Vista de lista","list"]] as const) {
                const button=document.createElement("button")
                button.type="button";button.textContent=label
                button.setAttribute("aria-pressed",String(get(scriptureMode)===which))
                button.onclick=()=>{scriptureMode.set(which);updateBibleUI()}
                bar.append(button)
            }
            const project=document.createElement("button")
            project.type="button"
            project.className="ja-bible-project"
            project.textContent="▶ Proyectar en principal"
            project.onclick=()=>{
                if (get(outLocked)) return notice("Las salidas están bloqueadas")
                const ids = chooseOutput()
                if (ids.length !== 1 || !selectedId || !get(outputs)[selectedId]?.active)
                    return notice("Para proyectar la Biblia en esta prueba, activa una única salida principal.")
                if (!biblePreviewReady || biblePreviewReference !== JSON.stringify(get(activeScripture).reference || null))
                    return notice("Primero prepara el versículo en Vista previa; comprueba que terminó de cargar.")
                if (!activeBibleId || !get(activeScripture).reference?.verses?.[0]?.length)
                    return notice("Selecciona primero un libro, capítulo y versículo de la Biblia.")
                void playScripture().then(()=>{
                    if (get(outputs)[selectedId]?.out?.slide?.id !== "temp")
                        notice("No se confirmó el versículo en Programa. Comprueba la salida y la traducción.")
                }).catch(error=>notice("Error al proyectar Biblia: "+String(error)))
            }
            bar.append(project)
            area.append(bar)
            scriptureTarget=document.createElement("div")
            scriptureTarget.className="ja-bible-content"
            area.append(scriptureTarget)
        }
        const select=area.querySelector<HTMLSelectElement>('select[data-role="ja-bibles"]')
        if (!select) return
        const bibles=get(scriptures)
        const keys=Object.keys(bibles).filter(id=>!!bibles[id]&&!bibles[id].api)
        if (!keys.includes(activeBibleId)) activeBibleId=(get(drawerTabsData).scripture?.activeSubTab || "")
        if (!keys.includes(activeBibleId)) activeBibleId=keys[0] || ""
        select.replaceChildren()
        for (const id of keys) {
            const opt=document.createElement("option")
            opt.value=id;opt.textContent=bibles[id].name || id
            select.append(opt)
        }
        select.value=activeBibleId
        // Scripture's projection engine reads drawerTabsData, not the select element.
        // Set the native tab even when the first version was auto-selected.
        if (activeBibleId && get(drawerTabsData).scripture?.activeSubTab !== activeBibleId) {
            drawerTabsData.update(data => ({
                ...data, scripture: { ...data.scripture, activeSubTab: activeBibleId }
            }))
        }
        for(const b of area.querySelectorAll<HTMLButtonElement>(".ja-library-toolbar button")){
            if (b.textContent?.includes("cuadriculada")) b.setAttribute("aria-pressed",String(get(scriptureMode)==="grid"))
            if (b.textContent?.includes("lista")) b.setAttribute("aria-pressed",String(get(scriptureMode)==="list"))
        }
        if (activeBibleId && scriptureTarget) {
            if (!scriptureView) { scriptureTarget.replaceChildren(); scriptureView=new Scripture({target:scriptureTarget,props:{active:activeBibleId,searchValue:"",geminiPreviewOnly:true}}) }
            else scriptureView.$set({active:activeBibleId})
        } else {
            scriptureTarget.textContent="Todavía no hay una Biblia local válida. Verifica RV1909 en Biblias instaladas."
        }
    }
    function collectMockText() {
        mockNodes.length = 0
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
        let item: Node | null
        while ((item = walker.nextNode())) {
            const v = item.nodeValue?.trim() || ""
            if (/Pantallas conectadas|Estado:\s*En vivo|Guardado\s*\(\d{1,2}:\d{2}\)|Modo:\s*Servicio|^[0-9]+\/[0-9]+$|^En vivo$/i.test(v))
                mockNodes.push({node:item as Text, original:v})
        }
        renderRealHeader()
    }
    function renderRealHeader() {
        const configured = Object.values(get(outputs)).filter(x=>x?.enabled && !x?.stageOutput)
        const active = configured.filter(x=>x.active)
        for (const entry of mockNodes) {
            const original=entry.original
            if (/Pantallas conectadas/i.test(original)) entry.node.nodeValue = "Salidas:"
            else if (/^[0-9]+\/[0-9]+$/.test(original)) entry.node.nodeValue = active.length + "/" + configured.length
            else if (/Guardado/i.test(original)) entry.node.nodeValue = get(saved) ? "Guardado" : "Cambios pendientes"
            else if (/Estado:\s*En vivo|^En vivo$/i.test(original))
                entry.node.nodeValue = active.length ? "Salida activa" : "Sin salida activa"
            else if (/Modo:\s*Servicio/i.test(original)) entry.node.nodeValue = "Biblioteca local · Archivos reales"
        }
        // El mock incluía medidores sin conexión al audio real.
        const fakeMeter = el("audioMeterBars")
        if (fakeMeter) { fakeMeter.replaceChildren(); fakeMeter.title = "Medidor no conectado; no mostrar barras simuladas" }
    }
    function connectMediaTypeFilters() {
        const root = el("moduleView_multimedia")
        for (const btn of root?.querySelectorAll<HTMLButtonElement>("button") || []) {
            const name = btn.textContent?.trim() || ""
            const type = /v[ií]deos?\s*\(\d+\)/i.test(name) ? "video" :
                /im[aá]genes\s*\(\d+\)/i.test(name) ? "image" :
                /audio\s*\(\d+\)/i.test(name) ? "audio" : null
            if (!type) continue
            const handler = () => { typeFilter = type; renderLibrary() }
            btn.addEventListener("click",handler)
            cleanup.push(()=>btn.removeEventListener("click",handler))
        }
        // Los botones de acciones generales se enlazan una sola vez mediante bind().
        // No instalar un segundo selector de carpeta sobre «Agregar multimedia».
    }
    function installFolderPicker() {
        const fileToken = receiveToMain(ToMain.OPEN_FILE2, ({channel,files}) => {
            if(channel === "JA_GEMINI_LOGO_IMAGE") {
                if(Array.isArray(files) && typeof files[0] === "string") configureLogoPath(files[0])
                return
            }
            if(channel !== "JA_GEMINI_MEDIA_FILES" || !Array.isArray(files)) return
            const newPaths = files.filter(path=>typeof path === "string" && !!geminiFileType(path))
            const omitted = files.length - newPaths.length
            if (!newPaths.length) return notice("No se seleccionaron archivos multimedia compatibles")
            const known = new Map(selectedMediaPaths.map(p=>[normalizeJAContentPath(p),p]))
            for(const p of newPaths) known.set(normalizeJAContentPath(p),p)
            selectedMediaPaths = [...known.values()]
            try { localStorage.setItem("ja-gemini-selected-media-files",JSON.stringify(selectedMediaPaths)) }
            catch(error) { notice("Archivos añadidos, pero no pudieron guardarse las rutas para el próximo inicio: "+String(error)) }
            void scanMediaFolders()
            notice(newPaths.length+" archivo(s) multimedia seleccionado(s)"+(omitted ? "; "+omitted+" incompatibles omitidos" : "")+".")
        })
        cleanup.push(()=>destroyMain(fileToken))
        const token = receiveToMain(ToMain.OPEN_FOLDER2, ({channel,path}) => {
            if (!path) return
            if (channel === "JA_GEMINI_HYMN_FOLDER") {
                linkHymnFolder(collection,path)
                notice("Carpeta vinculada a " + collection)
                void refreshJAHymnLibrary()
            } else if (channel === "JA_GEMINI_MEDIA_FOLDER") {
                if (Object.values(get(mediaFolders)).some(folder=>normalizeJAContentPath(folder.path || "")===normalizeJAContentPath(path))) {
                    notice("Esta carpeta ya está vinculada a Multimedia")
                    void scanMediaFolders()
                    return
                }
                mediaFolders.update(folders=>({
                    ...folders,
                    ["ja_gemini_"+uid()]:{name:fileName(path),path,icon:"folder"}
                }))
                notice("Carpeta Multimedia vinculada: " + fileName(path))
            }
        })
        cleanup.push(()=>destroyMain(token))
    }
    function removeInertGeminiControls() {
        const dropdown=el("btnProjectDropdown") as HTMLButtonElement | null
        if (dropdown) {
            const status = document.createElement("span")
            status.className = "ja-local-source-status"
            status.textContent = "Biblioteca local · Archivos reales"
            status.title = "Origen de la biblioteca, no un selector de modo. Gestión de proyectos pendiente."
            dropdown.replaceWith(status)
        }
        el("projectDropdownMenu")?.remove()
        const fauxWindows=el("btnOpenDiagModal")?.nextElementSibling
        if (fauxWindows?.textContent?.includes("✕")) fauxWindows.remove()
        for (const id of ["btnOpenDiagModal"])
            disable(id,"Función pendiente; no se ejecutan controles de demostración")
        const sort=el("multimediaSortSelect") as HTMLSelectElement | null
        if (sort) {
            sort.replaceChildren()
            const opt=document.createElement("option")
            opt.value="name";opt.textContent="Orden: nombre"
            sort.append(opt);sort.value="name";sort.disabled=true
            sort.title="Los archivos están ordenados por nombre real"
        }
        const hymnEnd=el("hymnEndBehavior") as HTMLSelectElement | null
        if (hymnEnd) {hymnEnd.disabled=true;hymnEnd.title="Comportamiento final de himno pendiente"}
        const grid=el("moduleView_multimedia")
        for(const b of grid?.querySelectorAll<HTMLButtonElement>("button") || [])
            if (["⊞","☰"].includes(b.textContent?.trim()||"")) {b.disabled=true;b.title="Vista de lista pendiente; cuadrícula real disponible"}
        el("moduleView_biblia")?.replaceChildren()
    }
    function setupNavigation() {
        const menu=el("leftModuleSidebar")
        if(!menu)return
        menu.replaceChildren()
        for(const [id,label] of [
            ["biblia","▣ Biblia"],
            ["himnario","♫ Himnario"],
            ["multimedia","▶ Multimedia"],
            ["youtube","▶ YouTube"],
            ["presentaciones","▣ Presentaciones"],
            ["fondos","▧ Fondos"],
            ["listas","☰ Listas"]
        ]) {
            const button=document.createElement("button")
            button.type="button"
            button.className="ja-nav-button w-full px-3 py-3 text-left text-sm text-slate-200 hover:bg-[#142c54] rounded-md"
            button.textContent=label
            button.setAttribute("aria-current",String(id===mode))
            if(id==="biblia"||id==="multimedia"||id==="himnario")
                button.onclick=()=>showModule(id)
            else {button.disabled=true;button.title="Módulo pendiente de integración en JA Gemini"}
            menu.append(button)
        }
    }
    function updatePreviewProgress() {
        const isScriptureDraft = !!biblePreviewRenderer && biblePreviewReady
        const playButton = el("btnPreviewPlay") as HTMLButtonElement | null
        const muteButton = el("btnPreviewMute") as HTMLButtonElement | null
        const seek = el("previewSeekSlider") as HTMLInputElement | null
        if (playButton) {
            playButton.disabled = isScriptureDraft || !previewMedia
            playButton.title = isScriptureDraft ? "Biblia: usa las flechas o selecciona otro versículo" : "Pausar/reproducir Vista previa"
        }
        if (muteButton) {
            muteButton.disabled = isScriptureDraft || !previewMedia
            if (isScriptureDraft) muteButton.title = "La Biblia no tiene audio en Vista previa"
        }
        if (seek && isScriptureDraft) seek.disabled = true
        if(previewLinkButton){previewLinkButton.disabled=!previewMedia || !playingPath || normalizeJAContentPath(prepared)!==normalizeJAContentPath(playingPath);previewLinkButton.setAttribute("aria-pressed",String(isLinkedVideo()));previewLinkButton.textContent=isLinkedVideo()?"🔗 Vinculada":"🔗 Vincular"}
        const counter = el("previewTimeCounter")
        if (counter && previewMedia) counter.textContent = time(previewMedia.currentTime) + " / " + time(previewMedia.duration)
        const slider = el("previewSeekSlider") as HTMLInputElement | null
        if (slider && previewMedia && Number.isFinite(previewMedia.duration)) {
            slider.disabled = false
            slider.max = String(previewMedia.duration)
            if (document.activeElement !== slider) slider.value = String(previewMedia.currentTime)
        }
        const play = el("btnPreviewPlay") as HTMLButtonElement | null
        if (play) play.textContent = previewMedia ? (previewMedia.paused ? "▶" : "Ⅱ") : "▶"
        const mute = el("btnPreviewMute") as HTMLButtonElement | null
        if (mute) {
            mute.textContent = previewMedia?.muted ? "🔇" : "🔊"
            mute.title = previewMedia?.muted ? "Activar escucha local de Vista previa" : "Silenciar Vista previa"
        }
    }
    function prepare(path: string) {
        biblePreviewGeneration++
        if (biblePreviewTimer) clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy()
        biblePreviewRenderer = null
        biblePreviewReady = false
        prepared = path
        const samePlayingVideo = !!(playingPath && selectedId &&
            normalizeJAContentPath(path)===normalizeJAContentPath(playingPath) &&
            !!VideoPlayer.getPlaying(playingPath,[selectedId]))
        followProgram=samePlayingVideo
        previewMedia?.pause()
        previewMedia = null
        const target = el("previewCanvasContent")
        if (!target) return
        target.replaceChildren()
        const type = getMediaType(getExtension(path))
        if (type === "video" || type === "audio") {
            const m = document.createElement(type === "video" ? "video" : "audio")
            m.className = "w-full h-full object-contain"
            m.src = encodeFilePath(path)
            m.preload = "auto"
            m.setAttribute("playsinline", "")
            m.muted = true
            m.controls = false
            m.addEventListener("timeupdate", updatePreviewProgress)
            m.addEventListener("loadedmetadata", updatePreviewProgress)
            // A selected media item should move in Preview without pressing Play.
            // Mute prevents a second, unsupervised audio source from reaching speakers.
            m.addEventListener("loadeddata", () => {
                if (previewMedia !== m || !m.isConnected) return
                if (samePlayingVideo && type==="video") {
                    syncLinkedPreview()
                } else if (previewAutoplay) {
                    void m.play().catch(() => notice("Vista previa no pudo iniciar. Comprueba formato/códec y pulsa Play."))
                }
            }, {once:true})
            m.addEventListener("play", updatePreviewProgress)
            m.addEventListener("pause", updatePreviewProgress)
            m.addEventListener("error", () => notice("Vista previa: formato o ruta no reproducible"))
            target.append(m)
            previewMedia = m
        } else {
            const img = document.createElement("img")
            img.src = encodeFilePath(path)
            img.alt = fileName(path)
            img.className = "w-full h-full object-contain"
            target.append(img)
        }
        const label = el("previewTimeCounter")
        if (label) label.textContent = fileName(path)
        updatePreviewProgress()
    }
    function project() {publishPreparedMedia()}
    function clearProgram() {
        if (!selectedId || !get(outputs)[selectedId]?.active) return notice("Selecciona una salida activa para limpiar")
        if (get(outLocked)) return notice("La salida está bloqueada")
        clearBackground(selectedId)
        // No modificar previewMedia ni prepared.
        notice("Fondo de Programa limpiado. Vista previa permanece preparada.")
    }
    function pauseProgram() {
        if (!playingPath || !selectedId) return notice("Programa no tiene vídeo activo")
        if (videoState.paused) VideoPlayer.play(playingPath, selectedId)
        else VideoPlayer.pause(playingPath, selectedId)
    }
    function muteProgram() {
        if (!playingPath || !selectedId) return notice("Programa no tiene vídeo activo")
        if(chooseOutput().length>1 && selectedId!==localStorage.getItem("ja-main-projector"))
            return notice("El audio de las salidas secundarias permanece silenciado por seguridad.")
        VideoPlayer.toggleMute(playingPath, selectedId)
    }
    function setProgramVolume() {
        if (!programVolume || !playingPath || !selectedId || get(outLocked)) return
        if(chooseOutput().length>1 && selectedId!==localStorage.getItem("ja-main-projector")) return
        const session = VideoPlayer.getPlaying(playingPath, [selectedId])
        if (!session) return
        const next = Number(programVolume.value)
        if (!Number.isFinite(next)) return
        const level = Math.max(0, Math.min(100, next)) / 100
        // A session-local value is safer than writing a global media preference.
        playingVideos.update(sessions => {
            if (!sessions.includes(session)) return sessions
            session.volume = level
            return [...sessions]
        })
        VideoPlayer.updateVolume(playingPath)
        programVolume.title = "Volumen de Programa: " + Math.round(level * 100) + "%"
    }
    onMount(() => {
        try {
            previewAutoplay = localStorage.getItem("ja-gemini-preview-autoplay") !== "false"
            compactUi = localStorage.getItem("ja-gemini-compact-ui") === "true"
            largeUi = localStorage.getItem("ja-gemini-large-ui") === "true"
            const storedLogo=localStorage.getItem("ja-gemini-logo-path") || ""
            if(!storedLogo || (/\.(png|jpe?g|webp)$/i.test(storedLogo) && !/^(?:https?:|data:|blob:)/i.test(storedLogo))) customLogoPath=storedLogo
            const size=Number(localStorage.getItem("ja-gemini-logo-size") || "1.35")
            if(Number.isFinite(size)) logoScale=Math.max(0.35,Math.min(2.5,size))
            const position=localStorage.getItem("ja-gemini-logo-position") || "center"
            if(position in logoPositions) logoPosition=position as typeof logoPosition
            const storedFiles = JSON.parse(localStorage.getItem("ja-gemini-selected-media-files") || "[]")
            selectedMediaPaths = Array.isArray(storedFiles) ? storedFiles.filter((p):p is string => typeof p==="string" && !!geminiFileType(p)).slice(0,5000) : []
        } catch {}
        setupNavigation()
        collectMockText()
        removeInertGeminiControls()
        connectMediaTypeFilters()
        installFolderPicker()
        ensureJAOutputEffects()
        showModule("multimedia")
        void registerJAMediaFolders().then(() => scanMediaFolders()).catch(err => notice("Error al preparar carpetas: "+String(err)))
        const program = el("programCanvasContent")
        if (program) program.replaceChildren()
        const preview = el("previewCanvasContent")
        if (preview) { preview.replaceChildren(); preview.textContent = "Selecciona un archivo para preparar Vista previa" }
        const slider = el("previewSeekSlider") as HTMLInputElement | null
        if (slider) {
            slider.disabled = true
            slider.addEventListener("input", () => {
                const seconds=Number(slider.value) || 0
                if (!previewMedia) return
                if(isLinkedVideo())VideoPlayer.seekTo(playingPath,selectedId,seconds)
                else previewMedia.currentTime=seconds
            })
        }
        bind("btnPreviewPlay", () => {
            if(!previewMedia)return
            if(isLinkedVideo()){
                if(videoState.paused)VideoPlayer.play(playingPath,selectedId)
                else VideoPlayer.pause(playingPath,selectedId)
            }else if(previewMedia.paused)void previewMedia.play().catch(()=>notice("No se pudo iniciar Vista previa"))
            else previewMedia.pause()
        })
        bind("btnPreviewMute",()=>{if(previewMedia){if(isLinkedVideo()){previewMedia.muted=true;notice("Vista previa vinculada permanece silenciada para evitar audio duplicado")}else previewMedia.muted=!previewMedia.muted;updatePreviewProgress()}})
        const previewControls=el("btnPreviewPlay")?.parentElement
        if(previewControls){
            const link=document.createElement("button")
            link.type="button";link.className="ja-video-link-button";link.title="Vincular o desvincular reproducción local con el mismo vídeo de Programa"
            link.onclick=toggleFollowProgram
            previewControls.append(link);previewLinkButton=link
            cleanup.push(()=>link.remove())
            updatePreviewProgress()
        }
        bind("btnBridgeQuickPlay",project)
        bind("btnBridgeCut",publishPreparedMedia)
        // Fundido y los demás efectos no validados se retiran temporalmente.
        el("btnBridgeFade")?.remove()
        bind("btnBridgeBlack",()=>setOperatorEffect(JA_BLACK))
        bind("btnBridgeLogo",()=>setOperatorEffect(JA_LOGO))
        const logoButton=el("btnBridgeLogo")
        if(logoButton)logoButton.title="Activar o retirar logo propio en Programa. Elegir archivo en Configuración JA → Logo y marca."
        bind("btnProgramPause", pauseProgram)
        bind("btnBridgeClearText", clearSelectedTextLayer)
        // Negro, Logo y Fundido siguen bloqueados hasta comprobar su efecto real por salida.
        // Nunca ejecutar un aviso de éxito como sustituto de proyección.
        const programStatus = el("programTimeCounter")?.parentElement
        if (programStatus) {
            programStatus.parentElement?.classList.add("ja-program-transport")
            programSeek = document.createElement("input")
            programSeek.id = "jaProgramSeek"
            programSeek.type = "range"
            programSeek.min = "0"; programSeek.max = "1"; programSeek.step = "0.1"
            programSeek.disabled = true
            programSeek.title = "Buscar posición real del vídeo en Programa"
            programSeek.className = "ja-program-seek"
            programSeek.addEventListener("change", () => {
                if (playingPath && selectedId && programSeek) VideoPlayer.seekTo(playingPath, selectedId, Number(programSeek.value))
            })
            programStatus.append(programSeek)
            cleanup.push(() => programSeek?.remove())
        }
        const programButtons = el("btnProgramPause")?.parentElement
        if (programButtons) {
            const clear = document.createElement("button")
            clear.type = "button"; clear.textContent = "✕"
            clear.title = "Limpiar solo el fondo de Programa"
            clear.className = "text-xs border border-[#355681] px-2 py-1 rounded text-white"
            clear.onclick = clearProgram
            programButtons.append(clear)
            cleanup.push(() => clear.remove())
            const mute = document.createElement("button")
            mute.type = "button"; mute.textContent = "🔊"
            mute.title = "Silenciar/reactivar vídeo de Programa"
            mute.className = clear.className
            mute.onclick = muteProgram
            programMute = mute
            programButtons.append(mute)
            cleanup.push(() => mute.remove())
        }

        // En esta versión existe UNA sola vista de preparación y UNA salida JA.
        // «Vista previa a todas» nunca tuvo un buffer de preview por destino;
        // «Programa a todas» exige asignar y verificar previamente los monitores.
        // No mostrar botones inertes hasta implementar esa arquitectura.
        el("btnProgramToAll")?.remove()
        el("btnPreviewToAll")?.remove()
        disable("btnProjectSelectedVerse", "Biblia todavía no integrada en esta prueba")
        bind("btnAddMultimedia", toggleAddMediaMenu)
        const addMedia = el("btnAddMultimedia")
        if (addMedia) { addMedia.title = "Añadir archivos individuales o vincular una carpeta"; addMedia.setAttribute("aria-haspopup","true") }
        document.addEventListener("click",outsideMediaMenu)
        window.addEventListener("keydown",escapeConsole,true)
        cleanup.push(()=>document.removeEventListener("click",outsideMediaMenu),()=>window.removeEventListener("keydown",escapeConsole,true))
        bind("btnLargeTextToggle", () => {
            largeUi = !largeUi
            saveOperatorPreferences()
            const toggle = el("btnLargeTextToggle")
            toggle?.setAttribute("aria-pressed",String(largeUi))
            notice("Texto de interfaz " + (largeUi ? "ampliado" : "normal"))
        })
        bind("btnResetTargets", resetTargetSelection)
        bind("btnPreviewFullscreen", () => toggleLocalFullscreen("previewCanvasContent"))
        bind("btnProgramFullscreen", () => toggleLocalFullscreen("programCanvasContent"))
        bind("btnMultiScreenMenu", openScreenSettings)
        window.addEventListener("keydown", operatorShortcuts, true)
        cleanup.push(() => window.removeEventListener("keydown", operatorShortcuts, true))
        bind("btnOpenSettingsModal", () => { settingsOpen = true })
        programVolume = el("programVolumeSlider") as HTMLInputElement | null
        if (programVolume) {
            programVolume.min = "0"
            programVolume.max = "100"
            programVolume.step = "1"
            programVolume.title = "Volumen real de la sesión en Programa (una salida)"
            programVolume.addEventListener("input", setProgramVolume)
            cleanup.push(() => programVolume?.removeEventListener("input", setProgramVolume))
            updateTransport()
        }
        const hymnSearch = el("hymnModuleSearch")
        const mediaSearch = el("multimediaSearchInput")
        hymnSearch?.addEventListener("input", renderLibrary)
        mediaSearch?.addEventListener("input", renderLibrary)
        cleanup.push(() => hymnSearch?.removeEventListener("input", renderLibrary), () => mediaSearch?.removeEventListener("input", renderLibrary))
        const uOutputs = outputs.subscribe(() => { rebuildOutputs(); renderRealHeader() })
        const uSaved = saved.subscribe(() => renderRealHeader())
        const uFolders = mediaFolders.subscribe(() => { void scanMediaFolders() })
        const uBibles = scriptures.subscribe(() => { if(mode==="biblia") {updateBibleUI();scheduleBiblePreview()} })
        const uScriptureDraft = activeScripture.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleTab = drawerTabsData.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleTemplate = templates.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleSettings = scriptureSettings.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        window.addEventListener("keydown", keyboardGeminiBible, true)
        cleanup.push(() => window.removeEventListener("keydown", keyboardGeminiBible, true))
        const uHymn = hymnVideos.subscribe(() => { if(mode==="himnario")renderLibrary() })
        const uCollections = hymnCollectionPaths.subscribe(() => { if(mode==="himnario")renderLibrary() })
        const uRoots = hymnSourcePaths.subscribe(() => { void scanMediaFolders() })
        const uStatuses = hymnSourceStatus.subscribe(() => { if(mode==="himnario")renderToolbar() })
        cleanup.push(uOutputs, uSaved, uFolders, uBibles, uScriptureDraft, uBibleTab, uBibleTemplate, uBibleSettings, uHymn, uCollections, uRoots, uStatuses)
        rebuildOutputs()
        return () => {
            if (timer) clearTimeout(timer)
            closeLocalExpanded()
            closeAddMediaMenu()
            scanGeneration++
            thumbObserver?.disconnect()
            thumbObserver = null
            scriptureView?.$destroy()
            scriptureView=null
            biblePreviewGeneration++
            if (biblePreviewTimer) clearTimeout(biblePreviewTimer)
            biblePreviewRenderer?.$destroy()
            biblePreviewRenderer = null
            for (const renderer of screenRenderers) renderer.$destroy()
            screenRenderers=[]
            libraryToolbar?.remove()
            previewMedia?.pause()
            stopVideoState?.()
            programRenderer?.$destroy()
            for (const off of cleanup) off()
            cleanup = []
        }
    })
</script>

<svelte:head><link rel="stylesheet" href="ja-gemini.css" /><link rel="stylesheet" href="ja-gemini-layout.css" /></svelte:head>
<div class={"ja-gemini-host " + geminiBodyClasses + (compactUi ? " ja-compact-ui" : "") + (largeUi ? " ja-large-ui" : "")} bind:this={host}>
    {@html geminiHtml}
    {#if settingsOpen}
        <JaGeminiSettings
            selectedOutputId={selectedId}
            logoName={customLogoPath?fileName(customLogoPath):"Logo predeterminado JA"}
            {logoScale}
            {logoPosition}
            {previewAutoplay}
            {compactUi}
            {largeUi}
            startSection={settingsStartSection}
            on:previewAutoplayChange={(event) => {
                previewAutoplay = event.detail.enabled
                if (!previewAutoplay) previewMedia?.pause()
                saveOperatorPreferences()
            }}
            on:compactUiChange={(event) => { compactUi = event.detail.enabled; saveOperatorPreferences() }}
            on:largeUiChange={(event) => { largeUi = event.detail.enabled; saveOperatorPreferences() }}
            on:resetPreferences={resetOperatorPreferences}
            on:chooseLogo={selectLogoImage}
            on:resetLogo={resetLogoImage}
            on:logoScaleChange={(event) => {
                logoScale=Math.max(0.35,Math.min(2.5,Number(event.detail.value)||1.35))
                updateLogoEffect();persistLogoSettings()
            }}
            on:logoPositionChange={(event) => {
                if(event.detail.value in logoPositions) {
                    logoPosition=event.detail.value
                    updateLogoEffect();persistLogoSettings()
                }
            }}
            on:close={() => { settingsOpen = false }}
            on:selectOutput={(event) => { selectedId = event.detail.id; rebuildOutputs() }}
            on:assignDisplay={(event) => assignMonitorToOutput(event.detail.displayId,event.detail.bounds,event.detail.outputId)}
            on:createDisplayOutput={(event) => createPhysicalOutput(event.detail.displayId,event.detail.bounds,event.detail.name)}
            on:linkMedia={() => sendMain(Main.OPEN_FOLDER, {channel:"JA_GEMINI_MEDIA_FOLDER",title:"Vincular carpeta Multimedia"})}
            on:linkHymn={(event) => {
                collection = event.detail.collection
                sendMain(Main.OPEN_FOLDER, {channel:"JA_GEMINI_HYMN_FOLDER",title:"Vincular " + collection})
            }}
            on:refreshMedia={() => { void scanMediaFolders() }}
            on:refreshHymn={() => { void refreshJAHymnLibrary() }}
        />
    {/if}
</div>
<style>
    .ja-gemini-host { width: 100%; height: 100%; overflow: hidden; position: relative; }
    .ja-gemini-host :global(#programCanvasContent .previewOutput) { width: 100%; height: 100%; }
    .ja-gemini-host :global(#programCanvasContent .center) { width: 100%; height: 100%; }
</style>
