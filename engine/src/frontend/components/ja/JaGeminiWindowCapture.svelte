<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte"
    import { Main } from "../../../types/IPC/Main"
    import { requestMain, sendMain } from "../../IPC/main"
    import { shareJACapture } from "../../utils/jaCaptureRelay"

    type CaptureSource={id:string;name:string;kind:"window"|"screen"}
    export let destinations:Array<{id:string;name:string;primary:boolean}>=[]
    export let selectedTargets:string[]=[]
    export let assigned:Record<string,string[]>={}
    export let hidePointerInJA=true
    const dispatch=createEventDispatcher()
    let sources:CaptureSource[]=[]
    let sourceId=""
    let stream:MediaStream|null=null
    let video:HTMLVideoElement|null=null
    let busy=false
    let loading=false
    let error=""
    let status="Sin captura"
    let sourceName=""
    let previewExpanded=false
    let sourceSwitch=0
    let width=0
    let height=0
    let generation=0
    let requested=false
    let isAlive=true
    let stopPublisher:(()=>void)|null=null
    $: if(!requested){requested=true;void refresh()}
    function stop(reason="Captura detenida"){
        const stoppingSource=stream?sourceId:""
        stopPublisher?.()
        stopPublisher=null
        generation++
        stream?.getTracks().forEach(track=>track.stop())
        stream=null
        if(video){video.pause();video.srcObject=null}
        status=reason
        width=0
        height=0
        dispatch("stopped",{sourceId:stoppingSource})
    }
    export function stopCapture(){stop()}
    export function getActiveCapture(){
        return stream && stream.active?{stream,name:sourceName,sourceId}:null
    }
    function project(){
        if(!stream || !stream.active || !sourceId)return
        dispatch("project",{sourceId,name:sourceName,targets:[...selectedTargets]})
    }
    function detach(){
        if(!sourceId)return
        dispatch("detach",{sourceId})
    }
    function locateTargets(){dispatch("focusTargets")}
    function togglePointer(){
        hidePointerInJA=!hidePointerInJA
        dispatch("cursor",{hidden:hidePointerInJA})
    }
    async function refresh(){
        loading=true
        error=""
        try{
            const [windows,screens]=await Promise.all([
                requestMain(Main.GET_WINDOWS),
                requestMain(Main.GET_SCREENS)
            ])
            if(!isAlive)return
            const captured=new Set<string>()
            const items:CaptureSource[]=[]
            for(const [kind,rows] of [["window",windows],["screen",screens]] as const){
                for(const item of rows||[]){
                    if(!item?.id || captured.has(item.id))continue
                    captured.add(item.id)
                    items.push({id:item.id,name:item.name||item.id,kind})
                }
            }
            sources=items
            if(!sources.some(x=>x.id===sourceId))sourceId=""
            if(!sources.length)error="Windows no devolvió fuentes de captura. Abre PowerPoint, UxPlay u otra ventana e inténtalo de nuevo."
        }catch(e){
            if(isAlive)error="No fue posible consultar ventanas de Windows: "+String(e)
        }finally{if(isAlive)loading=false}
    }
    async function selectSource(){
        const token=++sourceSwitch
        if(stream)stop("Cambiando fuente")
        if(!sourceId)return
        // Selecting a Windows window prepares its local feed; it does not publish to Programa.
        if(token===sourceSwitch)await start()
    }
    function toggleConnection(){
        if(stream)stop()
        else void start()
    }
    function ended(){
        if(!stream)return
        stop("La ventana o pantalla dejó de emitir imagen")
    }
    async function start(){
        if(!sourceId||busy)return
        const selected=sources.find(x=>x.id===sourceId)
        if(!selected)return
        stop("Preparando captura")
        const token=generation
        busy=true
        error=""
        status="Solicitando imagen a Windows…"
        try{
            // Reuse FreeShow's existing Chromium desktop-capture contract.
            // No mocked frames and no output projection in this first POC.
            const constraints:any={
                audio:false,
                video:{mandatory:{
                    chromeMediaSource:"desktop",
                    chromeMediaSourceId:selected.id,
                    maxWidth:1920,maxHeight:1080,maxFrameRate:30
                }}
            }
            const captured=await navigator.mediaDevices.getUserMedia(constraints)
            if(!isAlive || token!==generation){
                captured.getTracks().forEach(track=>track.stop())
                return
            }
            stream=captured
            stopPublisher=shareJACapture(selected.id,captured)
            sourceName=selected.name
            for(const track of captured.getVideoTracks())track.addEventListener("ended",ended,{once:true})
            if(video){
                video.srcObject=captured
                video.muted=true
                try{await video.play()}catch{}
            }
            status="Captura activa · "+sourceName
            const track=captured.getVideoTracks()[0]
            const settings=track?.getSettings()
            width=settings?.width||0
            height=settings?.height||0
            dispatch("stream",{stream:captured,name:sourceName,sourceId:selected.id,kind:selected.kind})
        }catch(e){
            if(token===generation){
                error="Windows no pudo capturar esta fuente: "+String(e)
                status="Captura fallida"
                // User may need to grant screen-recording permission.
                sendMain(Main.ACCESS_SCREEN_PERMISSION)
            }
        }finally{if(isAlive)busy=false}
    }
    onDestroy(()=>{isAlive=false;stop("Cerrado")})
