<script lang="ts">
    // Puente real Gemini -> servicios FreeShow. No ejecuta los scripts del mock.
    import { onMount, tick } from "svelte"
    import { uid } from "uid"
    import type { FileFolder } from "../../../types/Main"
    import type { AssetItem } from "../../../types/Effects"
    import { Main } from "../../../types/IPC/Main"
    import { ToMain } from "../../../types/IPC/ToMain"
    import { requestMain, sendMain, receiveToMain, destroyMain } from "../../IPC/main"
    import { geminiCounts, geminiFileType, geminiLocalFiles, geminiSearch, geminiHymnSearch, type GeminiFile, type GeminiMediaType } from "../../utils/jaGeminiLibrary"
    import { isPathInJACollection, normalizeJAContentPath } from "../../utils/jaHymnPaths"
    import { hymnVideos, hymnCollectionPaths, hymnSourcePaths, hymnLinks, hymnSourceStatus, linkHymnFolder, unlinkHymnFolder, refreshJAHymnLibrary } from "../../utils/jaHymnLibrary"
    import { registerJAMediaFolders } from "../../utils/jaMediaFolders"
    import { videoExtensions, imageExtensions, audioExtensions } from "../../values/extensions"
    import { queuedHymnThumbnail } from "../../utils/jaHymnThumbnailQueue"
    import { registerJARV1909 } from "../drawer/bible/jaBundledBible"
    import { jaControlledOutputId } from "../../utils/jaControlledOutput"
    import { sendScriptureToJAOutputs, prepareGeminiScriptureDraft, getLiveScriptureOutputIds, refreshLiveScripture } from "../drawer/bible/scripture"
    import Scripture from "../drawer/bible/Scripture.svelte"
    import { get } from "svelte/store"
    import { geminiHtml, geminiBodyClasses } from "./gemini-fragment.generated"
    import { activeScripture, effects, mediaFolders, outputs, outLocked, playingVideos, saved, scriptures, scriptureMode, scriptureSettings, templates, drawerTabsData } from "../../stores"
    import { encodeFilePath, getExtension, getMediaType } from "../helpers/media"
    import { clearBackground, clearSlide } from "../output/clear"
    import { addOutput, sendToJAOutputs, setOutput, toggleOutputs } from "../helpers/output"
    import { OUTPUT } from "../../../types/Channels"
    import { send } from "../../utils/request"
    import { VideoPlayer } from "../media/video/videoPlayer"
    import { setJAPrimaryAudioRouting } from "../../audio/routing/audioRoutingInit"
    import { playingAudio, playerVideos, audioRouting } from "../../stores"
    import { jaPlaylists, jaReadPlaylists, jaWritePlaylists, jaNewPlaylist, jaLocalPlaylistEntry,
        jaYoutubePlaylistEntry, jaYoutubeId, jaMoveEntry, jaMoveEntryTo, jaShuffleOrder, jaNextIndex, jaPlaybackMode, JA_MAX_PLAYLISTS, JA_MAX_ENTRIES,
        type JAPlaylist, type JAPlaylistEntry } from "../../utils/jaGeminiPlaylists"
    import JaGeminiPlaylistPanel from "./JaGeminiPlaylistPanel.svelte"
    import JaGeminiQuickAudioPanel from "./JaGeminiQuickAudioPanel.svelte"
    import JaGeminiYouTube from "./JaGeminiYouTube.svelte"
    import JaGeminiYouTubePreview from "./JaGeminiYouTubePreview.svelte"
    import JaGeminiPresentations from "./JaGeminiPresentations.svelte"
    import JaGeminiWindowCapture from "./JaGeminiWindowCapture.svelte"
    import JaGeminiPresentationPreview from "./JaGeminiPresentationPreview.svelte"
    import JaGeminiAudioControls from "./JaGeminiAudioControls.svelte"
    import { JaSoloAudioPlayer } from "./JaSoloAudioPlayer"
    import { videoSync } from "../media/video/videoSync"
    import PreviewOutput from "../output/preview/PreviewOutput.svelte"
    import JaGeminiBiblePreview from "./JaGeminiBiblePreview.svelte"
    import JaGeminiBibleEditor from "./JaGeminiBibleEditor.svelte"
    import { jaBibleAppearances, loadJABibleAppearances, setJABibleAppearance } from "../../utils/jaBibleAppearance"
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
    // Checked group destinations are independent of the single inspected output.
    let syncedTargetIds = new Set<string>()
    let quickTargetsInitialized = false
    let publishingGroup = false
    let mode: "multimedia" | "himnario" | "biblia" | "youtube" | "presentaciones" | "captura" = "multimedia"
    // Restore the approved card design; only the number of shown cards grows.
    // Never create all 613 thumbnail requests at once on low-end machines.
    const LIBRARY_FIRST_BATCH = 160
    const LIBRARY_NEXT_BATCH = 80
    let libraryFiles: GeminiFile[] = []
    let libraryGrid: HTMLElement | null = null
    let libraryRendered = 0
    let libraryMore: HTMLElement | null = null
    let scriptureView: Scripture | null = null
    let scriptureTarget: HTMLElement | null = null
    let activeBibleId = ""
    let screenRenderers: PreviewOutput[] = []
    let screenStructure = ""
    let operatorDisplayId = ""
    let knownExternalDisplayIds = new Set<string>()
    let displaysChecked = false
    // Native windows are distinct from projection content. Hidden windows must
    // not stop the audio or change the recorded FreeShow output content.
    const JA_SCREEN_PROFILES="ja-gemini-monitor-profiles-v1"
    const JA_HIDDEN_OUTPUTS="ja-gemini-manually-hidden-outputs-v1"
    const JA_HABITUAL_PRIMARY="ja-gemini-habitual-main-output-v1"
    let screenProfiles:Record<string,string>={}
    let manuallyHiddenOutputs=new Set<string>()
    let habitualPrimaryId=""
    let restoreCandidateId=""
    let screenNotice=""
    let hideNoScreenNotice=false
    let screenNoticeTimer:ReturnType<typeof setTimeout>|null=null
    let audioProblemTimer:ReturnType<typeof setTimeout>|null=null
    let playlistNoticeTimer:ReturnType<typeof setTimeout>|null=null
    // Transient banners expire automatically. A pending "restore primary"
    // decision remains visible until the user chooses how to proceed.
    $: {
        const current=screenNotice
        if(screenNoticeTimer)clearTimeout(screenNoticeTimer)
        if(current && !restoreCandidateId)
            screenNoticeTimer=setTimeout(()=>{if(screenNotice===current && !restoreCandidateId)screenNotice=""},7000)
    }
    $: {
        const current=audioProblem
        if(audioProblemTimer)clearTimeout(audioProblemTimer)
        if(current)audioProblemTimer=setTimeout(()=>{if(audioProblem===current)audioProblem=""},8500)
    }
    $: {
        const current=playlistNotice
        if(playlistNoticeTimer)clearTimeout(playlistNoticeTimer)
        if(current)playlistNoticeTimer=setTimeout(()=>{if(playlistNotice===current)playlistNotice=""},8500)
    }
    let screenPoll:ReturnType<typeof setInterval>|null=null
    let displayRefreshBusy=false
    let previousExternalSignature=""
    type JAExternalDisplay={id:number;label?:string;bounds:{x:number;y:number;width:number;height:number}}
    const fingerprint=(d:JAExternalDisplay)=>String(d.id)+"|"+(d.label||"").trim().toLowerCase()
    // A monitor's identity survives a Windows resolution/orientation change,
    // but the geometry must trigger a fresh placement of its output window.
    const displayGeometry=(d:JAExternalDisplay)=>[d.bounds.x,d.bounds.y,d.bounds.width,d.bounds.height].join(",")
    const sameDisplayBounds=(a:{x:number;y:number;width:number;height:number}|undefined,
        b:{x:number;y:number;width:number;height:number})=>!!a &&
        a.x===b.x && a.y===b.y && a.width===b.width && a.height===b.height
    function saveScreenMemory(){
        try{
            localStorage.setItem(JA_SCREEN_PROFILES,JSON.stringify(screenProfiles))
            localStorage.setItem(JA_HIDDEN_OUTPUTS,JSON.stringify([...manuallyHiddenOutputs]))
            if(habitualPrimaryId)localStorage.setItem(JA_HABITUAL_PRIMARY,habitualPrimaryId)
            else localStorage.removeItem(JA_HABITUAL_PRIMARY)
        }catch{screenNotice="No se pudo guardar la configuración de pantallas."}
    }
    async function refreshDisplaySafety(){
        if(displayRefreshBusy)return
        displayRefreshBusy=true
        try {
            const displays=await requestMain(Main.GET_DISPLAYS)
            const operator=displays?.find(d=>(d as typeof d & {jaOperatorDisplay?:boolean}).jaOperatorDisplay) ||
                displays?.find(d=>d.internal)
            operatorDisplayId=operator ? String(operator.id) : ""
            const external=(displays||[]).filter(d=>operatorDisplayId && String(d.id)!==operatorDisplayId)
            const previouslyConnected=new Set(knownExternalDisplayIds)
            knownExternalDisplayIds=new Set(external.map(d=>String(d.id)))
            displaysChecked=true
            const signature=external.map(d=>fingerprint(d)+"@"+displayGeometry(d)).sort().join(";")
            if(signature!==previousExternalSignature){
                previousExternalSignature=signature
                screenStructure=""
                await reconcileWindowsDisplays(external,previouslyConnected)
            }
            rebuildOutputs()
        } catch(error){
            displaysChecked=true
            knownExternalDisplayIds=new Set()
            screenNotice="No se pudo consultar Windows. Revisa la conexión de monitores antes de proyectar."
        }finally{displayRefreshBusy=false}
    }
    async function validateExternalDisplay(displayId:number){
        const displays=await requestMain(Main.GET_DISPLAYS)
        const operator=displays?.find(d=>(d as typeof d & {jaOperatorDisplay?:boolean}).jaOperatorDisplay) ||
            displays?.find(d=>d.internal)
        const requested=displays?.find(d=>d.id===displayId)
        if(!operator || !requested || operator.id===requested.id)return null
        return requested
    }

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
    let programLoopButton: HTMLButtonElement | null = null
    let loopBusy=false
    const VIDEO_LOOP_STORAGE="ja-gemini-per-screen-video-loop-v1"
    let videoLoopPrefs:Record<string,Record<string,boolean>>={}
    let previewMedia: HTMLMediaElement | null = null
    let jaAudioPath=""
    let jaAudioBusy=false
    let jaAudioGeneration=0
    let jaAudioContainer: HTMLDivElement | null = null
    let jaAudioControls: JaGeminiAudioControls | null = null
    let playlistOpen=false
    let playlistDockReady=false
    let playlistDockStyle=""
    let playlistModuleArea:HTMLElement|null=null
    let playlistModuleAreaPadding=""
    let playlistDockObserver:ResizeObserver|null=null
    let quickAudioOpen=false
    let capturePanel:JaGeminiWindowCapture|null=null
    // Keep the Svelte capture receiver mounted when the operator visits
    // another module. Output windows capture their own independent stream.
    let captureParking:HTMLDivElement|null=null
    const captureKnownNames=new Map<string,string>()
    let captureGlobalStatus:HTMLDivElement|null=null
    let captureStatusSignature=""
    let capturePanelSignature=""
    function captureAssignments():Record<string,string[]>{
        const result:Record<string,string[]>={}
        for(const id of chooseOutput()){
            const bg=get(outputs)[id]?.out?.background
            if(bg?.type!=="screen"||!bg.id)continue
            const sourceId=String(bg.id)
            if(!result[sourceId])result[sourceId]=[]
            result[sourceId].push(id)
        }
        return result
    }
    function refreshCaptureModule(){
        if(!capturePanel)return
        const destinations=jaYouTubeDestinations()
        const selectedTargets=markedGroupTargets()
        const assigned=captureAssignments()
        const signature=JSON.stringify({destinations,selectedTargets,assigned})
        if(signature===capturePanelSignature)return
        capturePanelSignature=signature
        capturePanel.$set({destinations,selectedTargets,assigned})
    }
    function removeJACaptureFromScreens(sourceId:string){
        if(!sourceId)return
        const ids=captureAssignments()[sourceId]||[]
        if(!ids.length)return notice("Esta captura ya no está proyectada.")
        if(get(outLocked))return notice("Las salidas están bloqueadas.")
        for(const id of ids){
            const bg=get(outputs)[id]?.out?.background
            if(bg?.type==="screen"&&bg.id===sourceId)clearBackground(id)
        }
        rebuildOutputs()
        notice("Captura retirada de "+ids.length+" pantalla(s). Las demás salidas permanecen intactas.")
    }
    function publishJAWindowCapture(sourceId:string,name:string,targets:string[]){
        const selected=capturePanel?.getActiveCapture()
        if(!sourceId || selected?.sourceId!==sourceId || !selected.stream.active)
            return notice("Inicia primero la captura real de esa ventana.")
        const live=chooseOutput()
        if(get(outLocked)||!targets.length||targets.some(id=>!live.includes(id)))
            return notice("Selecciona una o varias pantallas externas activas.")
        captureKnownNames.set(sourceId,name)
        const sent=sendToJAOutputs("background",{id:sourceId,type:"screen"},targets,{replaceScripture:true,requireAll:true})
        if(sent.length!==targets.length)return notice("No se pudo enviar la captura a todos los destinos.")
        clearBlackBeforePublishing(targets)
        rebuildOutputs()
        notice("Captura de "+name+" enviada a "+targets.length+" pantalla(s); seguirá activa al cambiar de módulo.")
    }
    function refreshCaptureGlobalStatus(){
        const groups=captureAssignments()
        const entries=Object.entries(groups).filter(([,ids])=>ids.length)
        if(!entries.length){
            captureGlobalStatus?.remove()
            captureGlobalStatus=null
            captureStatusSignature=""
            return
        }
        const signature=JSON.stringify(entries.map(([sourceId,ids])=>[sourceId,captureKnownNames.get(sourceId)||"",ids.map(id=>get(outputs)[id]?.name||id)]))
        if(signature===captureStatusSignature && captureGlobalStatus?.isConnected)return
        captureStatusSignature=signature
        if(!captureGlobalStatus){
            const row=el("quickTargetButtons")
            if(!row?.parentElement)return
            captureGlobalStatus=document.createElement("div")
            captureGlobalStatus.className="ja-capture-live-strip"
            captureGlobalStatus.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;background:#102b48;border:1px solid #346487;border-radius:7px;font-size:11px;color:#d9edff;margin-top:4px;"
            row.parentElement.after(captureGlobalStatus)
        }
        captureGlobalStatus.replaceChildren()
        const title=document.createElement("strong")
        title.textContent="▣ Capturas proyectadas:"
        captureGlobalStatus.append(title)
        for(const [sourceId,ids] of entries){
            const item=document.createElement("span")
            item.textContent=(captureKnownNames.get(sourceId)||"Ventana Windows")+" · "+ids.map(id=>get(outputs)[id]?.name||id).join(", ")
            item.style.cssText="padding:3px 6px;border-radius:5px;background:#1a456b;"
            captureGlobalStatus.append(item)
            const button=document.createElement("button")
            button.type="button"
            button.textContent="✕ Retirar"
            button.title="Retirar esta captura únicamente de sus pantallas"
            button.style.cssText="padding:3px 7px;border:1px solid #5d89a9;border-radius:5px;"
            button.onclick=()=>removeJACaptureFromScreens(sourceId)
            captureGlobalStatus.append(button)
        }
    }
    let capturePreviewVideo:HTMLVideoElement|null=null
    function stopJAWindowCapturePreview(){
        capturePreviewVideo?.pause()
        if(capturePreviewVideo)capturePreviewVideo.srcObject=null
        capturePreviewVideo?.remove()
        capturePreviewVideo=null
    }
    function stageJAWindowCapture(stream:MediaStream,name:string){
        const target=el("previewCanvasContent")
        if(!target)return
        clearYouTubePreview()
        clearPresentationPreview()
        previewMedia?.pause();previewMedia=null
        biblePreviewGeneration++
        if(biblePreviewTimer)clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy();biblePreviewRenderer=null
        biblePreviewReady=false
        prepared=""
        followProgram=false
        stopJAWindowCapturePreview()
        target.replaceChildren()
        const player=document.createElement("video")
        player.autoplay=true
        player.muted=true
        player.playsInline=true
        player.style.cssText="display:block;width:100%;height:100%;object-fit:contain;background:#020817;"
        player.setAttribute("aria-label","Vista previa de captura: "+name)
        player.srcObject=stream
        target.append(player)
        capturePreviewVideo=player
        void player.play().catch(error=>notice("Windows bloqueó la vista previa de captura: "+String(error)))
        const counter=el("previewTimeCounter")
        if(counter)counter.textContent="Captura · "+name
        const seek=el("previewSeekSlider") as HTMLInputElement|null
        if(seek){seek.disabled=true;seek.value="0"}
        const play=el("btnPreviewPlay") as HTMLButtonElement|null
        if(play){play.disabled=true;play.title="Captura en directo; no es un vídeo reproducible"}
        const mute=el("btnPreviewMute") as HTMLButtonElement|null
        if(mute){mute.disabled=true;mute.title="Prueba de captura de imagen sin audio"}
        if(previewLinkButton)previewLinkButton.disabled=true
    }
    function stopJAWindowCapture(){
        capturePanel?.stopCapture()
        stopJAWindowCapturePreview()
    }
    let presentationsPanel:JaGeminiPresentations|null=null
    let presentationPreview:JaGeminiPresentationPreview|null=null
    let presentationPreviewPath=""
    let presentationPdfPath=""
    let presentationSourceName=""
    let presentationPage=0
    let presentationPageCount=0
    let presentationLoadToken=0
    let presentationControlledOutputs:string[]=[]
    let presentationRemoteEnabled=false
    let presentationRemoteMode:"preview"|"program"="program"
    let presentationRemoteError=""
    let presentationRemotePending=false
    let presentationRemoteLastAt=0
    function updateRemotePanel(){
        presentationsPanel?.$set({remoteEnabled:presentationRemoteEnabled,
            remoteMode:presentationRemoteMode,remoteError:presentationRemoteError,
            remoteTargets:[...presentationControlledOutputs]})
    }
    async function setJAPresentationRemoteEnabled(enabled:boolean){
        if(presentationRemotePending)return
        if(enabled && (!presentationPdfPath || !presentationPageCount)){
            presentationRemoteError="Abre primero una presentación real."
            updateRemotePanel()
            return
        }
        if(enabled && presentationRemoteMode==="program" && !presentationControlledOutputs.length){
            presentationRemoteError="Primero envía una diapositiva a Programa para asignar las pantallas."
            updateRemotePanel()
            return
        }
        presentationRemotePending=true
        try{
            const result=await requestMain(Main.JA_PRESENTATION_REMOTE_SET,{enabled})
            presentationRemoteEnabled=!!result?.enabled
            presentationRemoteError=result?.error||""
            if(enabled&&!presentationRemoteEnabled && !presentationRemoteError)
                presentationRemoteError="No fue posible registrar las teclas del control."
            updateRemotePanel()
        }catch(err){
            presentationRemoteEnabled=false
            presentationRemoteError=String(err)
            updateRemotePanel()
        }finally{presentationRemotePending=false}
    }
    function setJAPresentationRemoteMode(value:"preview"|"program"){
        presentationRemoteMode=value
        presentationRemoteError=""
        updateRemotePanel()
    }
    function presentationOnAirTargets():string[]{
        const available=chooseOutput()
        const live=get(outputs)
        return presentationControlledOutputs.filter(id=>
            available.includes(id)&&live[id]?.out?.slide?.type==="pdf" &&
            live[id]?.out?.slide?.id===presentationPdfPath)
    }
    function remotePresentationStep(direction:"next"|"previous"){
        if(!presentationRemoteEnabled || !presentationPdfPath || !presentationPageCount)return
        const now=Date.now()
        if(now-presentationRemoteLastAt<180)return
        presentationRemoteLastAt=now
        const offset=direction==="next"?1:-1
        if(presentationRemoteMode==="preview"){
            if(mode!=="presentaciones" || !presentationPreview)return
            movePresentationPage(offset)
            return
        }
        if(get(outLocked))return
        const targets=presentationOnAirTargets()
        if(!targets.length){
            presentationRemoteError="La presentación ya no está proyectada en las pantallas asignadas."
            updateRemotePanel()
            return
        }
        // Drive from the actual on-air page, not the independently prepared
        // Preview page. Do not silently overwrite any unrelated screen.
        const live=get(outputs)
        const positions=targets.map(id=>Number(live[id]?.out?.slide?.page))
        if(positions.some(n=>!Number.isInteger(n)||n<0||n>=presentationPageCount)||
            positions.some(n=>n!==positions[0])){
            presentationRemoteError="Las pantallas tienen diapositivas distintas; sincronízalas manualmente."
            updateRemotePanel()
            return
        }
        const next=Math.max(0,Math.min(presentationPageCount-1,positions[0]+offset))
        if(next===positions[0])return
        const sent=sendToJAOutputs("slide",{
            type:"pdf",id:presentationPdfPath,page:next,pages:presentationPageCount,name:presentationSourceName
        },targets,{requireAll:true})
        if(sent.length!==targets.length){
            presentationRemoteError="Una pantalla dejó de estar disponible. Revisa las salidas."
            updateRemotePanel()
            return
        }
        presentationRemoteError=""
        if(mode==="presentaciones")stagePresentationPage(presentationPdfPath,next,presentationPageCount,presentationSourceName)
        else presentationPage=next
        updateRemotePanel()
    }
    function clearPresentationPreview(){
        presentationPreview?.$destroy()
        presentationPreview=null
        presentationPreviewPath=""
    }
    function refreshPresentationModule(){
        if(!presentationsPanel)return
        presentationsPanel.$set({
            pdfPath:presentationPdfPath,
            displayName:presentationSourceName,
            currentPage:presentationPage,
            destinations:jaYouTubeDestinations(),
            selectedTargets:markedGroupTargets(),
            remoteEnabled:presentationRemoteEnabled,remoteMode:presentationRemoteMode,
            remoteError:presentationRemoteError,remoteTargets:[...presentationControlledOutputs]
        })
    }
    function stagePresentationPage(path:string,page:number,count:number,name:string){
        if(!path || !/\.pdf$/i.test(path) || !Number.isInteger(page) || page<0 || page>=count)return
        const target=el("previewCanvasContent")
        if(!target)return
        clearYouTubePreview()
        const reuse=!!presentationPreview && presentationPreviewPath===path
        if(!reuse)clearPresentationPreview()
        previewMedia?.pause();previewMedia=null
        biblePreviewGeneration++
        if(biblePreviewTimer)clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy();biblePreviewRenderer=null
        biblePreviewReady=false
        prepared=""
        followProgram=false
        if(!reuse)target.replaceChildren()
        presentationPdfPath=path
        presentationPage=page
        presentationPageCount=count
        presentationSourceName=name
        if(reuse) presentationPreview?.$set({page,title:name})
        else {
            presentationPreviewPath=path
            presentationPreview=new JaGeminiPresentationPreview({target,props:{path,page,title:name}})
        }
        refreshPresentationModule()
        updatePreviewProgress()
    }
    function movePresentationPage(delta:number){
        if(!presentationPdfPath || !presentationPageCount)return
        const next=Math.max(0,Math.min(presentationPageCount-1,presentationPage+delta))
        if(next===presentationPage)return
        stagePresentationPage(presentationPdfPath,next,presentationPageCount,presentationSourceName)
    }
    function openJAPresentationFile(){
        sendMain(Main.OPEN_FILE,{
            id:"ja-gemini-presentation",
            channel:"JA_GEMINI_PRESENTATION_FILE",
            title:"Abrir presentación PowerPoint o PDF",
            multiple:false,
            read:false,
            filter:{name:"Presentaciones PDF y PowerPoint",extensions:["pdf","ppt","pptx"]}
        })
    }
    async function loadJAPresentationFile(path:string){
        if(!/\.(pdf|ppt|pptx)$/i.test(path))return notice("Elige un PDF o PowerPoint .ppt/.pptx.")
        const token=++presentationLoadToken
        const converted=/\.pdf$/i.test(path)?{path}:await requestMain(Main.JA_PRESENTATION_PDF,{path},undefined,130000)
        if(token!==presentationLoadToken)return
        if(!converted?.path)return notice(converted?.error||"No fue posible convertir la presentación. Revisa PowerPoint o LibreOffice.")
        if(presentationRemoteEnabled)void setJAPresentationRemoteEnabled(false)
        presentationControlledOutputs=[]
        presentationPdfPath=converted.path
        presentationSourceName=fileName(path)
        presentationPage=0
        presentationPageCount=0
        if(mode!=="presentaciones")showModule("presentaciones")
        refreshPresentationModule()
        notice("Presentación abierta. Cargando diapositivas reales en Vista previa.")
    }
    function publishJAPresentation(){
        if(mode!=="presentaciones"||!presentationPreview||!presentationPdfPath||!presentationPageCount)
            return notice("Selecciona una diapositiva real en Vista previa.")
        const targets=markedGroupTargets()
        const available=chooseOutput()
        if(get(outLocked)||!targets.length||targets.some(id=>!available.includes(id)))
            return notice("Marca una pantalla activa para enviar la presentación.")
        const data={type:"pdf",id:presentationPdfPath,page:presentationPage,pages:presentationPageCount,name:presentationSourceName}
        const sent=sendToJAOutputs("slide",data,targets,{requireAll:true})
        if(sent.length!==targets.length)return notice("No se pudo enviar la diapositiva a todas las pantallas.")
        for(const id of targets)clearBackground(id)
        clearBlackBeforePublishing(targets)
        presentationControlledOutputs=[...targets]
        updateRemotePanel()
        rebuildOutputs()
        notice("Diapositiva "+(presentationPage+1)+" enviada a "+targets.length+" pantalla(s).")
    }
    function keyboardGeminiPresentations(event:KeyboardEvent){
        if(mode!=="presentaciones" || !presentationsPanel || event.altKey||event.ctrlKey||event.metaKey)return
        const element=event.target as HTMLElement|null
        if(element?.closest("input,textarea,select,[contenteditable='true']"))return
        const next=event.key==="ArrowRight"||event.key==="ArrowDown"||event.key==="PageDown"
        const previous=event.key==="ArrowLeft"||event.key==="ArrowUp"||event.key==="PageUp"
        if(!next&&!previous)return
        event.preventDefault()
        // Only an explicitly armed remote changes Program; otherwise regular
        // arrows navigate the private Preview as before.
        if(presentationRemoteEnabled)remotePresentationStep(next?"next":"previous")
        else movePresentationPage(next?1:-1)
    }
    let youtubePanel:JaGeminiYouTube|null=null
    let youtubePreview:JaGeminiYouTubePreview|null=null
    let youtubePreviewId=""
    let youtubePreviewState={paused:true,muted:true,currentTime:0,duration:0,ready:false}
    function clearYouTubePreview(){
        youtubePreview?.$destroy()
        youtubePreview=null
        youtubePreviewId=""
        youtubePreviewState={paused:true,muted:true,currentTime:0,duration:0,ready:false}
    }
    function stageYouTubePreview(id:string){
        if(!jaYoutubeId(id))return
        clearPresentationPreview()
        const target=el("previewCanvasContent")
        if(!target)return
        previewMedia?.pause()
        previewMedia=null
        biblePreviewGeneration++
        if(biblePreviewTimer)clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy()
        biblePreviewRenderer=null
        biblePreviewReady=false
        clearYouTubePreview()
        prepared=""
        followProgram=false
        target.replaceChildren()
        youtubePreviewId=id
        youtubePreview=new JaGeminiYouTubePreview({target,props:{videoId:id}})
        youtubePreview.$on("state",(event)=>{
            if(youtubePreviewId!==id)return
            youtubePreviewState=event.detail
            updatePreviewProgress()
        })
        updatePreviewProgress()
    }
    let youtubePreparedUrl=""
    let audioProblem=""
    // When requesting only sound from a video already on air, hand its audio
    // to the independent JA sound bus without changing the projected image.
    let soloMutedProgram:{path:string;outputId:string;audio:NonNullable<ReturnType<typeof VideoPlayer.getPlaying>>["audio"]}|null=null
    function restoreSoloProgramSound(){
        const previous=soloMutedProgram
        soloMutedProgram=null
        if(!previous)return
        const live=VideoPlayer.getPlaying(previous.path,[previous.outputId])
        if(!live || live.audio!==previous.audio)return
        if(live.audio.muted)VideoPlayer.toggleMute(previous.path,previous.outputId)
        AudioAnalyser.setSourceVolume(previous.path,VideoPlayer.getVolume(previous.path,[previous.outputId]),previous.outputId)
    }
    // Select playlists independently from the Quick Play target group.
    let playlistTargetIds=new Set<string>()
    let playlistOutputChoices:Array<{id:string;name:string;primary:boolean}>=[]
    let playlistSelectedTargets:string[]=[]
    let playlistTargetsChosenByOperator=false
    let playlistLocalVideoPath=""
    let playlistNotice=""
    let quickAudioToken=0
    let selectedPlaylistId=""
    let playlistCurrentId=""
    let playlistIndex=-1
    let playlistRunning=false
    let playlistBusy=false
    let playlistWaiting=false
    let playlistToken=0
    let playlistMonitor:ReturnType<typeof setInterval>|null=null
    let playlistSawProgress=false
    let playlistNearEnd=false
    let playlistLastPosition=0
    let playlistShuffleOrder:number[]=[]
    let playlistShufflePosition=0
    let playlistPaused=false
    let playlistLibraryFiles:Array<{path:string;name:string;source:"multimedia"|"himnario";kind:"video"|"audio"}>=[]
    $: playlistLibraryFiles=[
        ...indexedMedia.filter(f=>f.kind==="video"||f.kind==="audio").map(f=>({path:f.path,name:f.name,source:"multimedia" as const,kind:f.kind as "video"|"audio"})),
        ...geminiLocalFiles($hymnVideos as FileFolder[],[]).filter(f=>f.kind==="video").map(f=>({path:f.path,name:f.name,source:"himnario" as const,kind:"video" as const}))
    ]
    let audioOnlyLocal=false
    let jaAudioOnlyButton:HTMLButtonElement|null=null
    let playlistCurrentFile:{path:string;source:"multimedia"|"himnario";kind:"audio"|"video"}|null=null
    $: playlistCurrentFile = mode!=="biblia" && prepared &&
        (geminiFileType(prepared)==="audio"||geminiFileType(prepared)==="video")
        ? {path:prepared,source:mode==="himnario"?"himnario":"multimedia",
            kind:geminiFileType(prepared)==="audio"?"audio":"video"} : null
    let biblePreviewRenderer: JaGeminiBiblePreview | null = null
    let biblePreviewTimer: ReturnType<typeof setTimeout> | null = null
    let biblePreviewGeneration = 0
    let biblePreviewReady = false
    let biblePreviewReference = ""
    // Live follow is armed only after an explicitly confirmed Bible projection.
    // Clicking a verse still edits private Preview; only operator arrow controls
    // may advance a live Bible on the exact on-air destination group.
    let bibleFollowTargets: string[] = []
    let bibleFollowVersion = ""
    let bibleFollowEnabled = false
    let bibleEditorOpen = false
    let bibleBackgroundPickerTarget = ""
    let bibleStyleApplyBusy = false
    let bibleControlGeneration = 0
    let bibleControlRestoring = false
    let bibleNavigationBusy = false
    const bibleNavigationQueue: boolean[] = []
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
    // FreeShow's asset renderer treats paths without '/' as bundled effect
    // names. Windows paths contain '\\', so they MUST become file:/// URLs
    // before storing the asset for both primary and secondary output windows.
    function toJALogoImageURL(path:string):string {
        if (!path) return "./ja-logo.png"
        const encoded=encodeFilePath(path).replace(/\\/g,"/")
        if (/^[a-zA-Z]:\//.test(encoded)) return "file:///" + encoded
        if (encoded.startsWith("//")) return "file:" + encoded
        return encoded
    }
    function logoEffectItem(): AssetItem {
        const point=logoPositions[logoPosition] || logoPositions.center
        // The default FreeShow effect scales by source image pixels (0.3x);
        // use a width fraction of the 1920x1080 canvas for JA logos instead.
        const fitWidth=Math.max(0.11,Math.min(0.80,logoScale/2.5*0.80))
        return {type:"asset",path:toJALogoImageURL(customLogoPath),
            size:logoScale,fitWidth,x:point.x,y:point.y}
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
        image.src=toJALogoImageURL(path)
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

    function markedGroupTargets(): string[] {
        const current=chooseOutput()
        return current.filter(id=>syncedTargetIds.has(id))
    }
    // Route only the designated JA primary video to FreeShow's main speaker.
    // This is separate from muting secondary media sessions: a visible video
    // with a disconnected audio graph otherwise remains completely silent.
    function syncJAPrimaryAudioRoute():boolean{
        const id=localStorage.getItem("ja-main-projector")||""
        if(!id || !chooseOutput().includes(id))return false
        return setJAPrimaryAudioRouting(id)
    }
    function jaYouTubeDestinations(){
        const available=chooseOutput()
        const primary=localStorage.getItem("ja-main-projector")||""
        return available.map(id=>({id,name:get(outputs)[id]?.name||"Pantalla "+id,primary:id===primary}))
    }
    function jaYouTubeTargets(){
        const available=chooseOutput()
        const checked=markedGroupTargets()
        if(checked.length)return checked
        const primary=localStorage.getItem("ja-main-projector")||""
        return [available.includes(primary)?primary:available[0]].filter((id):id is string=>!!id)
    }
    function markedPlaylistTargets():string[]{
        return chooseOutput().filter(id=>playlistTargetIds.has(id))
    }
    function updatePlaylistTargets(){
        const available=chooseOutput()
        for(const id of [...playlistTargetIds])if(!available.includes(id))playlistTargetIds.delete(id)
        const primary=localStorage.getItem("ja-main-projector")||""
        if(!playlistTargetsChosenByOperator){
            playlistTargetIds=new Set(available.includes(primary)?[primary]:available.slice(0,1))
        }
        playlistOutputChoices=available.map(id=>({id,name:get(outputs)[id]?.name||"Salida "+id,primary:id===primary}))
        playlistSelectedTargets=[...playlistTargetIds]
    }
    function refreshGroupChoices() {
        if(!host)return
        const destinations=markedGroupTargets()
        const count=destinations.length
        // The quick strip selects destinations. The preview cards continue
        // inspecting a single Program output without changing these checks.
        for(const button of host.querySelectorAll<HTMLButtonElement>(".ja-quick-target")){
            const id=button.dataset.output||""
            const checked=syncedTargetIds.has(id)
            button.setAttribute("aria-pressed",String(checked))
            button.classList.toggle("ja-checked",checked)
            const box=button.querySelector<HTMLElement>(".ja-target-check")
            if(box)box.textContent=checked?"☑":"☐"
            button.disabled=publishingGroup
        }
        const action=host.querySelector<HTMLButtonElement>(".ja-sync-send")
        if(action){
            action.disabled=publishingGroup || count===0 || get(outLocked)
            action.textContent=publishingGroup ? "Enviando…" :
                count===1 ? "▶ Enviar a 1" : "▶ Enviar sincronizado ("+count+")"
            action.title=count===0 ? "Marca al menos una salida externa" :
                "Proyectar el contenido preparado únicamente en las "+count+" salidas marcadas"
        }
        const bibleProject=el("moduleView_biblia")?.querySelector<HTMLButtonElement>(".ja-bible-project")
        if(bibleProject){
            bibleProject.textContent=count>1 ? "▶ Proyectar en "+count+" pantallas" :
                count===1 ? "▶ Proyectar en "+(get(outputs)[destinations[0]]?.name||"pantalla marcada") :
                "▶ Marca una pantalla para proyectar"
        }
        const status=host.querySelector<HTMLElement>(".ja-sync-state")
        if(status){
            const file=count>1 ? get(outputs)[destinations[0]]?.out?.background?.path||"" : ""
            const sameFile=!!file && destinations.every(id=>get(outputs)[id]?.out?.background?.path===file)
            const kind=file?getMediaType(getExtension(file)):""
            const shared=kind==="video" && get(playingVideos).some(session=>
                destinations.every(id=>session.linkedOutputIds.includes(id)) &&
                normalizeJAContentPath(session.path)===normalizeJAContentPath(file))
            status.hidden=count<2
            status.textContent=publishingGroup ? "Preparando…" :
                sameFile && shared ? "✓ Reloj compartido" :
                sameFile && kind==="video" ? "Comprobando sincronización…" :
                sameFile ? "Mismo contenido" : count+" salidas marcadas"
            status.title=shared?"Sesión de vídeo compartida registrada por FreeShow":
                "Marcar pantallas no modifica lo que ya está en Programa"
        }
    }
    // Audio is a nonvisual FreeShow channel: never set a background with type
    // "audio" (BackgroundMedia cannot render it). Use the engine's real
    // AudioPlayer, and never clear the slide/background on any screen.
    function showJAOwnedAudio(path:string){
        if(!jaAudioContainer){
            notice("Audio iniciado; panel de controles no disponible en esta vista.")
            return
        }
        jaAudioControls?.$destroy()
        jaAudioControls=new JaGeminiAudioControls({target:jaAudioContainer,props:{path}})
        jaAudioContainer.hidden=false
        const close=()=>{
            if(jaAudioPath!==path)return
            restoreSoloProgramSound()
            JaSoloAudioPlayer.stop()
            jaAudioPath=""
            jaAudioControls?.$destroy()
            jaAudioControls=null
            if(jaAudioContainer)jaAudioContainer.hidden=true
        }
        jaAudioControls.$on("ended",()=>{
            const active=get(jaPlaylists).find(p=>p.id===playlistCurrentId)?.entries[playlistIndex]
            const advance=playlistRunning && !playlistPaused && !!active &&
                (active.kind==="audio"||active.audioOnly) && active.path===path
            close()
            if(advance)advanceJAPlaylist(false)
        })
        jaAudioControls.$on("stopped",close)
    }
    async function publishPreparedAudio(path:string,_targets:string[]){
        await playJAOnlySound(path,[],()=>prepared===path && !get(outLocked))
    }

    // A single JA-owned native HTMLAudioElement is the only Solo Audio bus.
    // It NEVER attaches to FreeShow VideoPlayer/AudioPlayer/AudioAnalyser.
    // New requests replace old ones instead of refusing with a busy flag.
    async function playJAOnlySound(path:string,targets:string[],valid:()=>boolean):Promise<boolean>{
        audioProblem=""
        const type=getMediaType(getExtension(path))
        if(get(outLocked) || (type!=="audio"&&type!=="video") ||
            targets.some(id=>!chooseOutput().includes(id))){
            audioProblem="Solo audio necesita un archivo local compatible; revisa las salidas bloqueadas."
            notice(audioProblem)
            return false
        }
        const primary=localStorage.getItem("ja-main-projector")||""
        const liveVideo=get(playingVideos).find(session=>
            normalizeJAContentPath(session.path)===normalizeJAContentPath(path) &&
            session.linkedOutputIds.includes(primary) && !session.audio.muted)
        restoreSoloProgramSound()
        const request=++jaAudioGeneration
        jaAudioBusy=true
        try{
            // Immediately release prior JA audio and its controls; this has
            // no effect on the independent projected video session.
            jaAudioControls?.$destroy()
            jaAudioControls=null
            jaAudioPath=""
            if(jaAudioContainer)jaAudioContainer.hidden=true
            const started=await JaSoloAudioPlayer.start(path)
            if(request!==jaAudioGeneration)return false
            if(!started){
                audioProblem=JaSoloAudioPlayer.error||"Windows no pudo abrir la pista de audio."
                notice(audioProblem)
                return false
            }
            if(!valid()||get(outLocked)){
                JaSoloAudioPlayer.stop()
                audioProblem="Cambió la selección de la pista; se canceló Solo audio."
                notice(audioProblem)
                return false
            }
            // Only after successful start, silence the SAME video if it
            // already has a soundtrack in Programa. Restore it on Stop/End.
            if(liveVideo && VideoPlayer.getPlaying(path,[primary])===liveVideo && !liveVideo.audio.muted){
                VideoPlayer.toggleMute(path,primary)
                AudioAnalyser.setSourceVolume(path,0,primary)
                soloMutedProgram={path,outputId:primary,audio:liveVideo.audio}
            }
            jaAudioPath=path
            showJAOwnedAudio(path)
            notice("♫ Solo audio independiente: "+fileName(path)+". Programa no cambió.")
            return true
        }catch(error){
            if(request===jaAudioGeneration){
                JaSoloAudioPlayer.stop()
                restoreSoloProgramSound()
                audioProblem="No se pudo iniciar Solo audio: "+String(error)
                notice(audioProblem)
            }
            return false
        }finally{
            if(request===jaAudioGeneration)jaAudioBusy=false
        }
    }
    function jaOnlyAudioSend(targets:string[]):boolean{
        const path=prepared
        if(!audioOnlyLocal || !path || getMediaType(getExtension(path))!=="video" ||
            (mode!=="multimedia" && mode!=="himnario"))return false
        void playJAOnlySound(path,targets,()=>prepared===path && audioOnlyLocal)
        return true
    }
    function refreshOnlyAudioButton(){
        if(!jaAudioOnlyButton)return
        jaAudioOnlyButton.hidden=false
        jaAudioOnlyButton.setAttribute("aria-pressed",String(audioOnlyLocal))
        jaAudioOnlyButton.classList.toggle("ja-checked",audioOnlyLocal)
        jaAudioOnlyButton.textContent=audioOnlyLocal?"♫ Solo audio ✓":"♫ Solo audio"
        jaAudioOnlyButton.title="Cuando está activo, un video o himno envía únicamente su audio; Programa conserva versículos y fondos"
    }
    /** This handles only a running video/hymn on the configured Primary.
     * If Primary is not running this exact prepared item, the ordinary new-send
     * workflow remains unchanged. Otherwise NEW destinations join the current
     * native audio clock and existing destinations must never be restarted. */
    async function joinAlreadyPlayingPrimary(mediaPath:string,targets:string[]):Promise<boolean>{
        const current=chooseOutput()
        const mainId=localStorage.getItem("ja-main-projector")||""
        if(!mainId || !current.includes(mainId))return false
        const mainBg=get(outputs)[mainId]?.out?.background
        const bgPath=mainBg?.path||""
        if(!bgPath || getMediaType(getExtension(bgPath))!=="video" ||
            normalizeJAContentPath(bgPath)!==normalizeJAContentPath(mediaPath))return false
        const source=get(playingVideos).find(s=>
            normalizeJAContentPath(s.path)===normalizeJAContentPath(bgPath) &&
            s.linkedOutputIds.includes(mainId))
        if(!source)return false
        // Source exists: errors must never fall back to a fresh 0:00 send.
        if(publishingGroup){notice("Ya hay un envío en curso.");return true}
        if(get(outLocked)){notice("Las salidas están bloqueadas.");return true}
        if(!targets.length || targets.some(id=>!current.includes(id))){
            notice("Selecciona únicamente destinos activos antes de vincular un video.");return true
        }
        const targetSnapshot=targets.join("|")
        const sourcePath=source.path
        const newTargets=targets.filter(id=>!source.linkedOutputIds.includes(id))
        if(!newTargets.length){
            notice("Estas pantallas ya comparten el video de Primario. No se reinició.")
            if(selectedId===mainId && normalizeJAContentPath(prepared)===normalizeJAContentPath(mediaPath)){
                followProgram=true;syncLinkedPreview();updatePreviewProgress()
            }
            return true
        }
        publishingGroup=true
        refreshGroupChoices()
        try{
            // Explicitly replace independent clocks on NEW outputs only.
            // Detaching one display from a previous group preserves all others.
            for(const id of newTargets){
                for(const session of [...get(playingVideos)].filter(s=>s.linkedOutputIds.includes(id)))
                    await VideoPlayer.stop(session.path,id)
            }
            const unchanged=()=>{
                const ids=chooseOutput()
                const latest=get(outputs)[mainId]?.out?.background
                return !get(outLocked) && mediaPath===prepared &&
                    targetSnapshot===markedGroupTargets().join("|") &&
                    targets.every(id=>ids.includes(id)) &&
                    normalizeJAContentPath(latest?.path||"")===normalizeJAContentPath(bgPath) &&
                    get(playingVideos).includes(source) &&
                    source.linkedOutputIds.includes(mainId)
            }
            if(!unchanged()){
                notice("Cambió el video o las pantallas durante la vinculación. No se reinició Primario.")
                return true
            }
            const clock=source.audio
            const currentTime=Number.isFinite(clock.currentTime)?Math.max(0,clock.currentTime):0
            if(!VideoPlayer.attachOutputsToLiveSession(sourcePath,mainId,newTargets)){
                notice("No se pudo compartir el reloj del video. Primario continúa sin cambios.")
                return true
            }
            // The renderer receives the source's real clock at the moment of
            // connection. Source/background on already linked outputs is untouched.
            const sent=sendToJAOutputs("background",{
                ...mainBg,path:sourcePath,type:"video",loop:!!source.loop,
                muted:!!clock.muted,startAt:currentTime,jaReuseClockFrom:mainId
            },newTargets,{replaceScripture:true,requireAll:true})
            if(sent.length!==newTargets.length || !newTargets.every(id=>
                normalizeJAContentPath(get(outputs)[id]?.out?.background?.path||"")===normalizeJAContentPath(sourcePath))){
                for(const id of newTargets)await VideoPlayer.stop(sourcePath,id)
                notice("No se confirmó la conexión de las nuevas pantallas. Primario sigue reproduciendo.")
                return true
            }
            clearBlackBeforePublishing(newTargets)
            // The source clock has not been stopped, re-created or seeked.
            rebuildOutputs()
            if(selectedId===mainId && normalizeJAContentPath(prepared)===normalizeJAContentPath(mediaPath)){
                followProgram=true;syncLinkedPreview();updatePreviewProgress()
            }
            notice("Se vincularon "+newTargets.length+" pantallas al video en curso desde "+time(currentTime)+". Primario no se reinició; comprueba HDMI/spacedesk.")
            return true
        }catch(error){
            notice("No se pudo vincular la reproducción existente: "+String(error))
            return true
        }finally{
            publishingGroup=false
            refreshGroupChoices()
        }
    }

    // Persist lists only when the operator edits them, never on playback ticks.
    function updateJAPlaylist(id:string,change:(list:JAPlaylist)=>JAPlaylist){
        jaPlaylists.update(lists=>lists.map(list=>list.id===id?change(list):list))
        if(!jaWritePlaylists(get(jaPlaylists)))notice("No se pudo guardar la lista en esta computadora.")
    }
    function stopJAPlaylist(stopSound=true){
        ++playlistToken
        playlistRunning=false
        playlistWaiting=false
        playlistBusy=false
        playlistSawProgress=false
        playlistNearEnd=false
        playlistShuffleOrder=[]
        playlistShufflePosition=0
        playlistPaused=false
        if(playlistLocalVideoPath && previewMedia && prepared===playlistLocalVideoPath){
            previewMedia.pause()
            previewMedia.muted=true
        }
        playlistLocalVideoPath=""
        playlistNotice=""
        if(stopSound && jaAudioPath){
            JaSoloAudioPlayer.stop()
            restoreSoloProgramSound()
            jaAudioPath=""
            jaAudioControls?.$destroy()
            jaAudioControls=null
            if(jaAudioContainer)jaAudioContainer.hidden=true
        }
        // Do not stop a video already projected: it may be controlling several
        // outputs, and the operator explicitly decides when to clear Programa.
    }
    async function playJAPlaylistIndex(id:string,index:number,fromQueue=false):Promise<void>{
        const list=get(jaPlaylists).find(p=>p.id===id)
        const item=list?.entries[index]
        if(!item || playlistBusy)return
        playlistNotice=""
        const targets=markedPlaylistTargets()
        const available=chooseOutput()
        const primary=localStorage.getItem("ja-main-projector")||(available.length===1?available[0]:"")
        if(get(outLocked)||targets.some(t=>!available.includes(t))){
            playlistNotice="Las salidas seleccionadas están bloqueadas o ya no están disponibles."
            notice(playlistNotice)
            return
        }
        if(!fromQueue || playlistCurrentId!==id){
            playlistShuffleOrder=list.playMode==="shuffle"
                ? jaShuffleOrder(list.entries.length,index) : []
            playlistShufflePosition=0
        }
        const previousEntry=get(jaPlaylists).find(p=>p.id===playlistCurrentId)?.entries[playlistIndex]
        const previousLocalVideoPath=playlistLocalVideoPath
        const token=++playlistToken
        playlistRunning=true
        playlistBusy=true
        playlistWaiting=false
        playlistCurrentId=id
        playlistIndex=index
        playlistSawProgress=false
        playlistNearEnd=false
        playlistLastPosition=0
        playlistPaused=false
        playlistLocalVideoPath=""
        selectedPlaylistId=id
        // Release the previous local video's audible session BEFORE starting
        // the next entry. Otherwise MP4->MP3 (or MP4 Solo audio) plays twice.
        if(previousLocalVideoPath && previewMedia &&
            normalizeJAContentPath(prepared)===normalizeJAContentPath(previousLocalVideoPath)){
            previewMedia.pause()
            previewMedia.muted=true
        }
        // Every new entry owns only the audio started by this JA playlist.
        if(jaAudioPath && jaAudioPath!==item.path){
            JaSoloAudioPlayer.stop()
            restoreSoloProgramSound()
            jaAudioPath=""
            jaAudioControls?.$destroy()
            jaAudioControls=null
            if(jaAudioContainer)jaAudioContainer.hidden=true
        }
        try{
            if(item.kind==="audio"||item.audioOnly){
                if(item.kind==="youtube")throw Error("YouTube no admite Solo audio.")
                const ok=await playJAOnlySound(item.path,targets,()=>token===playlistToken && playlistRunning)
                if(!ok)throw Error(audioProblem||"No se pudo iniciar la pista sonora. Revisa el formato y enrutamiento de audio.")
                // If manual Next changes a playing local/YouTube video to a
                // sound-only entry, freeze its last visible frame rather than
                // allowing two different soundtracks to overlap.
                if(previousEntry && (previousEntry.kind==="youtube" || (previousEntry.kind==="video"&&!previousEntry.audioOnly))){
                    const oldPath=previousEntry.kind==="youtube"?jaYoutubeId(previousEntry.path):previousEntry.path
                    if(oldPath && VideoPlayer.getPlaying(oldPath,[primary]))VideoPlayer.pause(oldPath,primary)
                }
            }else if(item.kind==="youtube"){
                const youtubeId=jaYoutubeId(item.path)
                if(!youtubeId)throw Error("El enlace de YouTube no es válido.")
                // Stage the official visible YouTube iframe instead of sending
                // automatically to Program. Playlist Send publishes explicitly.
                youtubePreparedUrl=item.path
                showModule("youtube")
                stageYouTubePreview(youtubeId)
                playlistWaiting=true
                playlistPaused=true
                notice("YouTube preparado en su módulo. Escucha en consola o pulsa Enviar a pantallas.")
            }else{
                if(getMediaType(getExtension(item.path))!=="video")throw Error("El archivo ya no es un video válido.")
                prepare(item.path,false)
                // Preview is a silent, paused STAGING area, not a player.
                // Program does not change until the operator explicitly sends.
                playlistLocalVideoPath=item.path
                const local=previewMedia
                if(!local)throw Error("No existe Vista previa para este video.")
                local.pause()
                local.muted=true
                local.loop=item.loopVideo===true
                playlistWaiting=true
                playlistPaused=true
                notice("Pista preparada y detenida en Vista previa: "+item.title+". Pulsa Enviar a pantallas para reproducir.")
            }
            if(token!==playlistToken)return
            if(item.kind==="audio"||item.audioOnly)playlistWaiting=false
            notice("Playlist: "+(index+1)+"/"+list!.entries.length+" · "+item.title)
        }catch(error){
            if(token===playlistToken){
                playlistRunning=false
                playlistNotice="Lista detenida: "+String(error)
                notice(playlistNotice)
            }
        }finally{
            if(token===playlistToken)playlistBusy=false
        }
    }
    function advanceJAPlaylist(manual:boolean){
        if(!playlistRunning||playlistBusy)return
        const list=get(jaPlaylists).find(p=>p.id===playlistCurrentId)
        if(!list)return stopJAPlaylist()
        if(!manual && !list.autoNext){playlistWaiting=true;notice("Canto terminado. Pulsa Siguiente para continuar.");return}
        const next=jaNextIndex(jaPlaybackMode(list.playMode,list.repeat),list.entries.length,
            playlistIndex,manual,playlistShuffleOrder,playlistShufflePosition)
        if(next.index<0){stopJAPlaylist(false);notice("Playlist finalizada.");return}
        playlistShufflePosition=next.position
        void playJAPlaylistIndex(list.id,next.index,true)
    }
    function watchJAPlaylist(){
        if(!playlistRunning||playlistBusy||playlistWaiting||playlistPaused)return
        const list=get(jaPlaylists).find(p=>p.id===playlistCurrentId)
        const item=list?.entries[playlistIndex]
        if(!list||!item)return
        // Observe just the exact native session that JA started. Never use
        // the private silent Preview clock or unrelated global AudioPlaylist.
        let audio:HTMLAudioElement|{currentTime:number;duration:number;paused:boolean}|null=null
        let found=false
        if(item.kind==="audio"||item.audioOnly){
            if(JaSoloAudioPlayer.path===item.path && JaSoloAudioPlayer.audio){
                audio=JaSoloAudioPlayer.audio;found=true
            }
        }else if(playlistLocalVideoPath===item.path && previewMedia){
            audio=previewMedia;found=true
        }else{
            const primary=localStorage.getItem("ja-main-projector")||""
            const target=markedPlaylistTargets().includes(primary)?primary:markedPlaylistTargets()[0]||""
            const key=item.kind==="youtube"?jaYoutubeId(item.path):item.path
            const session=VideoPlayer.getPlaying(key,[target])
            const onAir=get(outputs)[target]?.out?.background
            if(session && (onAir?.path===key || onAir?.id===key)){
                audio=session.audio;found=true
            }
        }
        if(found && audio){
            const now=Number(audio.currentTime)||0
            const duration=Number(audio.duration)||0
            if(now>0.35)playlistSawProgress=true
            // Video loop and playlist progression are different controls:
            // a looping logo/animation stays on screen until manual Next.
            if(item.kind==="video" && !item.audioOnly && item.loopVideo===true){
                playlistLastPosition=now
                playlistNearEnd=false
                return
            }
            // Native HTMLAudioElement may already be paused by its ended event
            // when the 350ms monitor wakes up. Do not require !paused at EOF.
            const nativeEnded="ended" in audio && audio.ended===true
            if(nativeEnded && playlistSawProgress){
                playlistNearEnd=true
                advanceJAPlaylist(false)
                return
            }
            if(duration>0 && now>=duration-0.5 && !audio.paused)playlistNearEnd=true
            playlistLastPosition=now
            if(playlistNearEnd && duration>0 && now>=duration-0.1 && !audio.paused)
                advanceJAPlaylist(false)
            return
        }
        // A session disappearing unexpectedly is not a reliable end event.
        // Only auto-advance if its final known position was near duration;
        // otherwise stop safely, rather than skipping music accidentally.
        if(playlistSawProgress){
            if(playlistNearEnd)advanceJAPlaylist(false)
            else {
                playlistWaiting=true
                notice("La reproducción desapareció antes de terminar. Revisa las pantallas y pulsa Siguiente.")
            }
        }
    }
    async function playlistPanelAction(event:{type:string;id?:string;name?:string;url?:string;
        entryId?:string;index?:number;offset?:number;value?:boolean;playMode?:string;
        files?:Array<{path:string;source:"multimedia"|"himnario"}>;from?:number;to?:number}){
        if(event.type==="dismissNotice"){playlistNotice="";return}
        if(event.type==="close"){playlistOpen=false;return}
        if(event.type==="targets" && event.id){
            playlistTargetsChosenByOperator=true
            if(event.value)playlistTargetIds.add(event.id)
            else playlistTargetIds.delete(event.id)
            updatePlaylistTargets()
            return
        }
        if(event.type==="send"){
            const entry=get(jaPlaylists).find(p=>p.id===playlistCurrentId)?.entries[playlistIndex]
            if(!entry || !playlistRunning)return notice("Primero prepara una pista de la lista.")
            if(entry.kind==="youtube"){
                const id=jaYoutubeId(entry.path)
                const destinations=markedPlaylistTargets()
                if(!id || !destinations.length)return notice("Prepara un enlace de YouTube válido y selecciona pantallas.")
                if(youtubePreviewId!==id)return notice("Prepara primero este video de YouTube en Vista previa.")
                if(get(outLocked))return notice("Las salidas están bloqueadas.")
                const main=localStorage.getItem("ja-main-projector")||""
                youtubePreview?.pause()
                playerVideos.update(data=>({...data,[id]:{id,type:"youtube",name:entry.title}}))
                const sent=sendToJAOutputs("background",{id,type:"player",loop:false,muted:!destinations.includes(main),startAt:youtubePreviewState.currentTime},destinations,{replaceScripture:true,requireAll:true})
                if(sent.length!==destinations.length)return notice("No se pudo enviar YouTube a todas las pantallas.")
                clearBlackBeforePublishing(destinations)
                playlistWaiting=false
                playlistPaused=false
                rebuildOutputs()
                notice("YouTube enviado desde playlist a "+destinations.length+" pantalla(s).")
                return
            }
            if(entry.kind!=="video" || entry.audioOnly)return notice("Solo los vídeos visibles se envían desde Vista previa; Solo audio se escucha localmente.")
            if(prepared!==entry.path)return notice("La Vista previa cambió; prepara nuevamente la pista.")
            const destinations=markedPlaylistTargets()
            if(!destinations.length)return notice("Selecciona al menos una pantalla de la lista.")
            syncedTargetIds=new Set(destinations)
            refreshGroupChoices()
            if(destinations.length>1)await sendPreparedToGroup()
            else publishPreparedMedia()
            if(destinations.every(id=>normalizeJAContentPath(get(outputs)[id]?.out?.background?.path||"")===normalizeJAContentPath(entry.path))){
                playlistLocalVideoPath=""
                playlistWaiting=false
                playlistPaused=false
                if(previewMedia){previewMedia.muted=true;followProgram=true;syncLinkedPreview()}
                notice("Playlist enviada desde Vista previa a "+destinations.length+" pantalla(s).")
            }
            return
        }
        if(event.type==="stop"){stopJAPlaylist();return}
        if(event.type==="next"){advanceJAPlaylist(true);return}
        if(event.type==="previous"){
            if(!playlistRunning || playlistBusy)return
            const list=get(jaPlaylists).find(p=>p.id===playlistCurrentId)
            if(!list)return
            if(list.playMode==="shuffle"){
                const pos=Math.max(0,playlistShufflePosition-1)
                playlistShufflePosition=pos
                void playJAPlaylistIndex(list.id,playlistShuffleOrder[pos]??playlistIndex,true)
            }else void playJAPlaylistIndex(list.id,Math.max(0,playlistIndex-1),true)
            return
        }
        if(event.type==="togglePause"){
            if(!playlistRunning)return
            const entry=get(jaPlaylists).find(p=>p.id===playlistCurrentId)?.entries[playlistIndex]
            const main=localStorage.getItem("ja-main-projector")||""
            if(!entry)return
            if(entry.kind==="audio"||entry.audioOnly){
                if(JaSoloAudioPlayer.path!==entry.path || !JaSoloAudioPlayer.audio)
                    return notice("La pista Solo audio no está activa.")
                playlistPaused=JaSoloAudioPlayer.isPlaying(entry.path)
                void JaSoloAudioPlayer.toggle()
            }else{
                if(playlistLocalVideoPath===entry.path && previewMedia){
                    return notice("La pista está preparada en Vista previa. Pulsa Enviar a pantallas para iniciar la reproducción.")
                }
                const path=entry.kind==="youtube"?jaYoutubeId(entry.path):entry.path
                const target=markedPlaylistTargets().includes(main)?main:markedPlaylistTargets()[0]||""
                const video=VideoPlayer.getPlaying(path,[target])
                if(!video)return notice("Este reproductor no ofrece pausa remota. Usa sus controles visibles.")
                if(video.audio.paused){VideoPlayer.play(path,target);playlistPaused=false}
                else {VideoPlayer.pause(path,target);playlistPaused=true}
            }
            return
        }
        if(event.type==="play"){
            if(event.id && Number.isInteger(event.index))
                await playJAPlaylistIndex(event.id,event.index!)
            return
        }
        if(event.type==="create"){
            if(get(jaPlaylists).length>=JA_MAX_PLAYLISTS)return notice("Límite de listas alcanzado.")
            const list=jaNewPlaylist(event.name||"")
            jaPlaylists.update(lists=>[...lists,list])
            jaWritePlaylists(get(jaPlaylists))
            selectedPlaylistId=list.id
            return
        }
        if(event.type==="select"){selectedPlaylistId=event.id||"";return}
        if(event.type==="delete" && event.id){
            if(playlistCurrentId===event.id)stopJAPlaylist()
            jaPlaylists.update(lists=>lists.filter(l=>l.id!==event.id))
            jaWritePlaylists(get(jaPlaylists))
            selectedPlaylistId=get(jaPlaylists)[0]?.id||""
            return
        }
        const id=event.id||""
        const list=get(jaPlaylists).find(p=>p.id===id)
        if(!list)return
        if(event.type==="autoNext"){
            updateJAPlaylist(id,l=>({...l,autoNext:!!event.value}))
            return
        }
        if(event.type==="playMode"){
            // Operator may switch Normal / Shuffle / Repeat while the track is
            // playing. This changes only queue traversal: never pause, seek,
            // stop or recreate the FreeShow audio/video session.
            const nextMode=jaPlaybackMode(event.playMode)
            const active=playlistRunning && playlistCurrentId===id
            if(active){
                if(nextMode==="shuffle"){
                    // New shuffled pass starts AFTER the current song, without
                    // replaying songs before the operator changes the mode.
                    playlistShuffleOrder=jaShuffleOrder(list.entries.length,playlistIndex)
                    playlistShufflePosition=0
                }else{
                    playlistShuffleOrder=[]
                    playlistShufflePosition=0
                }
                // Preserve end-of-track evidence for this SAME media session.
                // Resetting it here can lose EOF between 350ms monitor polls,
                // especially when a mode is switched in the final half-second.
            }
            updateJAPlaylist(id,l=>({...l,playMode:nextMode,repeat:nextMode==="repeat-all"}))
            notice("Modo de lista: "+(
                nextMode==="shuffle"?"Aleatorio":nextMode==="repeat-all"?"Repetir lista":
                nextMode==="repeat-one"?"Repetir canción":"Normal")+
                (active?". La canción actual continúa sin reiniciar.":""))
            return
        }
        if(event.type==="loopVideo"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de cambiar el bucle de sus videos.")
            updateJAPlaylist(id,l=>({...l,entries:l.entries.map(entry=>
                entry.id===event.entryId && entry.kind==="video"?{...entry,loopVideo:!!event.value}:entry)}))
            return
        }
        if(event.type==="addFiles"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de añadir elementos.")
            const files=(event.files||[]).slice(0,JA_MAX_ENTRIES).map(f=>jaLocalPlaylistEntry(f.path,f.source))
                .filter((f):f is JAPlaylistEntry=>!!f)
            if(!files.length)return notice("No hay archivos de audio o video válidos para añadir.")
            const room=JA_MAX_ENTRIES-list.entries.length
            if(room<=0)return notice("Límite de elementos alcanzado.")
            updateJAPlaylist(id,l=>({...l,entries:[...l.entries,...files.slice(0,room)]}))
            notice("Añadidos "+Math.min(room,files.length)+" archivos reales a la lista.")
            return
        }
        if(event.type==="reorder"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de ordenar.")
            updateJAPlaylist(id,l=>jaMoveEntryTo(l,event.from??-1,event.to??-1))
            return
        }
        if(event.type==="addFile"){
            const source=mode==="himnario"?"himnario":"multimedia"
            const file=jaLocalPlaylistEntry(prepared,source)
            if(!file)return notice("Prepara un video, himno o audio real antes de añadirlo.")
            if(list.entries.length>=JA_MAX_ENTRIES)return notice("Límite de elementos en esta lista.")
            updateJAPlaylist(id,l=>({...l,entries:[...l.entries,file]}))
            return
        }
        if(event.type==="addYoutube"){
            const entry=jaYoutubePlaylistEntry(event.url||"")
            if(!entry)return notice("El enlace debe ser de YouTube con ID válido; no se añaden direcciones de otros sitios.")
            if(list.entries.length>=JA_MAX_ENTRIES)return notice("Límite de elementos en esta lista.")
            updateJAPlaylist(id,l=>({...l,entries:[...l.entries,entry]}))
            return
        }
        if(event.type==="remove"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de cambiar sus elementos.")
            updateJAPlaylist(id,l=>({...l,entries:l.entries.filter(e=>e.id!==event.entryId)}))
            return
        }
        if(event.type==="move"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de ordenar.")
            updateJAPlaylist(id,l=>jaMoveEntry(l,event.index??-1,event.offset??0))
            return
        }
        if(event.type==="audioOnly"){
            if(playlistRunning&&playlistCurrentId===id)return notice("Detén la lista antes de cambiar Solo audio.")
            updateJAPlaylist(id,l=>({...l,entries:l.entries.map(entry=>
                entry.id===event.entryId && entry.kind==="video"?{...entry,audioOnly:!!event.value}:entry)}))
        }
    }
    // A real, independent music channel accessible even while showing Bible.
    // Never sends to Program or changes any on-air visuals.
    async function playBackgroundAudioAnywhere(path:string){
        audioProblem=""
        if(get(outLocked))return notice("Las salidas están bloqueadas.")
        // Solo audio is an independent music bus: a different video may
        // remain visible in Programa without blocking the sound-only action.
        // The exact same video is guarded inside playJAOnlySound against duplicates.
        if(!playlistLibraryFiles.some(f=>f.path===path&&(f.kind==="audio"||f.kind==="video")))
            return notice("La pista no está disponible en las carpetas reales vinculadas.")
        if(playlistRunning)stopJAPlaylist()
        const generation=++quickAudioToken
        await playJAOnlySound(path,[],()=>generation===quickAudioToken && !get(outLocked))
    }
    function stopBackgroundAudioAnywhere(){
        ++quickAudioToken
        audioProblem=""
        JaSoloAudioPlayer.stop()
        restoreSoloProgramSound()
        jaAudioPath=""
        jaAudioControls?.$destroy()
        jaAudioControls=null
        if(jaAudioContainer)jaAudioContainer.hidden=true
    }
    // The Gemini module content reserves a live right-hand column for the
    // playlist. Do not create a second multimedia library or overlay the preview.
    function layoutPersistentPlaylist(){
        if(!host)return
        const region=el("moduleView_multimedia")?.parentElement as HTMLElement|null
        if(!region)return
        if(playlistModuleArea!==region){
            if(playlistModuleArea)playlistModuleArea.style.paddingRight=playlistModuleAreaPadding
            playlistDockObserver?.disconnect()
            playlistModuleArea=region
            playlistModuleAreaPadding=region.style.paddingRight
            playlistDockObserver=new ResizeObserver(()=>layoutPersistentPlaylist())
            playlistDockObserver.observe(region)
            playlistDockObserver.observe(host)
        }
        const h=host.getBoundingClientRect(),r=region.getBoundingClientRect()
        if(r.width<350 || r.height<120)return
        const width=Math.min(500,Math.max(285,Math.round(r.width*0.36)))
        const padding=width+9
        if(region.style.paddingRight!==padding+"px")region.style.paddingRight=padding+"px"
        const pos="position:absolute;left:"+Math.round(r.right-h.left-width)+"px;top:"+
            Math.round(r.top-h.top)+"px;width:"+width+"px;height:"+Math.round(r.height)+"px;"
        if(playlistDockStyle!==pos)playlistDockStyle=pos
        playlistDockReady=true
    }
    function focusPersistentPlaylist(){
        playlistOpen=false
        const panel=host?.querySelector<HTMLElement>(".ja-list-dock.docked")
        panel?.querySelector<HTMLElement>(".dock-saved input")?.focus()
    }
    function addFileDirectToPlaylist(path:string,source:"multimedia"|"himnario"){
        const list=get(jaPlaylists).find(x=>x.id===selectedPlaylistId)
        if(!list){focusPersistentPlaylist();return notice("Crea una lista en el panel fijo de la derecha antes de añadir contenido.")}
        if(playlistRunning&&playlistCurrentId===list.id)return notice("Detén la lista para editarla.")
        const entry=jaLocalPlaylistEntry(path,source)
        if(!entry)return notice("Selecciona un video, audio o himno real.")
        if(list.entries.length>=JA_MAX_ENTRIES)return notice("Lista completa.")
        updateJAPlaylist(list.id,x=>({...x,entries:[...x.entries,entry]}))
        notice("Añadido a "+list.name+": "+entry.title)
    }
    function sendToQuickTargets() {
        if(mode==="presentaciones"){publishJAPresentation();return}
        if(mode==="youtube" && youtubePreviewId){
            publishPreparedYouTube(youtubePreviewId,markedGroupTargets())
            return
        }
        if(publishingGroup)return notice("Ya se está preparando un envío sincronizado.")
        const selected=markedGroupTargets()
        if(!selected.length){
            if(mode==="biblia")return notice("No hay pantalla externa; el versículo sigue en Vista previa.")
            if(!prepared)return notice("Prepara primero un archivo real.")
            const kind=getMediaType(getExtension(prepared))
            if(audioOnlyLocal || kind==="audio"){void playJAOnlySound(prepared,[],()=>!!prepared);return}
            if(kind==="video" && previewMedia){
                previewMedia.muted=false
                void previewMedia.play().catch(()=>notice("No se pudo abrir el video local. Revisa su códec."))
                return notice("Video local en Vista previa con audio; no hay pantalla externa.")
            }
            return notice("Archivo visible en Vista previa, sin pantalla externa.")
        }
        if(jaOnlyAudioSend(selected))return
        if(selected.length>1){void sendPreparedToGroup();return}
        publishPreparedMedia()
    }
    async function sendPreparedToGroup() {
        if(publishingGroup)return
        const targets=markedGroupTargets()
        if(targets.length<2)return notice("Marca dos o más pantallas en Envío rápido.")
        if(get(outLocked))return notice("Las salidas están bloqueadas.")
        const available=chooseOutput()
        const mainId=localStorage.getItem("ja-main-projector") || ""
        if(!mainId || !available.includes(mainId))
            return notice("Configura primero una salida principal real para mantener el audio controlado.")
        if(mode==="biblia") {
            if(!biblePreviewReady || biblePreviewReference!==JSON.stringify(get(activeScripture).reference||null))
                return notice("Prepara y comprueba el versículo en Vista previa antes de enviar al grupo.")
            if(!activeBibleId || !get(activeScripture).reference?.verses?.[0]?.length)
                return notice("Selecciona un versículo antes de enviarlo a varias pantallas.")
            publishingGroup=true;refreshGroupChoices()
            try {
                const before=activeBibleId
                const referenceSent=JSON.stringify(get(activeScripture).reference||null)
                await sendScriptureToJAOutputs(targets)
                const confirmed=before===activeBibleId &&
                    referenceSent===JSON.stringify(get(activeScripture).reference||null) &&
                    targets.every(id=>get(outputs)[id]?.out?.slide?.id==="temp" &&
                        get(outputs)[id]?.out?.slide?.categoryId===before &&
                        JSON.stringify(get(outputs)[id]?.out?.slide?.scriptureReference||null)===referenceSent)
                if(confirmed) armBibleFollow(targets,before)
                notice(confirmed
                    ? "Biblia recibida por "+targets.length+" salidas. Confirma cada pantalla físicamente."
                    : "No se confirmó la Biblia en todas las salidas. Comprueba las asignaciones.")
            }catch(error){notice("Error al enviar Biblia al grupo: "+String(error))}
            finally{publishingGroup=false;refreshGroupChoices()}
            return
        }
        if(!prepared)return notice("Prepara primero un vídeo o imagen en Vista previa.")
        const mediaPath=prepared
        const kind=getMediaType(getExtension(mediaPath))
        if(jaOnlyAudioSend(targets))return
        if(kind==="audio"){void publishPreparedAudio(mediaPath,targets);return}
        // A running Primary video/hymn is the authoritative clock. Joining
        // existing content does not restart previously linked screens.
        if(kind==="video" && await joinAlreadyPlayingPrimary(mediaPath,targets))return
        const idSnapshot=targets.join("|")
        publishingGroup=true;refreshGroupChoices()
        try {
            // Re-enviar un vídeo que ya existe en uno de los destinos puede
            // reutilizar solamente su antigua sesión y dejar el resto sin
            // sincronizar. Separarlo ANTES de la publicación es intencional.
            if(kind==="video") {
                const previousSessions=get(playingVideos).filter(session=>
                    normalizeJAContentPath(session.path)===normalizeJAContentPath(mediaPath) &&
                    session.linkedOutputIds.some(id=>targets.includes(id)))
                for(const session of previousSessions) {
                    for(const id of [...session.linkedOutputIds].filter(id=>targets.includes(id)))
                        await VideoPlayer.stop(session.path,id)
                }
            }
            const live=chooseOutput()
            if(get(outLocked) || mediaPath!==prepared || idSnapshot!==markedGroupTargets().join("|") ||
                !targets.every(id=>live.includes(id)) || !live.includes(mainId) ||
                localStorage.getItem("ja-main-projector")!==mainId)
                return notice("Cambió la configuración mientras se preparaba el envío; no se ha publicado el grupo.")
            const sent=sendToJAOutputs("background",{
                path:mediaPath,type:kind,loop:kind==="video"?(playlistRunning && playlistCurrentId && playlistLocalVideoPath===mediaPath ? !!get(jaPlaylists).find(l=>l.id===playlistCurrentId)?.entries[playlistIndex]?.loopVideo : getRememberedLoop(mainId,mediaPath)):false,
                // Audio de una única sesión: solo la salida principal es audible.
                muted:!targets.includes(mainId),startAt:kind==="video" && playlistLocalVideoPath===mediaPath && previewMedia ? Math.max(0,Number(previewMedia.currentTime)||0):0
            },targets,{replaceScripture:true,requireAll:true})
            if(sent.length!==targets.length)
                return notice("No se pudo enviar a todos los destinos. Revisa las salidas antes de repetir.")
            clearBlackBeforePublishing(targets)
            const received=targets.every(id=>get(outputs)[id]?.out?.background?.path===mediaPath)
            if(!targets.includes(selectedId))selectedId=targets.includes(mainId)?mainId:targets[0]
            if(previewMedia && kind==="video" && targets.includes(selectedId)){
                previewMedia.pause()
                if(playlistLocalVideoPath!==mediaPath)try{previewMedia.currentTime=0}catch{}
                previewMedia.muted=true
                followProgram=true
            }else followProgram=false
            rebuildOutputs()
            updatePreviewProgress()
            notice(received
                ? "Contenido recibido por "+targets.length+" salidas. Comprueba el reloj compartido en Multipantalla y verifica HDMI, spacedesk y audio."
                : "FreeShow no confirmó el contenido en todas las salidas. Revisa cada destino.")
        }catch(error){
            followProgram=false
            notice("Error al enviar contenido sincronizado: "+String(error))
        }finally{
            publishingGroup=false
            refreshGroupChoices()
        }
    }
    function publishPreparedYouTube(id:string,targets:string[],title="YouTube"){
        if(!id || youtubePreviewId!==id || !youtubePreview)
            return notice("Prepara primero el video de YouTube en Vista previa.")
        const available=chooseOutput()
        if(!targets.length||targets.some(target=>!available.includes(target))||get(outLocked))
            return notice("Selecciona pantallas externas activas.")
        const primary=localStorage.getItem("ja-main-projector")||""
        youtubePreview.pause()
        const position=youtubePreviewState.currentTime
        playerVideos.update(data=>({...data,[id]:{id,type:"youtube",name:title}}))
        const sent=sendToJAOutputs("background",{
            id,type:"player",loop:false,muted:!targets.includes(primary),startAt:position
        },targets,{replaceScripture:true,requireAll:true})
        if(sent.length!==targets.length)
            return notice("No se confirmó YouTube en todas las pantallas.")
        clearBlackBeforePublishing(targets)
        rebuildOutputs()
        notice("YouTube enviado desde Vista previa a "+targets.length+" pantalla(s).")
    }
    function publishPreparedMedia() {
        if(mode==="presentaciones"){publishJAPresentation();return}
        if(mode==="youtube" && youtubePreviewId){
            publishPreparedYouTube(youtubePreviewId,markedGroupTargets())
            return
        }
        if(publishingGroup)return notice("Ya se está preparando un envío sincronizado.")
        const targets=markedGroupTargets()
        if(!targets.length)return sendToQuickTargets()
        if(targets.length>1){void sendPreparedToGroup();return}
        const destinationId=targets[0]
        if(mode==="biblia") {
            const button=el("moduleView_biblia")?.querySelector<HTMLButtonElement>(".ja-bible-project")
            if(button)button.click()
            else notice("Prepara un versículo antes de proyectar")
            return
        }
        if(!prepared)return notice("Selecciona un archivo antes de proyectarlo")
        const available=chooseOutput()
        if(!destinationId || !available.includes(destinationId))
            return notice("Selecciona una salida JA configurada antes de enviar contenido.")
        if(get(outLocked) || !get(outputs)[destinationId]?.active)
            return notice("La salida seleccionada está inactiva o bloqueada.")
        const mediaPath=prepared
        const kind=getMediaType(getExtension(mediaPath))
        if(jaOnlyAudioSend(targets))return
        if(kind==="audio"){void publishPreparedAudio(mediaPath,[destinationId]);return}
        if(kind==="video"){
            const mainId=localStorage.getItem("ja-main-projector")||""
            const bg=get(outputs)[mainId]?.out?.background
            if(bg && normalizeJAContentPath(bg.path||"")===normalizeJAContentPath(mediaPath) &&
                !!VideoPlayer.getPlaying(mediaPath,[mainId])){
                void joinAlreadyPlayingPrimary(mediaPath,[destinationId])
                return
            }
        }
        // No sobreescribir transiciones globales ni estilos: restaurar exactamente
        // la ruta nativa que sí publicaba archivos antes de la regresión.
        try {
            const previous=get(outputs)[destinationId]
            // Una nueva imagen o vídeo principal REEMPLAZA el pasaje bíblico.
            // No limpiar otras diapositivas ni overlays de otros destinos.
            const scriptureSlide=previous?.out?.slide
            if(scriptureSlide && (scriptureSlide.id==="temp" || scriptureSlide.id==="tempText"))
                clearSlide(true,destinationId)
            clearBlackBeforePublishing([destinationId])
            // Ruta nativa que operaba en la primera prueba física de Windows.
            // El ID explícito impide difundir a otras salidas no configuradas.
            const mainId=localStorage.getItem("ja-main-projector") || (available.length===1?destinationId:"")
            if(available.length>1 && !mainId)
                return notice("Selecciona la salida principal en Configuración JA antes de emitir con varios monitores.")
            // Secondary screens cannot emit duplicated audio by default.
            setOutput("background",{
                path:mediaPath,type:kind,loop:kind==="video" && playlistLocalVideoPath===mediaPath ? !!get(jaPlaylists).find(l=>l.id===playlistCurrentId)?.entries[playlistIndex]?.loopVideo : kind==="video" && getRememberedLoop(destinationId,mediaPath),muted:available.length>1 && destinationId!==mainId,startAt:kind==="video" && playlistLocalVideoPath===mediaPath && previewMedia ? Math.max(0,Number(previewMedia.currentTime)||0):0
            },false,destinationId)
            const actual=get(outputs)[destinationId]?.out?.background
            // La actualización del store indica recepción interna, NO que
            // HDMI o spacedesk hayan mostrado correctamente el contenido.
            if(!actual || !actual.path) {
                followProgram=false
                return notice("FreeShow no registró el contenido en Programa. Revisa la salida activa.")
            }
            if(previewMedia && kind==="video" && selectedId===destinationId){
                previewMedia.pause()
                if(playlistLocalVideoPath!==mediaPath)try{previewMedia.currentTime=0}catch{}
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
        clearPresentationPreview()
        clearYouTubePreview()
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
        if(playlistOpen){e.preventDefault();playlistOpen=false;return}
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
        if (playlistOpen || !(e.ctrlKey || e.metaKey) || e.key !== ",") return
        if (e.altKey || e.shiftKey) return
        e.preventDefault()
        e.stopImmediatePropagation()
        settingsStartSection = "general"
        settingsOpen = !settingsOpen
    }
    function ensurePrimaryAfterManualScreenActivation(id:string){
        const current=localStorage.getItem("ja-main-projector")||""
        if(current && chooseOutput().includes(current))return
        if(!habitualPrimaryId && current)habitualPrimaryId=current
        if(!habitualPrimaryId)habitualPrimaryId=id
        localStorage.setItem("ja-main-projector",id)
        syncJAPrimaryAudioRoute()
        VideoPlayer.updateVolume()
        saveScreenMemory()
        screenNotice="Pantalla principal "+(get(outputs)[id]?.name||id)+" asignada. Puedes cambiarla en Configuración."
    }
    async function assignMonitorToOutput(displayId:number, _bounds:{x:number;y:number;width:number;height:number}, outputId:string){
        const targetDisplay=await validateExternalDisplay(displayId)
        if(!targetDisplay)return notice("La laptop está reservada como consola. Selecciona una pantalla externa válida.")
        const current=get(outputs),target=current[outputId]
        if(!target || !target.enabled || target.stageOutput)return notice("Salida JA no disponible")
        if(Object.entries(current).some(([id,o])=>id!==outputId && o.enabled && o.screen===String(displayId)))
            return notice("Esta pantalla ya pertenece a otra salida")
        const bounds=targetDisplay.bounds
        screenProfiles[fingerprint(targetDisplay)]=outputId
        saveScreenMemory()
        outputs.update(a=>({...a,[outputId]:{...a[outputId],screen:String(displayId),
            bounds:{...bounds},boundsLocked:true,enabled:true,active:true}}))
        ensurePrimaryAfterManualScreenActivation(outputId)
        // CREATE alone leaves the window hidden. Toggle is a separate, required
        // operation and the native backend now waits for window creation.
        toggleOutputs([outputId],{state:true})
        selectedId=outputId
        void refreshDisplaySafety()
        notice("Activando "+(target.name||outputId)+" en la pantalla externa. Confirma que la ventana aparece allí.")
    }
    async function createPhysicalOutput(displayId:number,_bounds:{x:number;y:number;width:number;height:number},name:string){
        const targetDisplay=await validateExternalDisplay(displayId)
        if(!targetDisplay || get(outLocked))return notice("No se puede crear una salida en la laptop ni estando bloqueada")
        if(Object.values(get(outputs)).some(o=>o.enabled && o.screen===String(displayId)))
            return notice("El monitor ya tiene una salida asignada")
        const id=addOutput(false,"",false,name)
        if(!id)return notice("FreeShow no pudo registrar la salida")
        const bounds=targetDisplay.bounds
        screenProfiles[fingerprint(targetDisplay)]=id
        saveScreenMemory()
        outputs.update(a=>({
            ...a,[id]:{...a[id],enabled:true,active:true,
                screen:String(displayId),bounds:{...bounds},boundsLocked:true,alwaysOnTop:true}
        }))
        ensurePrimaryAfterManualScreenActivation(id)
        toggleOutputs([id],{state:true})
        selectedId=id
        void refreshDisplaySafety()
        notice("Activando salida en "+name+". No se enviará contenido hasta que pulses Quick Play.")
    }
    async function activateConfiguredOutput(outputId:string,displayId:number){
        const d=await validateExternalDisplay(displayId)
        const output=get(outputs)[outputId]
        if(!d || !output || !output.enabled || output.screen!==String(displayId))
            return notice("La asignación ha cambiado. Actualiza la detección y vuelve a intentarlo.")
        screenProfiles[fingerprint(d)]=outputId
        saveScreenMemory()
        ensurePrimaryAfterManualScreenActivation(outputId)
        toggleOutputs([outputId],{state:true})
        selectedId=outputId
        void refreshDisplaySafety()
        notice("Solicitada activación de "+(output.name||outputId)+". Comprueba el monitor externo.")
    }
    async function reconcileWindowsDisplays(external:JAExternalDisplay[],previous:Set<string>){
        const current=get(outputs)
        // Record the primary's content BEFORE Windows removes a physical display.
        const oldMain=localStorage.getItem("ja-main-projector")||""
        const oldMainScreen=String(current[oldMain]?.screen||"")
        const mainWasRemoved=!!oldMainScreen && previous.has(oldMainScreen) &&
            !knownExternalDisplayIds.has(oldMainScreen)
        if(!external.length){
            if(mainWasRemoved)resumeVideoLocallyFromOutput(oldMain)
            return
        }
        let newDisplays=0
        // Assign physical screens first; only then elect the principal. Never
        // confuse the operator's internal screen with a projection window.
        for(const display of external){
            const id=String(display.id),key=fingerprint(display)
            let outputId=screenProfiles[key]||""
            const outs=get(outputs)
            // A saved ID must never steal an output already assigned to some
            // other *connected* physical monitor.
            if(outputId && outs[outputId]?.screen &&
                String(outs[outputId].screen)!==id &&
                knownExternalDisplayIds.has(String(outs[outputId].screen)))outputId=""
            if(!outputId||!outs[outputId]){
                outputId=Object.entries(outs).find(([,output])=>output?.enabled &&
                    !output?.stageOutput && String(output.screen)===id)?.[0]||""
            }
            const newlyConnected=!previous.has(id)
            if(!outputId){
                const reuse=Object.entries(get(outputs)).find(([,out])=>out?.enabled&&!out.stageOutput&&!out.screen)
                outputId=reuse?.[0]||addOutput(false,"",false,display.label||"Pantalla externa")||""
                if(!outputId)continue
                newDisplays++
            }
            for(const [oldKey,owner] of Object.entries(screenProfiles))
                if(owner===outputId&&oldKey!==key)delete screenProfiles[oldKey]
            screenProfiles[key]=outputId
            const output=get(outputs)[outputId]
            if(!output)continue
            if(String(output.screen)!==id || !output.enabled || !output.active ||
                !sameDisplayBounds(output.bounds,display.bounds)){
                // Keep the live output and its audio; only refresh the window
                // rectangle on the physical monitor reported by Electron.
                outputs.update(a=>({...a,[outputId]:{...a[outputId],enabled:true,active:true,
                    screen:id,bounds:{...display.bounds},boundsLocked:true,alwaysOnTop:true}}))
            }
            if(newlyConnected){
                // A returning principal must not flash its old pre-disconnect
                // image while the provisional principal is still in charge.
                const currentMain=localStorage.getItem("ja-main-projector")||""
                const localVideo=previewMedia && !previewMedia.paused && !previewMedia.muted
                if((outputId===habitualPrimaryId && currentMain && currentMain!==outputId) ||
                    (localVideo && outputId===currentMain)){
                    clearBackground(outputId)
                    clearSlide(true,outputId)
                    setOutput("effects",[],false,outputId)
                    setOutput("overlays",[],false,outputId)
                }
                const wasExplicitlyHidden=manuallyHiddenOutputs.has(outputId)
                toggleOutputs([outputId],{state:!wasExplicitlyHidden})
            }
        }
        saveScreenMemory()
        const available=Object.entries(get(outputs))
            .filter(([,out])=>out?.enabled&&out.active&&!out.stageOutput&&
                !!out.screen&&knownExternalDisplayIds.has(String(out.screen))).map(([id])=>id)
        const liveMain=localStorage.getItem("ja-main-projector")||""
        if(!habitualPrimaryId && liveMain)habitualPrimaryId=liveMain
        if(!available.includes(liveMain)){
            const replacement=(habitualPrimaryId && available.includes(habitualPrimaryId)
                ? habitualPrimaryId:available[0])||""
            if(replacement){
                // Primary loss: the replacement is provisional. Its former
                // secondary content is intentionally NOT restored later.
                if(liveMain&&liveMain!==replacement&&mainWasRemoved)
                    transferProjectedContent(liveMain,replacement)
                localStorage.setItem("ja-main-projector",replacement)
                syncJAPrimaryAudioRoute()
                VideoPlayer.updateVolume()
                if(!habitualPrimaryId)habitualPrimaryId=replacement
                saveScreenMemory()
                screenNotice=(newDisplays?"Nueva pantalla detectada. ":"")+
                    (replacement===habitualPrimaryId?"Pantalla principal asignada automáticamente.":
                    "Principal provisional activada porque la principal habitual no está conectada.")
                if(previewMedia && !previewMedia.muted && !previewMedia.paused)
                    bridgeLocalVideoToOutput(replacement)
            }
        }else if(newDisplays){
            screenNotice="Nueva pantalla detectada y asignada como secundaria. La principal continúa sin cambios."
        }
        const currentMain=localStorage.getItem("ja-main-projector")||""
        // A projector returned after a local-only interval: rejoin the native
        // output at the current local video clock, never at the old saved 0:00.
        if(available.includes(currentMain) && previewMedia && !previewMedia.muted && !previewMedia.paused)
            bridgeLocalVideoToOutput(currentMain)
        if(habitualPrimaryId && habitualPrimaryId!==currentMain &&
            available.includes(habitualPrimaryId)){
            restoreCandidateId=habitualPrimaryId
            screenNotice="La pantalla principal habitual se ha reconectado. ¿Quieres restaurarla como principal? La proyección actual se transferirá y la anterior quedará vacía."
        }else restoreCandidateId=""
    }
    function setProjectionVisible(id:string,visible:boolean){
        const out=get(outputs)[id]
        if(!out?.enabled||!out.screen||!knownExternalDisplayIds.has(String(out.screen)))
            return notice("Esta pantalla no está conectada; no se modificó su ventana.")
        if(String(out.screen)===operatorDisplayId)return notice("La laptop es solo la consola de control.")
        if(visible)manuallyHiddenOutputs.delete(id)
        else manuallyHiddenOutputs.add(id)
        saveScreenMemory()
        toggleOutputs([id],{state:visible})
        screenStructure=""
        rebuildOutputs()
        screenNotice=(out.name||"Pantalla")+" "+(visible?
            "mostrada. El contenido continúa desde su sesión actual.":
            "oculta. El escritorio de Windows queda libre y el audio continúa.")
    }
    function setAllProjectionVisible(visible:boolean){
        for(const id of chooseOutput())setProjectionVisible(id,visible)
    }
    function transferProjectedContent(from:string,to:string){
        if(!from||!to||from===to)return
        const source=get(outputs)[from]?.out
        if(!source)return
        // The current playing clock wins; no saved/stale secondary content is
        // restored. Copy into the new principal before clearing the old one.
        const background=source.background
        if(background){
            const path=background.path||""
            const current=path?VideoPlayer.getPlaying(path,[from])?.audio.currentTime:undefined
            const previewClock=path && normalizeJAContentPath(playingPath)===normalizeJAContentPath(path)
                ?videoState.currentTime:undefined
            const playhead=Number.isFinite(current)?current:
                Number.isFinite(previewClock)?previewClock:background.startAt||0
            setOutput("background",{...background,muted:false,startAt:playhead},false,to)
        }
        if(source.slide)setOutput("slide",source.slide,false,to)
        if(source.overlays?.length)setOutput("overlays",[...source.overlays],false,to)
        if(source.effects?.length)setOutput("effects",[...source.effects],false,to)
        if(background)clearBackground(from)
        if(source.slide)clearSlide(true,from)
        setOutput("overlays",[],false,from)
        setOutput("effects",[],false,from)
        // No former secondary buffer survives the role exchange.
    }
    function bridgeLocalVideoToOutput(outputId:string){
        if(!previewMedia || previewMedia.paused || previewMedia.muted ||
            getMediaType(getExtension(prepared))!=="video")return
        const path=prepared,position=Number(previewMedia.currentTime)||0
        const received=sendToJAOutputs("background",{
            path,type:"video",startAt:position,loop:previewMedia.loop,muted:false
        },[outputId],{replaceScripture:true,requireAll:true})
        if(received.length!==1){
            screenNotice="La pantalla está conectada, pero no se pudo transferir el vídeo. Continúa reproduciéndose localmente."
            return
        }
        previewMedia.muted=true
        if(playlistRunning && playlistLocalVideoPath===path){
            playlistTargetIds.add(outputId)
            updatePlaylistTargets()
        }
        playlistLocalVideoPath=""
        playlistSawProgress=false
        followProgram=true
        screenNotice="Video enviado a la pantalla principal desde "+time(position)+" sin volver a 0:00."
    }
    function resumeVideoLocallyFromOutput(id:string){
        const source=get(outputs)[id]?.out?.background
        if(!source?.path || getMediaType(getExtension(source.path))!=="video")return
        const playing=VideoPlayer.getPlaying(source.path,[id])
        const position=Number(playing?.audio.currentTime)||0
        if(playing)VideoPlayer.pause(source.path,id)
        selectedId=""
        prepare(source.path)
        const local=previewMedia
        if(!local)return
        const resume=()=>{
            if(previewMedia!==local)return
            try{local.currentTime=position}catch{}
            local.muted=false
            void local.play().catch(()=>notice("El video no pudo continuar localmente después de desconectar el proyector."))
        }
        if(local.readyState>=1)resume()
        else local.addEventListener("loadedmetadata",resume,{once:true})
        if(playlistRunning){
            playlistLocalVideoPath=source.path
            playlistSawProgress=false
        }
        screenNotice="Proyector desconectado. La reproducción continúa en la consola sin pantalla externa."
    }
    function restoreHabitualPrimary(){
        const to=restoreCandidateId
        const from=localStorage.getItem("ja-main-projector")||""
        if(!to || !chooseOutput().includes(to))return
        transferProjectedContent(from,to)
        localStorage.setItem("ja-main-projector",to)
        syncJAPrimaryAudioRoute()
        VideoPlayer.updateVolume()
        habitualPrimaryId=to
        restoreCandidateId=""
        screenStructure=""
        saveScreenMemory()
        rebuildOutputs()
        screenNotice="Principal habitual restaurada. La salida anterior quedó vacía como secundaria."
    }
    function makeOutputPrimary(id:string){
        if(!chooseOutput().includes(id))return notice("Selecciona una pantalla externa conectada.")
        const previous=localStorage.getItem("ja-main-projector")||""
        if(previous!==id)transferProjectedContent(previous,id)
        localStorage.setItem("ja-main-projector",id)
        syncJAPrimaryAudioRoute()
        VideoPlayer.updateVolume()
        habitualPrimaryId=id
        restoreCandidateId=""
        screenStructure=""
        saveScreenMemory()
        rebuildOutputs()
        screenNotice="Nueva pantalla principal guardada. La anterior quedó libre como secundaria."
    }
    function forgetDisconnectedOutput(id:string){
        const output=get(outputs)[id]
        if(!output || (output.screen && knownExternalDisplayIds.has(String(output.screen))))
            return notice("Solo se puede olvidar una pantalla desconectada.")
        for(const [key,owner] of Object.entries(screenProfiles))if(owner===id)delete screenProfiles[key]
        manuallyHiddenOutputs.delete(id)
        if(habitualPrimaryId===id)habitualPrimaryId=""
        if(localStorage.getItem("ja-main-projector")===id)localStorage.removeItem("ja-main-projector")
        outputs.update(a=>({...a,[id]:{...a[id],enabled:false,active:false,screen:""}}))
        saveScreenMemory()
        screenStructure=""
        rebuildOutputs()
        screenNotice="Configuración anterior eliminada de JA. No se modificó Windows."
    }
    function chooseOutput() {
        const available = Object.entries(get(outputs))
            .filter(([, value]) => value && value.enabled && value.active && !value.stageOutput &&
                !!value.screen && knownExternalDisplayIds.has(String(value.screen)))
            .map(([id]) => id)
        if (!available.includes(selectedId)) selectedId = available[0] || ""
        if(available.length && !quickTargetsInitialized){
            syncedTargetIds.add(selectedId)
            quickTargetsInitialized=true
        }
        return available
    }
    function inspectOutput(id: string) {
        if(!chooseOutput().includes(id))return
        selectedId=id
        rebuildOutputs()
        if(mode==="biblia"){
            void restoreBibleControlForOutput(id)
            return
        }
        // A screen card is also an inspection control: restore its on-air
        // video/image into PRIVATE Preview. Never emit, seek or pause Program.
        const bg=get(outputs)[id]?.out?.background
        const path=bg?.path || ""
        const kind=path?getMediaType(getExtension(path)):""
        if(kind!=="video" && kind!=="image")return
        const same=normalizeJAContentPath(prepared)===normalizeJAContentPath(path)
        if(!same){
            prepare(path)
            notice("Vista previa recuperada de "+(get(outputs)[id]?.name||id)+". Programa no cambió.")
        }else if(kind==="video" && !!VideoPlayer.getPlaying(path,[id])){
            followProgram=true
            syncLinkedPreview()
            updatePreviewProgress()
        }
    }
    // This recovers on-air Scripture into the private native picker, without emitting.
    async function restoreBibleControlForOutput(id: string) {
        const generation=++bibleControlGeneration
        const previousTargets=[...bibleFollowTargets]
        const previousVersion=bibleFollowVersion
        const previousFollow=bibleFollowEnabled
        bibleNavigationQueue.length=0
        bibleFollowEnabled=false
        bibleControlRestoring=true
        ++biblePreviewGeneration
        if(biblePreviewTimer)clearTimeout(biblePreviewTimer)
        biblePreviewReady=false
        updateBibleFollowControls()
        try {
            const slide=get(outputs)[id]?.out?.slide
            const reference=slide?.scriptureReference
            const version=slide?.categoryId||""
            if(slide?.id!=="temp" || !version || !reference?.book ||
                !reference?.chapters?.length || !reference?.verses?.[0]?.length ||
                !get(scriptures)[version]) {
                bibleFollowTargets=[]
                bibleFollowVersion=""
                return // An output with media must not change the private draft.
            }
            jaControlledOutputId.set(id)
            activeBibleId=version
            drawerTabsData.update(data=>({...data,scripture:{...data.scripture,activeSubTab:version}}))
            updateBibleUI()
            await tick()
            if(generation!==bibleControlGeneration || selectedId!==id || mode!=="biblia")return
            const restored=await scriptureView?.restoreGeminiPreparedReference({
                book:reference.book,chapters:[...reference.chapters],
                verses:reference.verses.map((v:(number|string)[])=>[...v])
            },version)
            if(generation!==bibleControlGeneration || selectedId!==id || mode!=="biblia")return
            const current=get(outputs)[id]?.out?.slide
            if(!restored || current?.id!=="temp" || current?.categoryId!==version ||
                JSON.stringify(current?.scriptureReference||null)!==JSON.stringify(reference)){
                bibleFollowTargets=[]
                bibleFollowVersion=""
                notice("La Biblia de esta pantalla cambió. Selecciona otra vez su tarjeta.")
                return
            }
            const live=getLiveScriptureOutputIds()
            if(!live.includes(id)){
                bibleFollowTargets=[]
                bibleFollowVersion=""
                notice("Vista previa recuperada; seguimiento no confirmado. Proyecta nuevamente para habilitarlo.")
            }else{
                bibleFollowTargets=[...live]
                bibleFollowVersion=version
                const sameGroup=previousVersion===version && previousTargets.length===live.length &&
                    previousTargets.every(target=>live.includes(target))
                bibleFollowEnabled=sameGroup ? previousFollow : true
            }
            scheduleBiblePreview()
        }catch(error){
            bibleFollowTargets=[]
            bibleFollowVersion=""
            notice("No se pudo recuperar el control de esta pantalla: "+String(error))
        }finally{
            if(generation===bibleControlGeneration){
                bibleControlRestoring=false
                updateBibleFollowControls()
            }
        }
    }
    function rebuildOutputs() {
        if (!host) return
        const available = chooseOutput()
        const list = el("multiscreenCardsList")
        const targets = el("quickTargetButtons")
        const outputMap = get(outputs)
        // Never retain a disconnected destination inside a marked group.
        for(const id of [...syncedTargetIds])if(!available.includes(id))syncedTargetIds.delete(id)
        // Reconstruct only when monitors/active flags change, not every playback tick.
        const structure = available.map(id=>id+":"+!!outputMap[id]?.active+":"+(outputMap[id]?.screen||"")+":"+(outputMap[id]?.name||"")+":"+manuallyHiddenOutputs.has(id)).join("|")
        if (structure !== screenStructure) {
            screenStructure = structure
            for (const component of screenRenderers) component.$destroy()
            screenRenderers = []
            list?.replaceChildren()
            targets?.replaceChildren()
            if (!available.length) {
                if (list) list.textContent = displaysChecked
                    ? "No hay pantallas externas activadas. Abre Configuración JA → Pantallas y salidas."
                    : "Detectando pantallas de Windows…"
                if (targets) {
                    const configure=document.createElement("button")
                    configure.type="button"
                    configure.textContent=displaysChecked ? "Configurar pantallas externas" : "Detectando monitores…"
                    configure.disabled=!displaysChecked
                    configure.className="ja-target rounded-lg border px-2 py-1 text-xs"
                    configure.onclick=()=>{settingsStartSection="screens";settingsOpen=true}
                    targets.append(configure)
                }
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
                const loopBadge=document.createElement("span")
                loopBadge.className="ja-loop-badge text-[10px] text-amber-200"
                loopBadge.dataset.loopOutput=id
                loopBadge.textContent="↻ Bucle"
                loopBadge.hidden=true
                info.append(loopBadge)
                const badge = document.createElement("span")
                badge.className = "ja-screen-badge text-[10px] px-2 py-1 rounded-xl whitespace-nowrap"
                info.append(badge)
                card.append(thumb,info)
                card.onclick = () => inspectOutput(id)
                list?.append(card)
                // Quick strip: multi-select destinations without mutating
                // the inspected Program card. Screen previews remain clean.
                const target=document.createElement("button")
                target.type="button"
                target.dataset.output=id
                target.className="ja-target ja-quick-target rounded-lg border px-2 py-1 text-xs"
                target.setAttribute("aria-label","Incluir "+(value.name||id)+" en la proyección")
                const check=document.createElement("span")
                check.className="ja-target-check"
                check.setAttribute("aria-hidden","true")
                const name=document.createElement("span")
                name.textContent=value.name||"Salida "+id
                target.append(check,name)
                target.onclick=()=>{
                    if(publishingGroup)return
                    if(syncedTargetIds.has(id))syncedTargetIds.delete(id)
                    else syncedTargetIds.add(id)
                    // Marking future destinations must not revoke current Bible control.
                    if(syncedTargetIds.size===1) inspectOutput([...syncedTargetIds][0])
                    else refreshGroupChoices()
                }
                targets?.append(target)
                const visibility=document.createElement("button")
                visibility.type="button"
                visibility.className="ja-target ja-output-visibility rounded-lg border px-2 py-1 text-xs"
                visibility.textContent=manuallyHiddenOutputs.has(id)?"◉ Mostrar "+(value.name||id):"◌ Ocultar "+(value.name||id)
                visibility.title="Mostrar u ocultar la ventana física sin detener la reproducción"
                visibility.onclick=()=>setProjectionVisible(id,manuallyHiddenOutputs.has(id))
                targets?.append(visibility)
            }
            if(targets && available.length){
                const send=document.createElement("button")
                send.type="button"
                send.className="ja-sync-send ja-target rounded-lg border px-2 py-1 text-xs"
                send.onclick=sendToQuickTargets
                targets.append(send)
                const state=document.createElement("span")
                state.className="ja-sync-state"
                state.setAttribute("role","status")
                state.setAttribute("aria-live","polite")
                targets.append(state)
                const showAll=document.createElement("button")
                showAll.type="button";showAll.className="ja-target rounded-lg border px-2 py-1 text-xs"
                showAll.textContent="Mostrar todas";showAll.onclick=()=>setAllProjectionVisible(true)
                const hideAll=document.createElement("button")
                hideAll.type="button";hideAll.className=showAll.className
                hideAll.textContent="Ocultar todas";hideAll.onclick=()=>setAllProjectionVisible(false)
                targets.append(showAll,hideAll)
            }
        }
        // Rebuilds happen after each output/video state update. The strip is
        // only cleared when its screen structure changes, so reusing the
        // existing button prevents unbounded Solo audio duplicates.
        // This must also work with zero external monitors.
        if(targets && !targets.querySelector(".ja-only-audio-toggle")){
            const onlyAudio=document.createElement("button")
            onlyAudio.type="button"
            onlyAudio.className="ja-target ja-only-audio-toggle rounded-lg border px-2 py-1 text-xs"
            onlyAudio.textContent="♫ Solo audio"
            onlyAudio.title="Escuchar videos y canciones sin cambiar la imagen proyectada"
            onlyAudio.onclick=()=>{
                audioOnlyLocal=!audioOnlyLocal
                refreshOnlyAudioButton()
                notice(audioOnlyLocal?"Solo audio activado. Elige un video o himno desde su miniatura.":
                    "Solo audio desactivado. Las miniaturas prepararán contenido para proyección.")
            }
            targets.append(onlyAudio)
            jaAudioOnlyButton=onlyAudio
            refreshOnlyAudioButton()
        }
        updatePlaylistTargets()
        refreshGroupChoices()
        if(presentationsPanel && mode==="presentaciones")refreshPresentationModule()
        if(capturePanel)refreshCaptureModule()
        refreshCaptureGlobalStatus()
        if(youtubePanel && mode==="youtube")
            youtubePanel.$set({destinations:jaYouTubeDestinations(),chosen:jaYouTubeTargets()})
        for (const id of available) {
            const output = outputMap[id]
            const state = list?.querySelector<HTMLElement>('[data-output="' + CSS.escape(id) + '"]')
            state?.classList.toggle("ja-selected",id===selectedId)
            const file = output?.out?.background?.path || output?.out?.background?.id || ""
            const label = state?.querySelector(".ja-screen-state")
            if (label) label.textContent = file ? fileName(file) : "Salida libre"
            const badge = state?.querySelector(".ja-screen-badge")
            if (badge) badge.textContent = manuallyHiddenOutputs.has(id) ? "Oculta" : output.active ? "Visible" : "Inactiva"
            const target = targets?.querySelector<HTMLElement>('[data-output="' + CSS.escape(id) + '"]')
            target?.classList.toggle("ja-checked",syncedTargetIds.has(id))
        }
        syncProgram()
        if (mode === "biblia" && biblePreviewReady && biblePreviewRenderer) biblePreviewRenderer.$set({outputId: selectedId})
        const bibleProject=el("moduleView_biblia")?.querySelector<HTMLButtonElement>(".ja-bible-project")
        if (bibleProject){
            const chosen=markedGroupTargets()
            bibleProject.textContent=chosen.length>1 ? "▶ Proyectar en "+chosen.length+" pantallas" :
                chosen.length===1 ? "▶ Proyectar en "+(get(outputs)[chosen[0]]?.name||"pantalla elegida") :
                "▶ Marca una pantalla para proyectar"
        }
    }
    function getRememberedLoop(outputId:string,path:string):boolean {
        return videoLoopPrefs[outputId]?.[path]===true
    }
    function rememberLoop(outputId:string,path:string,enabled:boolean){
        if(!outputId || !path)return
        videoLoopPrefs[outputId]={...(videoLoopPrefs[outputId]||{}),[path]:enabled}
        videoLoopPrefs[outputId]=Object.fromEntries(Object.entries(videoLoopPrefs[outputId]).slice(-100))
        try{localStorage.setItem(VIDEO_LOOP_STORAGE,JSON.stringify(videoLoopPrefs))}
        catch(error){console.warn("[JA Video] No se pudo guardar bucle:",error)}
    }
    function updateProgramLoopButton(){
        if(!programLoopButton)return
        const bg=get(outputs)[selectedId]?.out?.background
        const path=bg?.path||""
        const isVideo=!!path && getMediaType(getExtension(path))==="video"
        const session=isVideo?VideoPlayer.getPlaying(path,[selectedId]):null
        const looping=!!session?.loop
        programLoopButton.disabled=loopBusy || !session || get(outLocked)
        programLoopButton.setAttribute("aria-pressed",String(looping))
        programLoopButton.textContent=loopBusy?"↻ Preparando…":looping?"↻ Bucle ON":"↻ Bucle OFF"
        programLoopButton.title=isVideo?
            "Repetir solo en "+(get(outputs)[selectedId]?.name||"la salida elegida"):
            "Selecciona una pantalla con video o himno activo"
        for(const badge of host?.querySelectorAll<HTMLElement>(".ja-loop-badge")||[]){
            const id=badge.dataset.loopOutput||""
            const current=get(outputs)[id]?.out?.background?.path||""
            const live=current&&VideoPlayer.getPlaying(current,[id])
            badge.hidden=!live?.loop
        }
    }
    async function changeLoopForSelectedOutput(){
        if(loopBusy || get(outLocked))return
        const id=selectedId
        if(!id || !chooseOutput().includes(id))return notice("Selecciona una salida activa.")
        const bg=get(outputs)[id]?.out?.background
        const path=bg?.path||""
        if(!path || getMediaType(getExtension(path))!=="video")
            return notice("La pantalla seleccionada no reproduce un video o himno.")
        const source=VideoPlayer.getPlaying(path,[id])
        if(!source)return notice("No hay reloj de video activo para modificar.")
        const newLoop=!source.loop
        loopBusy=true
        updateProgramLoopButton()
        try{
            if(source.linkedOutputIds.length>1){
                const primary=localStorage.getItem("ja-main-projector")||""
                const keepPrimary=id===primary && source.linkedOutputIds.includes(primary)
                const detach=keepPrimary?source.linkedOutputIds.filter(other=>other!==primary):[id]
                const currentTime=Number.isFinite(source.audio.currentTime)?Math.max(0,source.audio.currentTime):0
                const paused=source.audio.paused
                const oldLoop=source.loop
                const oldMuted=source.audio.muted
                for(const outputId of detach){
                    if(!chooseOutput().includes(outputId))throw Error("Una pantalla ya no está conectada.")
                    await VideoPlayer.stop(path,outputId)
                    const started=await VideoPlayer.start(path,{
                        startAt:currentTime,loop:outputId===id?newLoop:oldLoop,
                        paused,muted:outputId===primary?oldMuted:true
                    },[outputId])
                    if(!started || !VideoPlayer.getPlaying(path,[outputId]))
                        throw Error("No se pudo separar el reloj de "+outputId)
                }
            }
            if(!VideoPlayer.setLoopForSingleOutput(path,id,newLoop))
                throw Error("La salida sigue vinculada a otro reloj.")
            const current=get(outputs)[id]?.out?.background
            if(!current || current.path!==path)throw Error("Cambió el video de la pantalla.")
            // Updating only the loop metadata never re-sends the video or seeks
            // Program. The original output and its mounted renderer remain.
            outputs.update(all=>({
                ...all,[id]:{
                    ...all[id],out:{...all[id].out,background:{...current,loop:newLoop}}
                }
            }))
            rememberLoop(id,path,newLoop)
            notice((newLoop?"Bucle activado":"Bucle desactivado")+" en "+
                (get(outputs)[id]?.name||id)+". Las otras salidas no se reiniciaron.")
        }catch(error){
            notice("No se pudo modificar el bucle independiente: "+String(error))
        }finally{
            loopBusy=false
            updateProgramLoopButton()
        }
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
        updateProgramLoopButton()
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
            // Gemini's original HTML gives the Videos button a permanent blue
            // Tailwind class. Clearing an inline color with "" does NOT remove
            // that base blue, so two tabs appear active after a filter change.
            // Override both states explicitly, preserving the original layout.
            const active = mode === "multimedia" && typeFilter === type
            btn.setAttribute("aria-pressed", String(active))
            btn.classList.toggle("ja-media-filter-active", active)
            btn.style.background = active ? "#2169a5" : "#101e41"
            btn.style.borderColor = active ? "#4cd1fd" : "#30466f"
            btn.style.boxShadow = active ? "inset 0 0 0 1px rgba(76,209,253,.18)" : "none"
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
        const playlistBtn=document.createElement("button")
        playlistBtn.type="button"
        playlistBtn.textContent="☰ Listas"
        playlistBtn.title="Crear playlists mixtas, añadir el archivo preparado y elegir Solo audio"
        playlistBtn.onclick=focusPersistentPlaylist
        libraryToolbar.append(playlistBtn)
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
    // Append the ORIGINAL Gemini cards without re-rendering the grid and
    // losing thumbnail observers, image content or the user's scroll position.
    function appendLibraryCards() {
        const area=libraryGrid
        if(!area || mode==="biblia" || area!==el(mode==="himnario"?"hymnModuleGrid":"multimediaCardsGrid") ||
            libraryRendered>=libraryFiles.length)return
        libraryMore?.remove()
        libraryMore=null
        const limit=libraryRendered===0?LIBRARY_FIRST_BATCH:LIBRARY_NEXT_BATCH
        const next=Math.min(libraryFiles.length,libraryRendered+limit)
        for(const file of libraryFiles.slice(libraryRendered,next)){
            const item=document.createElement("button")
            item.type="button";item.title=file.path
            // Keep exactly the approved original Tailwind classes and markup.
            item.className="ja-media-card p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"
            const visual=document.createElement("div")
            visual.className="aspect-video rounded-md bg-[#06132a] flex items-center justify-center text-sky-300 overflow-hidden"
            const label=document.createElement("p")
            label.className="text-xs text-slate-200 truncate mt-2"
            label.textContent=file.name
            item.append(visual,label)
            item.onclick=()=>{
                if(audioOnlyLocal&&(file.kind==="video"||file.kind==="audio"))
                    void playBackgroundAudioAnywhere(file.path)
                else prepare(file.path)
            }
            if(file.kind==="video"||file.kind==="audio"){
                item.draggable=true
                item.ondragstart=e=>{
                    e.dataTransfer?.setData("text/plain",(mode==="himnario"?"himnario":"multimedia")+"|"+file.path)
                    if(e.dataTransfer)e.dataTransfer.effectAllowed="copy"
                }
                item.style.position="relative"
                const plus=document.createElement("span")
                plus.className="ja-card-quick-add"
                plus.setAttribute("role","button")
                plus.setAttribute("aria-label","Añadir "+file.name+" a lista")
                plus.tabIndex=0
                plus.title="Añadir sin preparar ni proyectar"
                plus.textContent="+"
                const action=(e:Event)=>{
                    e.preventDefault();e.stopPropagation()
                    addFileDirectToPlaylist(file.path,mode==="himnario"?"himnario":"multimedia")
                }
                plus.onclick=action
                plus.onkeydown=(e:KeyboardEvent)=>{
                    if(e.key==="Enter"||e.key===" ")action(e)
                }
                item.append(plus)
                const sound=document.createElement("span")
                sound.className="ja-card-solo-audio"
                sound.setAttribute("role","button")
                sound.tabIndex=0
                sound.setAttribute("aria-label","Escuchar solo audio de "+file.name)
                sound.title="Solo audio sin modificar las pantallas"
                sound.textContent="♫"
                const playOnly=(e:Event)=>{
                    e.preventDefault();e.stopPropagation()
                    void playBackgroundAudioAnywhere(file.path)
                }
                sound.onclick=playOnly
                sound.onkeydown=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" ")playOnly(e)}
                item.append(sound)
            }
            area.append(item)
            showNativeThumbnail(visual,file)
        }
        libraryRendered=next
        if(libraryFiles.length>LIBRARY_FIRST_BATCH){
            const footer=document.createElement("div")
            footer.className="col-span-full p-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
            const info=document.createElement("span")
            info.textContent="Mostrando "+libraryRendered+" de "+libraryFiles.length+" archivos reales"
            footer.append(info)
            if(libraryRendered<libraryFiles.length){
                const more=document.createElement("button")
                more.type="button"
                more.className="rounded-md border border-[#3b7199] bg-[#17406a] px-3 py-1 text-white"
                more.textContent="Mostrar "+Math.min(LIBRARY_NEXT_BATCH,libraryFiles.length-libraryRendered)+" más"
                more.onclick=appendLibraryCards
                footer.append(more)
            }
            libraryMore=footer
            area.append(footer)
        }
    }
    function onLibraryScroll(area:HTMLElement){
        if(libraryGrid!==area || libraryRendered>=libraryFiles.length)return
        if(area.scrollHeight-area.scrollTop-area.clientHeight<280)appendLibraryCards()
    }
    function renderLibrary() {
        if (!host) return
        if (thumbObserver) { thumbObserver.disconnect(); thumbObserver = null }
        const area=el(mode==="himnario"?"hymnModuleGrid":"multimediaCardsGrid")
        if(!area)return
        const files=sourceFiles()
        const searchInput=el(mode==="himnario"?"hymnModuleSearch":"multimediaSearchInput") as HTMLInputElement|null
        libraryFiles=mode==="himnario" ? geminiHymnSearch(files,searchInput?.value||"")
            : geminiSearch(files,searchInput?.value||"",typeFilter)
        libraryGrid=area
        libraryRendered=0
        libraryMore=null
        area.replaceChildren()
        area.scrollTop=0
        if(!libraryFiles.length){
            const msg=document.createElement("p")
            msg.className="col-span-full p-5 text-sm text-slate-300"
            msg.textContent=scanning && mode==="multimedia"?"Leyendo archivos del disco…" :
                mode==="himnario"?"Sin vídeos encontrados en esta colección. Vincula tu carpeta de himnos o pulsa Actualizar." :
                files.length?"No se encontraron archivos para este filtro.":"Sin archivos reales encontrados. Pulsa «Vincular carpeta» para elegir tus vídeos, imágenes o audio."
            area.append(msg)
        }else appendLibraryCards()
        showCounts()
        renderToolbar()
    }
    function showModule(next: "multimedia" | "himnario" | "biblia" | "youtube" | "presentaciones" | "captura") {
        if (mode === "biblia" && next !== "biblia") {
            bibleEditorOpen=false
            bibleFollowEnabled=false
            bibleNavigationQueue.length=0
            scriptureView?.$destroy();scriptureView=null
            scriptureTarget=null
            el("moduleView_biblia")?.replaceChildren()
        }
        if(next!=="captura" && capturePanel && mode==="captura"){
            if(!captureParking){
                captureParking=document.createElement("div")
                captureParking.hidden=true
                captureParking.style.display="none"
                document.body.append(captureParking)
            }
            const area=el("moduleView_other")
            if(area)captureParking.append(...Array.from(area.childNodes))
            // Only detach the local monitor. The receiver and every selected
            // physical output keep their own live capture stream running.
            stopJAWindowCapturePreview()
        }
        if(next==="captura"){
            youtubePanel?.$destroy();youtubePanel=null
            presentationsPanel?.$destroy();presentationsPanel=null
        }
        if(next==="presentaciones" && youtubePanel){
            youtubePanel.$destroy();youtubePanel=null
        }
        if(next==="youtube" && presentationsPanel){
            presentationsPanel.$destroy();presentationsPanel=null
        }
        mode=next
        for(const [module,section] of [["multimedia","moduleView_multimedia"],["himnario","moduleView_himnario"],["biblia","moduleView_biblia"],["other","moduleView_other"]]) {
            const node=el(section)
            const visible=module==="other" ? (next==="youtube"||next==="presentaciones"||next==="captura") : module===next
            if(node){node.classList.toggle("hidden",!visible);node.classList.toggle("flex",visible)}
        }
        setupNavigation()
        refreshOnlyAudioButton()
        if(next==="biblia") {clearPresentationPreview();void registerJARV1909().then(()=>{updateBibleUI();if(get(outputs)[selectedId]?.out?.slide?.id==="temp")void restoreBibleControlForOutput(selectedId);else scheduleBiblePreview()});updateBibleUI();scheduleBiblePreview()}
        else if(next==="captura"){
            if(capturePanel){
                const target=el("moduleView_other")
                if(target && captureParking){
                    target.replaceChildren()
                    target.append(...Array.from(captureParking.childNodes))
                }
                refreshCaptureModule()
                const active=capturePanel.getActiveCapture()
                if(active)stageJAWindowCapture(active.stream,active.name)
            }else{
                const target=el("moduleView_other")
                if(target){
                    target.replaceChildren()
                    capturePanelSignature=""
                    capturePanel=new JaGeminiWindowCapture({target,props:{
                        destinations:jaYouTubeDestinations(),selectedTargets:markedGroupTargets(),assigned:captureAssignments()
                    }})
                    capturePanel.$on("stream",(event)=>{
                        const {stream,name}=event.detail
                        if(event.detail.sourceId)captureKnownNames.set(event.detail.sourceId,name)
                        if(mode==="captura")stageJAWindowCapture(stream,name)
                        notice("Captura real de "+name+" preparada en Vista previa. Enviar a pantallas es una acción independiente.")
                    })
                    capturePanel.$on("stopped",()=>{
                        if(mode==="captura")stopJAWindowCapturePreview()
                    })
                    capturePanel.$on("target",(event)=>{
                        const id=event.detail.id as string
                        if(event.detail.enabled)syncedTargetIds.add(id)
                        else syncedTargetIds.delete(id)
                        refreshGroupChoices()
                        refreshCaptureModule()
                    })
                    capturePanel.$on("project",(event)=>{
                        const {sourceId,name,targets}=event.detail
                        publishJAWindowCapture(sourceId,name,targets)
                    })
                    capturePanel.$on("detach",(event)=>{
                        removeJACaptureFromScreens(event.detail.sourceId)
                    })
                }
            }
        }
        else if(next==="presentaciones"){
            if(!presentationsPanel){
                const target=el("moduleView_other")
                if(target){
                    target.replaceChildren()
                    presentationsPanel=new JaGeminiPresentations({target,props:{
                        pdfPath:presentationPdfPath,displayName:presentationSourceName,currentPage:presentationPage,
                        destinations:jaYouTubeDestinations(),selectedTargets:markedGroupTargets(),
                        remoteEnabled:presentationRemoteEnabled,remoteMode:presentationRemoteMode,
                        remoteError:presentationRemoteError,remoteTargets:[...presentationControlledOutputs]
                    }})
                    presentationsPanel.$on("open",openJAPresentationFile)
                    presentationsPanel.$on("screenSettings",openScreenSettings)
                    presentationsPanel.$on("remoteToggle",(event)=>{
                        void setJAPresentationRemoteEnabled(!!event.detail.enabled)
                    })
                    presentationsPanel.$on("remoteMode",(event)=>{
                        setJAPresentationRemoteMode(event.detail.mode)
                    })
                    presentationsPanel.$on("remoteStep",(event)=>{
                        remotePresentationStep(event.detail.action)
                    })
                    presentationsPanel.$on("loaded",(event)=>{
                        const {path,count}=event.detail
                        if(path!==presentationPdfPath)return
                        presentationPageCount=count
                        stagePresentationPage(path,0,count,presentationSourceName)
                    })
                    presentationsPanel.$on("prepare",(event)=>{
                        const {path,page,pages,name}=event.detail
                        if(path!==presentationPdfPath)return
                        stagePresentationPage(path,page,pages,name)
                    })
                    presentationsPanel.$on("send",()=>publishJAPresentation())
                    presentationsPanel.$on("target",(event)=>{
                        const id=event.detail.id as string
                        if(event.detail.enabled)syncedTargetIds.add(id)
                        else syncedTargetIds.delete(id)
                        refreshGroupChoices()
                        refreshPresentationModule()
                    })
                }
            }else refreshPresentationModule()
            if(presentationPdfPath && presentationPageCount && !presentationPreview)
                stagePresentationPage(presentationPdfPath,presentationPage,presentationPageCount,presentationSourceName)
        }
        else if(next==="youtube"){
            if(!youtubePanel){
                const target=el("moduleView_other")
                if(target){
                    target.replaceChildren()
                    youtubePanel=new JaGeminiYouTube({target,props:{
                        initialUrl:youtubePreparedUrl,destinations:jaYouTubeDestinations(),chosen:jaYouTubeTargets()
                    }})
                    youtubePanel.$on("target",(event)=>{
                        const id=event.detail.id as string
                        if(event.detail.enabled)syncedTargetIds.add(id)
                        else syncedTargetIds.delete(id)
                        refreshGroupChoices()
                        youtubePanel?.$set({destinations:jaYouTubeDestinations(),chosen:jaYouTubeTargets()})
                    })
                    youtubePanel.$on("prepare",(event)=>{
                        const id=event.detail.id as string
                        if(!id)return
                        stageYouTubePreview(id)
                        notice("YouTube preparado en Vista previa. Programa permanece intacto.")
                    })
                    youtubePanel.$on("addPlaylist",(event)=>{
                        const id=selectedPlaylistId
                        if(!id)return notice("Crea o selecciona una lista primero.")
                        void playlistPanelAction({type:"addYoutube",id,url:event.detail.url})
                    })
                    youtubePanel.$on("send",(event)=>{
                        const {id,title,targets}=event.detail
                        publishPreparedYouTube(id,targets,title||"YouTube")
                    })
                }
            }else youtubePanel.$set({initialUrl:youtubePreparedUrl,destinations:jaYouTubeDestinations(),chosen:jaYouTubeTargets()})
        }
        else {renderLibrary();if(next==="himnario")void refreshJAHymnLibrary()}
        requestAnimationFrame(layoutPersistentPlaylist)
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
            const draft = await prepareGeminiScriptureDraft(selectedId)
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

    function updateBibleViewButtons(){
        if(mode!=="biblia")return
        for(const b of el("moduleView_biblia")?.querySelectorAll<HTMLButtonElement>(".ja-bible-view")||[])
            b.setAttribute("aria-pressed",String(b.dataset.view===get(scriptureMode)))
    }
    function bibleFollowGroupStillLive(): boolean {
        if(!bibleFollowTargets.length || !bibleFollowVersion || activeBibleId!==bibleFollowVersion)return false
        const actual=getLiveScriptureOutputIds()
        if(actual.length!==bibleFollowTargets.length || !bibleFollowTargets.every(id=>actual.includes(id)))return false
        const current=get(outputs)
        return bibleFollowTargets.every(id=>current[id]?.active && current[id]?.out?.slide?.id==="temp" &&
            current[id]?.out?.slide?.categoryId===bibleFollowVersion)
    }
    function updateBibleFollowControls() {
        if(mode!=="biblia")return
        const follow=el("moduleView_biblia")?.querySelector<HTMLButtonElement>(".ja-bible-follow")
        if(follow){
            const live=bibleFollowGroupStillLive()
            follow.setAttribute("aria-pressed",String(bibleFollowEnabled && live))
            follow.disabled=bibleNavigationBusy || bibleControlRestoring
            follow.textContent=bibleFollowEnabled && live
                ? "● Seguir en Programa ("+bibleFollowTargets.length+")"
                : live ? "○ Seguir en Programa: apagado" : "○ Vista previa solamente"
            follow.title=live
                ? "Activa o pausa el seguimiento de versículos en las pantallas donde ya se proyectó la Biblia"
                : "Proyecta primero un versículo para habilitar el seguimiento en vivo"
        }
        for(const nav of el("moduleView_biblia")?.querySelectorAll<HTMLButtonElement>(".ja-bible-prev,.ja-bible-next")||[])
            nav.disabled=!scriptureView || bibleControlRestoring || bibleNavigationQueue.length>=8
    }
    function armBibleFollow(targets: string[], version: string) {
        ++bibleControlGeneration
        bibleControlRestoring=false
        bibleNavigationQueue.length=0
        if(!targets.includes(selectedId))selectedId=targets[0]||""
        jaControlledOutputId.set(selectedId)
        const actual=getLiveScriptureOutputIds()
        bibleFollowTargets=[...targets]
        bibleFollowVersion=version
        bibleFollowEnabled=targets.length>0 && actual.length===targets.length && targets.every(id=>actual.includes(id))
        rebuildOutputs()
        updateBibleFollowControls()
        if(!bibleFollowEnabled)
            notice("Biblia proyectada, pero todavía no se confirmó el seguimiento nativo de versículos.")
    }
    function enqueueBibleNavigation(moveLeft: boolean) {
        if(mode!=="biblia" || !scriptureView || settingsOpen || bibleEditorOpen || bibleControlRestoring)return
        if(bibleNavigationQueue.length>=8)return notice("Hay demasiados cambios pendientes; comprueba la salida.")
        bibleNavigationQueue.push(moveLeft)
        void runBibleNavigation()
    }
    async function runBibleNavigation() {
        if(bibleNavigationBusy)return
        bibleNavigationBusy=true
        updateBibleFollowControls()
        try {
            while(bibleNavigationQueue.length && mode==="biblia" && scriptureView){
                const moveLeft=bibleNavigationQueue.shift()!
                const routeGeneration=bibleControlGeneration
                const before=JSON.stringify(get(activeScripture).reference||null)
                const follow=bibleFollowEnabled && bibleFollowGroupStillLive() && !get(outLocked)
                await scriptureView.navigatePreparedVerse(moveLeft)
                if(mode!=="biblia" || routeGeneration!==bibleControlGeneration)break
                const after=JSON.stringify(get(activeScripture).reference||null)
                if(before===after)continue
                if(!follow || !bibleFollowEnabled)continue
                // Prepare the exact Bible reference privately before an on-air
                // update; never project a stale result after a rapid selection.
                const version=activeBibleId
                const draft=await prepareGeminiScriptureDraft()
                if(!draft || routeGeneration!==bibleControlGeneration || version!==activeBibleId || after!==JSON.stringify(get(activeScripture).reference||null))
                    continue
                if(routeGeneration!==bibleControlGeneration || !bibleFollowEnabled || get(outLocked) || !bibleFollowGroupStillLive()) {
                    bibleFollowEnabled=false
                    updateBibleFollowControls()
                    continue
                }
                await refreshLiveScripture()
            }
        }catch(error){
            bibleNavigationQueue.length=0
            notice("Error al cambiar el versículo: "+String(error))
        }finally{
            bibleNavigationBusy=false
            updateBibleFollowControls()
        }
    }
    function keyboardGeminiBible(e: KeyboardEvent) {
        if (mode !== "biblia" || settingsOpen || bibleEditorOpen || playlistOpen || !["ArrowLeft","ArrowRight"].includes(e.key)) return
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const focused = document.activeElement as HTMLElement | null
        const target = e.target as HTMLElement | null
        const interactive = "input,textarea,select,button,[contenteditable],[role='textbox'],[role='slider']"
        if (target?.closest?.(interactive) || focused?.closest?.(interactive)) return
        if (!scriptureView) return
        e.preventDefault()
        e.stopImmediatePropagation()
        enqueueBibleNavigation(e.key === "ArrowLeft")
    }
    function chooseBibleBackground(){
        if(!selectedId || !chooseOutput().includes(selectedId))return notice("Selecciona una salida antes de elegir fondo bíblico.")
        bibleBackgroundPickerTarget=selectedId
        sendMain(Main.OPEN_FILE,{id:"ja-gemini-bible-background",channel:"JA_GEMINI_BIBLE_BACKGROUND",
            title:"Elegir imagen de fondo para Biblia",multiple:false,read:false,
            filter:{name:"Imágenes PNG, JPG o WEBP",extensions:["png","jpg","jpeg","webp"]}})
    }
    async function applyBibleStyleToProgram(){
        if(bibleStyleApplyBusy || bibleControlRestoring || bibleNavigationBusy)return
        if(get(outLocked))return notice("Las salidas están bloqueadas")
        const live=getLiveScriptureOutputIds()
        const reference=JSON.stringify(get(activeScripture).reference||null)
        if(!live.length || !live.includes(selectedId))
            return notice("Primero proyecta una Biblia en esta pantalla para aplicar el estilo en vivo.")
        if(live.some(id=>JSON.stringify(get(outputs)[id]?.out?.slide?.scriptureReference||null)!==reference))
            return notice("Vista previa contiene otro versículo. Proyéctalo explícitamente antes de aplicar estilos.")
        if(!biblePreviewReady || biblePreviewReference!==reference)
            return notice("Espera a que termine de prepararse la Vista previa.")
        bibleStyleApplyBusy=true
        try{
            await refreshLiveScripture()
            notice(live.length>1?"Estilo de Primario aplicado al grupo bíblico.":"Estilo aplicado a la pantalla seleccionada.")
        }catch(error){notice("No se pudo aplicar el estilo en Programa: "+String(error))}
        finally{bibleStyleApplyBusy=false}
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
                ++bibleControlGeneration
                bibleNavigationQueue.length=0
                bibleFollowEnabled=false
                bibleFollowTargets=[]
                bibleFollowVersion=""
                activeBibleId=versions.value
                drawerTabsData.update(data => ({...data,scripture:{...data.scripture,activeSubTab:activeBibleId}}))
                scriptureView?.$set({active:activeBibleId})
                scheduleBiblePreview()
            }
            bar.append(versions)
            for (const [label,which] of [["Vista cuadriculada","grid"],["Vista de lista","list"]] as const) {
                const button=document.createElement("button")
                button.type="button";button.textContent=label
                button.className="ja-bible-view"
                button.dataset.view=which
                button.setAttribute("aria-pressed",String(get(scriptureMode)===which))
                button.onclick=()=>scriptureMode.set(which)
                bar.append(button)
            }
            const project=document.createElement("button")
            project.type="button"
            project.className="ja-bible-project"
            project.textContent="▶ Proyectar en pantallas marcadas"
            project.onclick=()=>{
                if (get(outLocked)) return notice("Las salidas están bloqueadas")
                const ids=chooseOutput()
                const marked=markedGroupTargets()
                if(marked.length>1){void sendPreparedToGroup();return}
                const destinationId=marked[0] || ""
                if (!destinationId || !ids.includes(destinationId) || !get(outputs)[destinationId]?.active)
                    return notice("Selecciona una pantalla externa activa en Envío rápido antes de proyectar la Biblia.")
                if (!biblePreviewReady || biblePreviewReference !== JSON.stringify(get(activeScripture).reference || null))
                    return notice("Primero prepara el versículo en Vista previa; comprueba que terminó de cargar.")
                if (!activeBibleId || !get(activeScripture).reference?.verses?.[0]?.length)
                    return notice("Selecciona primero un libro, capítulo y versículo de la Biblia.")
                // The existing Scripture router supports an explicit outputId;
                // this does NOT broadcast to other physical screens.
                const version=activeBibleId
                const referenceSent=JSON.stringify(get(activeScripture).reference||null)
                void sendScriptureToJAOutputs([destinationId]).then(()=>{
                    const result=get(outputs)[destinationId]?.out?.slide
                    if (result?.id !== "temp" || result?.categoryId !== version ||
                        version!==activeBibleId ||
                        JSON.stringify(get(activeScripture).reference||null)!==referenceSent ||
                        JSON.stringify(result?.scriptureReference||null)!==referenceSent)
                        notice("No se confirmó la Biblia en "+(get(outputs)[destinationId]?.name||destinationId)+". Comprueba la salida activa.")
                    else armBibleFollow([destinationId],version)
                }).catch(error=>notice("Error al proyectar Biblia: "+String(error)))
            }
            bar.append(project)
            const previous=document.createElement("button")
            previous.type="button"
            previous.className="ja-bible-prev"
            previous.textContent="← Anterior"
            previous.title="Versículo anterior: Vista previa y, si se habilitó, Programa"
            previous.onclick=()=>enqueueBibleNavigation(true)
            bar.append(previous)
            const next=document.createElement("button")
            next.type="button"
            next.className="ja-bible-next"
            next.textContent="Siguiente →"
            next.title="Versículo siguiente: Vista previa y, si se habilitó, Programa"
            next.onclick=()=>enqueueBibleNavigation(false)
            bar.append(next)
            const liveFollow=document.createElement("button")
            liveFollow.type="button"
            liveFollow.className="ja-bible-follow"
            liveFollow.setAttribute("aria-pressed","false")
            liveFollow.onclick=()=>{
                if(bibleNavigationBusy)return
                if(!bibleFollowGroupStillLive())
                    return notice("Primero proyecta un pasaje en las pantallas donde quieras avanzar versículos.")
                bibleFollowEnabled=!bibleFollowEnabled
                updateBibleFollowControls()
            }
            bar.append(liveFollow)
            const editorButton=document.createElement("button")
            editorButton.type="button"
            editorButton.className="ja-bible-edit-style"
            editorButton.textContent="✎ Editar apariencia"
            editorButton.title="Fuente, tamaño, color, alineación y fondo por pantalla"
            editorButton.onclick=()=>{if(!selectedId)return notice("Activa una pantalla antes de editar.");bibleEditorOpen=!bibleEditorOpen}
            bar.append(editorButton)
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
        updateBibleViewButtons()
        if (activeBibleId && scriptureTarget) {
            if (!scriptureView) { scriptureTarget.replaceChildren(); scriptureView=new Scripture({target:scriptureTarget,props:{active:activeBibleId,searchValue:"",geminiPreviewOnly:true}}) }
            else scriptureView.$set({active:activeBibleId})
            updateBibleFollowControls()
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
            if(channel === "JA_GEMINI_PRESENTATION_FILE"){
                const path=Array.isArray(files)&&typeof files[0]==="string"?files[0]:""
                if(path)void loadJAPresentationFile(path)
                return
            }
            if(channel === "JA_GEMINI_BIBLE_BACKGROUND") {
                const destination=bibleBackgroundPickerTarget
                bibleBackgroundPickerTarget=""
                if(!destination || destination!==selectedId || !get(outputs)[destination]?.active)return
                const path=Array.isArray(files)&&typeof files[0]==="string"?files[0]:""
                if(path && /\.(png|jpe?g|webp)$/i.test(path)){
                    setJABibleAppearance(destination,{backgroundMode:"image",backgroundPath:path})
                    notice("Imagen de fondo preparada para "+(get(outputs)[destination]?.name||destination))
                }
                return
            }
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
            ["captura","▣ Captura de ventanas"],
            ["fondos","▧ Fondos"],
            ["listas","☰ Listas"]
        ]) {
            const button=document.createElement("button")
            button.type="button"
            button.className="ja-nav-button w-full px-3 py-3 text-left text-sm text-slate-200 hover:bg-[#142c54] rounded-md"
            button.textContent=label
            button.setAttribute("aria-current",String(id===mode))
            if(id==="biblia"||id==="multimedia"||id==="himnario"||id==="youtube"||id==="presentaciones"||id==="captura")
                button.onclick=()=>showModule(id)
            else if(id==="listas")
                button.onclick=focusPersistentPlaylist
            else {button.disabled=true;button.title="Módulo pendiente de integración en JA Gemini"}
            menu.append(button)
        }
    }
    function updatePreviewProgress() {
        const isScriptureDraft = !!biblePreviewRenderer && biblePreviewReady
        const playButton = el("btnPreviewPlay") as HTMLButtonElement | null
        const muteButton = el("btnPreviewMute") as HTMLButtonElement | null
        const seek = el("previewSeekSlider") as HTMLInputElement | null
        if(presentationPreview){
            if(playButton){
                playButton.disabled=presentationPage>=presentationPageCount-1
                playButton.title="Preparar la siguiente diapositiva"
                playButton.textContent="▶"
            }
            if(muteButton){muteButton.disabled=true;muteButton.title="La presentación no tiene pista de audio"}
            if(seek){
                seek.disabled=presentationPageCount<=1
                seek.min="1";seek.max=String(presentationPageCount||1);seek.step="1"
                seek.value=String(presentationPage+1)
                seek.title="Número de diapositiva"
            }
            const counter=el("previewTimeCounter")
            if(counter)counter.textContent="Diapositiva "+(presentationPage+1)+" / "+presentationPageCount
            if(previewLinkButton){previewLinkButton.disabled=true;previewLinkButton.textContent="🔗 Vincular"}
            return
        }
        if(youtubePreview){
            const yt=youtubePreviewState
            if(playButton){
                playButton.disabled=!yt.ready
                playButton.title="Reproducir o pausar YouTube en Vista previa"
                playButton.textContent=yt.paused?"▶":"Ⅱ"
            }
            const mute=el("btnPreviewMute") as HTMLButtonElement|null
            if(mute){mute.disabled=!yt.ready;mute.textContent=yt.muted?"🔇":"🔊"}
            const seek=el("previewSeekSlider") as HTMLInputElement|null
            if(seek){
                seek.disabled=!yt.ready || yt.duration<=0
                seek.max=String(yt.duration||1)
                if(document.activeElement!==seek)seek.value=String(yt.currentTime)
            }
            const counter=el("previewTimeCounter")
            if(counter)counter.textContent=time(yt.currentTime)+" / "+time(yt.duration)
            if(previewLinkButton){previewLinkButton.disabled=true;previewLinkButton.textContent="🔗 Vincular"}
            return
        }
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
    function prepare(path: string, autoplay=previewAutoplay) {
        clearPresentationPreview()
        clearYouTubePreview()
        biblePreviewGeneration++
        if (biblePreviewTimer) clearTimeout(biblePreviewTimer)
        biblePreviewRenderer?.$destroy()
        biblePreviewRenderer = null
        biblePreviewReady = false
        prepared = path
        refreshOnlyAudioButton()
        const samePlayingVideo = autoplay && !!(playingPath && selectedId &&
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
            if(type==="audio"){
                const poster=document.createElement("div")
                poster.className="ja-native-audio-preview"
                poster.setAttribute("role","img")
                poster.setAttribute("aria-label","Archivo de audio seleccionado: "+fileName(path))
                const symbol=document.createElement("span")
                symbol.textContent="♫"
                const title=document.createElement("strong")
                title.textContent=fileName(path)
                const hint=document.createElement("small")
                hint.textContent="Vista previa silenciada · usa ▶ y 🔊 para escuchar"
                poster.append(symbol,title,hint)
                target.append(poster)
            }
            const m = document.createElement(type === "video" ? "video" : "audio")
            m.className = type==="audio" ? "ja-native-audio-preview-element" : "w-full h-full object-contain"
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
                } else if (autoplay) {
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
            img.onerror=()=>{if(img.isConnected){img.replaceWith(document.createTextNode("No se pudo abrir esta imagen. Comprueba su formato y ruta."));notice("Vista previa: imagen no compatible o inaccesible.")}}
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
        jaPlaylists.set(jaReadPlaylists())
        selectedPlaylistId=get(jaPlaylists)[0]?.id||""
        try{
            const savedProfiles=JSON.parse(localStorage.getItem(JA_SCREEN_PROFILES)||"{}")
            if(savedProfiles && typeof savedProfiles==="object"&&!Array.isArray(savedProfiles))
                screenProfiles=Object.fromEntries(Object.entries(savedProfiles).filter(([key,id])=>
                    key.length<180 && typeof id==="string" && id.length<150).slice(0,60)) as Record<string,string>
            const hidden=JSON.parse(localStorage.getItem(JA_HIDDEN_OUTPUTS)||"[]")
            manuallyHiddenOutputs=new Set(Array.isArray(hidden)?hidden.filter((id):id is string=>
                typeof id==="string" && id.length<150).slice(0,60):[])
            habitualPrimaryId=localStorage.getItem(JA_HABITUAL_PRIMARY)||localStorage.getItem("ja-main-projector")||""
        }catch{}
        screenPoll=setInterval(()=>{void refreshDisplaySafety()},3000)
        playlistMonitor=setInterval(watchJAPlaylist,350)
        // FreeShow may restore audio routing asynchronously after this shell
        // mounts. Reconcile against the actual main input whenever it changes.
        const stopAudioRouteReconciliation=audioRouting.subscribe(config=>{
            if(!config || !host)return
            syncJAPrimaryAudioRoute()
        })
        cleanup.push(stopAudioRouteReconciliation)
        loadJABibleAppearances()
        try{
            const parsed=JSON.parse(localStorage.getItem(VIDEO_LOOP_STORAGE)||"{}")
            if(parsed && typeof parsed==="object"&&!Array.isArray(parsed)){
                const safe:Record<string,Record<string,boolean>>={}
                for(const [id,paths] of Object.entries(parsed).slice(0,32)){
                    if(id.length>128||!paths||typeof paths!=="object"||Array.isArray(paths))continue
                    safe[id]=Object.fromEntries(Object.entries(paths).slice(-100)
                        .filter(([path,value])=>path.length<4096&&typeof value==="boolean"))
                }
                videoLoopPrefs=safe
            }
        }catch{}
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
        requestAnimationFrame(layoutPersistentPlaylist)
        window.addEventListener("resize",layoutPersistentPlaylist)
        cleanup.push(()=>window.removeEventListener("resize",layoutPersistentPlaylist))
        void refreshDisplaySafety()
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
                if(presentationPreview){
                    const next=Math.max(0,Math.min(presentationPageCount-1,Math.round(seconds)-1))
                    if(next!==presentationPage)stagePresentationPage(presentationPdfPath,next,presentationPageCount,presentationSourceName)
                    return
                }
                if(youtubePreview){youtubePreview.seek(seconds);return}
                if (!previewMedia) return
                if(isLinkedVideo())VideoPlayer.seekTo(playingPath,selectedId,seconds)
                else previewMedia.currentTime=seconds
            })
        }
        bind("btnPreviewPlay", () => {
            if(presentationPreview){movePresentationPage(1);return}
            if(youtubePreview){youtubePreview.toggle();return}
            if(!previewMedia)return
            if(isLinkedVideo()){
                if(videoState.paused)VideoPlayer.play(playingPath,selectedId)
                else VideoPlayer.pause(playingPath,selectedId)
            }else if(previewMedia.paused)void previewMedia.play().catch(()=>notice("No se pudo iniciar Vista previa"))
            else previewMedia.pause()
        })
        bind("btnPreviewMute",()=>{if(presentationPreview)return;if(youtubePreview){youtubePreview.toggleMute();return}if(previewMedia){if(isLinkedVideo()){previewMedia.muted=true;notice("Vista previa vinculada permanece silenciada para evitar audio duplicado")}else previewMedia.muted=!previewMedia.muted;updatePreviewProgress()}})
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
            programLoopButton=document.createElement("button")
            programLoopButton.type="button"
            programLoopButton.className="ja-video-loop-button text-xs border rounded px-2 py-1"
            programLoopButton.onclick=()=>{void changeLoopForSelectedOutput()}
            programButtons.append(programLoopButton)
            cleanup.push(()=>programLoopButton?.remove())
            updateProgramLoopButton()
            const mute = document.createElement("button")
            mute.type = "button"; mute.textContent = "🔊"
            mute.title = "Silenciar/reactivar vídeo de Programa"
            mute.className = clear.className
            mute.onclick = muteProgram
            programMute = mute
            programButtons.append(mute)
            cleanup.push(() => mute.remove())
            // Own small audio strip below Program transport. The existing
            // video timer, seek and volume remain exactly as approved.
            jaAudioContainer=document.createElement("div")
            jaAudioContainer.className="ja-audio-controller-slot"
            jaAudioContainer.hidden=true
            programButtons.parentElement?.after(jaAudioContainer)
            cleanup.push(()=>jaAudioContainer?.remove())
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
        // Only these two existing scroll containers can request extra rows.
        for(const id of ["hymnModuleGrid","multimediaCardsGrid"]){
            const grid=el(id)
            if(!grid)continue
            const listener=()=>onLibraryScroll(grid)
            grid.addEventListener("scroll",listener,{passive:true})
            cleanup.push(()=>grid.removeEventListener("scroll",listener))
        }
        const uOutputs = outputs.subscribe(() => { rebuildOutputs(); renderRealHeader(); if(mode==="biblia")updateBibleFollowControls() })
        const uPlayingForGroup = playingVideos.subscribe(() => { if(host){refreshGroupChoices();updateProgramLoopButton()} })
        const uGroupLock = outLocked.subscribe(() => { if(host)refreshGroupChoices() })
        const uSaved = saved.subscribe(() => renderRealHeader())
        const uFolders = mediaFolders.subscribe(() => { void scanMediaFolders() })
        const uBibles = scriptures.subscribe(() => { if(mode==="biblia") {updateBibleUI();scheduleBiblePreview()} })
        const uScriptureDraft = activeScripture.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleTab = drawerTabsData.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleTemplate = templates.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleSettings = scriptureSettings.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        const uBibleMode = scriptureMode.subscribe(() => { if(mode==="biblia")updateBibleViewButtons() })
        const uBibleAppearance = jaBibleAppearances.subscribe(() => { if(mode==="biblia")scheduleBiblePreview() })
        window.addEventListener("keydown", keyboardGeminiBible, true)
        cleanup.push(() => window.removeEventListener("keydown", keyboardGeminiBible, true))
        window.addEventListener("keydown", keyboardGeminiPresentations, true)
        cleanup.push(() => window.removeEventListener("keydown", keyboardGeminiPresentations, true))
        const remoteToken=receiveToMain(ToMain.JA_PRESENTATION_REMOTE,({action})=>{
            if(action==="next"||action==="previous")remotePresentationStep(action)
        })
        cleanup.push(()=>destroyMain(remoteToken))
        const uHymn = hymnVideos.subscribe(() => { if(mode==="himnario")renderLibrary() })
        const uCollections = hymnCollectionPaths.subscribe(() => { if(mode==="himnario")renderLibrary() })
        const uRoots = hymnSourcePaths.subscribe(() => { void scanMediaFolders() })
        const uStatuses = hymnSourceStatus.subscribe(() => { if(mode==="himnario")renderToolbar() })
        cleanup.push(uOutputs, uPlayingForGroup, uGroupLock, uSaved, uFolders, uBibles, uScriptureDraft, uBibleTab, uBibleTemplate, uBibleSettings, uBibleMode, uBibleAppearance, uHymn, uCollections, uRoots, uStatuses)
        rebuildOutputs()
        const noScreenTimeout=setTimeout(()=>hideNoScreenNotice=true,7500)
        return () => {
            clearTimeout(noScreenTimeout)
            if(screenNoticeTimer)clearTimeout(screenNoticeTimer)
            if(audioProblemTimer)clearTimeout(audioProblemTimer)
            if(playlistNoticeTimer)clearTimeout(playlistNoticeTimer)
            if (timer) clearTimeout(timer)
            playlistDockObserver?.disconnect()
            if(playlistModuleArea)playlistModuleArea.style.paddingRight=playlistModuleAreaPadding
            if(playlistMonitor)clearInterval(playlistMonitor)
            if(screenPoll)clearInterval(screenPoll)
            stopJAPlaylist()
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
            youtubePanel?.$destroy()
            youtubePanel=null
            // Never leave PageUp/PageDown captured after the JA console closes.
            sendMain(Main.JA_PRESENTATION_REMOTE_SET,{enabled:false})
            stopJAWindowCapture()
            capturePanel?.$destroy()
            capturePanel=null
            captureParking?.remove()
            captureParking=null
            captureGlobalStatus?.remove()
            captureGlobalStatus=null
            presentationsPanel?.$destroy()
            presentationsPanel=null
            clearPresentationPreview()
            clearYouTubePreview()
            previewMedia?.pause()
            ++jaAudioGeneration
            jaAudioControls?.$destroy()
            jaAudioControls=null
            // Do not stop unrelated FreeShow music. Only the session started
            // explicitly from this JA console belongs to us.
            JaSoloAudioPlayer.stop()
            restoreSoloProgramSound()
            jaAudioPath=""
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
    {#if displaysChecked && knownExternalDisplayIds.size===0 && !hideNoScreenNotice}
        <div class="ja-screen-live-notice" role="status">
            <strong>Sin pantalla externa</strong>
            Puedes reproducir video, audio y listas en la consola. La proyección se activará al conectar un monitor.
            <button type="button" aria-label="Cerrar aviso sin pantalla externa" title="Cerrar aviso" on:click={()=>hideNoScreenNotice=true}>✕</button>
        </div>
    {/if}
    {#if screenNotice}
        <div class="ja-screen-alert" role="alert" aria-live="assertive">
            <strong>Estado de pantallas</strong>
            <span>{screenNotice}</span>
            {#if restoreCandidateId}
                <button type="button" on:click={restoreHabitualPrimary}>Restaurar principal</button>
                <button type="button" on:click={()=>{restoreCandidateId="";screenNotice="Se conserva la principal provisional."}}>Mantener actual</button>
            {:else}
                <button type="button" on:click={()=>{settingsStartSection="screens";settingsOpen=true}}>Configurar</button>
                <button type="button" on:click={()=>screenNotice=""} aria-label="Cerrar aviso de pantallas">✕</button>
            {/if}
        </div>
    {/if}
    {#if audioProblem}
        <div class="ja-audio-visible-error" role="alert">
            <strong>♫ Solo audio</strong> {audioProblem}
            <button type="button" on:click={()=>audioProblem=""} aria-label="Cerrar advertencia de audio">✕</button>
        </div>
    {/if}
    {#if quickAudioOpen}
        <JaGeminiQuickAudioPanel files={playlistLibraryFiles} currentPath={jaAudioPath}
            busy={jaAudioBusy} preparedVideo={prepared && getMediaType(getExtension(prepared))==="video" ? fileName(prepared) : ""}
            preparedAudioOnly={audioOnlyLocal}
            on:togglePrepared={event=>{audioOnlyLocal=event.detail.enabled;refreshOnlyAudioButton()}}
            on:close={()=>quickAudioOpen=false}
            on:play={event=>{void playBackgroundAudioAnywhere(event.detail.path)}}
            on:stop={stopBackgroundAudioAnywhere}/>
    {/if}
    {#if playlistDockReady}
        <JaGeminiPlaylistPanel docked={true} dockStyle={playlistDockStyle}
            playlists={$jaPlaylists}
            selectedId={selectedPlaylistId}
            runningPlaylistId={playlistCurrentId}
            runningIndex={playlistIndex}
            running={playlistRunning}
            busy={playlistBusy}
            currentFile={playlistCurrentFile}
            libraryFiles={playlistLibraryFiles}
            paused={playlistPaused}
            playbackNotice={playlistNotice}
            primaryLabel={get(outputs)[localStorage.getItem("ja-main-projector")||""]?.name||"Audio del equipo"}
            outputChoices={playlistOutputChoices} selectedTargets={playlistSelectedTargets}
            on:action={event=>{void playlistPanelAction(event.detail)}}/>
    {/if}
    {#if bibleEditorOpen && mode==="biblia"}
        <JaGeminiBibleEditor outputId={selectedId} on:close={() => {bibleEditorOpen=false}}
            on:chooseBackground={chooseBibleBackground}
            on:applyToProgram={() => {void applyBibleStyleToProgram()}}/>
    {/if}
    {#if settingsOpen}
        <JaGeminiSettings
            selectedOutputId={selectedId}
            mainOutputId={localStorage.getItem("ja-main-projector")||""}
            hiddenOutputIds={[...manuallyHiddenOutputs]}
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
            on:selectOutput={(event) => { inspectOutput(event.detail.id) }}
            on:assignDisplay={(event) => { void assignMonitorToOutput(event.detail.displayId,event.detail.bounds,event.detail.outputId) }}
            on:createDisplayOutput={(event) => { void createPhysicalOutput(event.detail.displayId,event.detail.bounds,event.detail.name) }}
            on:activateDisplay={(event) => { void activateConfiguredOutput(event.detail.outputId,event.detail.displayId) }}
            on:makePrimary={(event) => { makeOutputPrimary(event.detail.id) }}
            on:toggleProjection={(event) => { setProjectionVisible(event.detail.id,event.detail.visible) }}
            on:forgetOutput={(event) => { forgetDisconnectedOutput(event.detail.id) }}
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
.ja-screen-alert,.ja-screen-live-notice{position:absolute;right:14px;z-index:120;padding:10px 12px;border-radius:9px;border:2px solid #f6ce55;background:#14284a;color:white;box-shadow:0 8px 28px #000b;font-size:12px;max-width:min(410px,75vw);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ja-screen-alert{top:70px}.ja-screen-live-notice{bottom:12px;right:12px;max-width:340px}
.ja-screen-alert strong,.ja-screen-live-notice strong{color:#ffe39b}
.ja-screen-alert button{padding:5px 8px;background:#205785;border:1px solid #8ab6de;border-radius:5px;color:white;cursor:pointer}

.ja-audio-visible-error{position:absolute;bottom:12px;left:14px;z-index:90;width:min(525px,65vw);background:#5b2728;color:#fff4e8;border:2px solid #ffa778;border-radius:8px;padding:9px 12px;display:flex;gap:10px;align-items:center;font-size:12px;box-shadow:0 7px 24px #000a}
.ja-audio-visible-error button{margin-left:auto;background:#863b3e;color:white;border:1px solid #eab4ac;border-radius:5px;padding:2px 7px;cursor:pointer}
:global(.ja-media-card) .ja-card-solo-audio{display:block;position:absolute;bottom:35px;right:8px;background:#173c65;color:#fff;border:1px solid #6ebce4;border-radius:6px;padding:2px 9px;font-size:17px;cursor:pointer;z-index:3}
:global(.ja-media-card) .ja-card-solo-audio:hover{background:#276d9b}
</style>