</script>
<section class="ja-capture" aria-label="Captura de ventanas y pantallas">
    <header class="ja-capture-header">
        <div class="ja-capture-heading">
            <h2>▣ Captura de ventanas</h2>
            <p>Proyecta cualquier ventana de Windows sin salir de JA</p>
        </div>
        <span class:ja-live={!!stream} class:ja-error-state={!!error} class="ja-state" role="status">
            {busy?"◌ Conectando":stream?"● Capturando":error?"● Error":"○ Sin captura"}
        </span>
    </header>

    <div class="ja-capture-card">
        <div class="ja-section-title">FUENTE</div>
        <div class="ja-source-controls">
            <select aria-label="Ventana o pantalla para capturar" bind:value={sourceId} on:change={selectSource} disabled={busy}>
                <option value="">Elegir una ventana o pantalla…</option>
                {#each sources as source (source.id)}
                    <option value={source.id}>{source.kind==="window"?"▣":"▤"} {source.name}</option>
                {/each}
            </select>
            <button type="button" class="ja-icon-button" on:click={refresh} disabled={loading||busy} title="Actualizar ventanas disponibles" aria-label="Actualizar ventanas disponibles">↻</button>
            <button type="button" class:ja-disconnect={!!stream} class="ja-connect" on:click={toggleConnection} disabled={!sourceId||busy}>
                {busy?"Conectando…":stream?"Desconectar":"Conectar"}
            </button>
        </div>
        <div class="ja-section-title ja-destination-title">PROYECCIÓN</div>
        <div class="ja-output-controls">
            <div class="ja-output-summary" title={selectedTargets.map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")}>
                <span class="ja-output-dot">●</span>
                {selectedTargets.length
                    ?selectedTargets.map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")
                    :"Sin pantallas seleccionadas"}
            </div>
            <button type="button" class="ja-target-link" on:click={locateTargets}>Elegir pantallas</button>
            <button type="button" class="ja-capture-publish" on:click={project}
                disabled={!stream||!selectedTargets.length||busy}>▶ Enviar</button>
        </div>
        {#if sourceId && assigned[sourceId]?.length}
            <div class="ja-onair">
                <span>● En Programa: {assigned[sourceId].map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")}</span>
                <button type="button" on:click={detach}>Retirar de pantallas</button>
            </div>
        {/if}
        <div class="ja-card-bottom">
            <label title="Oculta el puntero sobre JA y las salidas. Windows puede incrustar el puntero dentro de la propia captura.">
                <input type="checkbox" checked={hidePointerInJA} on:change={togglePointer}/>
                Ocultar puntero en JA
            </label>
            <button type="button" class="ja-preview-toggle" on:click={()=>previewExpanded=!previewExpanded}
                aria-expanded={previewExpanded} aria-controls="ja-capture-preview">
                {previewExpanded?"▴ Ocultar monitor":"▾ Mostrar monitor"}
            </button>
        </div>
    </div>
    {#if error}<div class="ja-capture-error" role="alert">{error}</div>{/if}
    <div class="ja-preview-panel" id="ja-capture-preview" class:ja-preview-closed={!previewExpanded}>
        <div class="ja-capture-stage" class:ja-hide-cursor={hidePointerInJA}>
            <video bind:this={video} autoplay muted playsinline aria-label="Monitor local de captura de Windows"></video>
            {#if !stream}
                <div class="ja-capture-placeholder">Selecciona una fuente para verla aquí.</div>
            {:else}
                <span class="ja-capture-stage-label">● DIRECTO</span>
            {/if}
        </div>
    </div>
    <div class="ja-status-line">
        <span>{status}{width&&height?" · "+width+" × "+height:""}</span>
        <span>La captura permanece activa al cambiar de módulo</span>
    </div>
</section>
<style>
.ja-capture{display:flex;flex-direction:column;gap:10px;height:100%;overflow:auto;padding:14px 16px;color:#eaf4ff;background:#0b1a37;font-size:12px}
.ja-capture-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ja-capture-heading h2{font-size:17px;font-weight:750;color:#ffe000;margin:0 0 3px}
.ja-capture-heading p{font-size:10px;color:#a8bfda;margin:0}
.ja-state{color:#adbed5;background:#172b49;border:1px solid #355478;padding:5px 10px;border-radius:20px;white-space:nowrap;font-size:11px}
.ja-state.ja-live{color:#90ecc0;background:#123c32;border-color:#276a55}
.ja-state.ja-error-state{color:#ffb4b9;background:#422430;border-color:#87424d}
.ja-capture button,.ja-capture select{background:#203c63;color:#f2f8ff;border:1px solid #547397;border-radius:7px;padding:8px 10px;max-width:100%;font:inherit}
.ja-capture button{cursor:pointer;white-space:nowrap}
.ja-capture button:disabled{opacity:.42;cursor:not-allowed}
.ja-capture button:focus-visible,.ja-capture select:focus-visible{outline:2px solid #4cd1fd;outline-offset:2px}
.ja-capture-card{background:#132a4a;border:1px solid #36577e;border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:9px}
.ja-section-title{font-size:10px;font-weight:750;letter-spacing:.08em;color:#93b0d1}
.ja-source-controls,.ja-output-controls,.ja-card-bottom,.ja-onair{display:flex;align-items:center;gap:8px}
.ja-source-controls select{min-width:0;flex:1}
.ja-capture button.ja-icon-button{font-size:18px;line-height:1;padding:7px 11px}
.ja-capture button.ja-connect{min-width:90px;background:#254b72;border-color:#5d8bb6}
.ja-capture button.ja-disconnect{background:transparent;border-color:#547397;color:#c5d8ee}
.ja-destination-title{margin-top:5px}
.ja-output-summary{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d6e8f9}
.ja-output-dot{color:#75bcef;margin-right:6px}
.ja-capture button.ja-target-link{background:transparent;border-color:transparent;color:#9fd3ff;text-decoration:underline}
.ja-capture button.ja-capture-publish{background:#2d75ae;border-color:#72b6ed;font-weight:700;min-width:85px}
.ja-onair{flex-wrap:wrap;justify-content:space-between;color:#8ce4b4;font-size:11px;padding:8px 0 2px;border-top:1px solid #345476}
.ja-onair button{font-size:10px;padding:5px 7px}
.ja-card-bottom{justify-content:space-between;flex-wrap:wrap;border-top:1px solid #345476;padding-top:9px;margin-top:3px}
.ja-card-bottom label{display:flex;align-items:center;gap:6px;color:#bdd4ed;font-size:11px;cursor:pointer}
.ja-card-bottom input{accent-color:#4cd1fd}
.ja-capture button.ja-preview-toggle{background:transparent;border:0;color:#9fd3ff;padding:4px}
.ja-preview-panel{width:100%}
.ja-preview-panel.ja-preview-closed{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;pointer-events:none}
.ja-capture-stage{position:relative;max-width:340px;width:100%;aspect-ratio:16/9;background:#030b19;border:1px solid #345a81;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.ja-capture-stage video{width:100%;height:100%;object-fit:contain}
.ja-capture-stage.ja-hide-cursor,.ja-capture-stage.ja-hide-cursor *{cursor:none!important}
.ja-capture-placeholder{position:absolute;text-align:center;color:#a8c6e2;padding:12px;font-size:11px}
.ja-capture-stage-label{position:absolute;left:8px;top:8px;background:#063c30ee;border:1px solid #3b986e;color:#c8f8dd;border-radius:5px;padding:4px 7px;font-size:9px;pointer-events:none}
.ja-status-line{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:#8daaca;font-size:10px;padding:0 2px}
.ja-capture-error{padding:9px 11px;background:#582b39;border:1px solid #bd6976;border-radius:7px;font-size:11px}
@media(max-width:650px){.ja-capture{padding:10px}.ja-source-controls,.ja-output-controls{flex-wrap:wrap}.ja-source-controls select{flex-basis:100%}.ja-output-summary{flex-basis:100%}.ja-capture button.ja-capture-publish{flex:1}.ja-capture-stage{max-width:100%}}
</style>