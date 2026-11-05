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
            <p>Recibe PowerPoint, UxPlay o cualquier ventana real de Windows</p>
        </div>
        <button class="ja-refresh" type="button" on:click={refresh} disabled={loading||busy}>
            ↻ {loading?"Buscando…":"Actualizar fuentes"}
        </button>
    </header>
    <div class="ja-source-section">
        <div class="ja-source-heading">
            <strong>Fuente de captura</strong>
            <span class:ja-live={!!stream}>{stream?"● En directo":"○ Sin captura"}</span>
        </div>
        <div class="ja-source-controls">
            <select aria-label="Ventana o pantalla para capturar" bind:value={sourceId} disabled={busy||!!stream}>
                <option value="">Seleccionar ventana o pantalla…</option>
                {#each sources as source (source.id)}
                    <option value={source.id}>{source.kind==="window"?"▣":"▤"} {source.name}</option>
                {/each}
            </select>
            <button class="ja-capture-start" type="button" on:click={start} disabled={!sourceId||busy||!!stream}>
                ▶ Iniciar
            </button>
            <button class="ja-stop" type="button" on:click={()=>stop()} disabled={!stream}>■ Detener</button>
        </div>
        <div class="ja-source-options">
            <label title="Oculta el puntero sobre la vista de JA y las ventanas de salida. No puede eliminar el cursor incrustado por Windows dentro de la fuente.">
                <input type="checkbox" checked={hidePointerInJA} on:change={togglePointer}/>
                Ocultar puntero en JA y salidas
            </label>
            <span class="ja-source-hint">No oculta el puntero dentro de una captura que Windows ya generó con cursor.</span>
        </div>
    </div>
    <div class="ja-capture-stage" class:ja-hide-cursor={hidePointerInJA}>
        <video bind:this={video} autoplay muted playsinline aria-label="Monitor local de captura de Windows"></video>
        {#if !stream}
            <div class="ja-capture-placeholder">
                <span class="ja-capture-placeholder-icon">▣</span>
                <strong>Monitor de captura</strong>
                <span>Elige una ventana e inicia la recepción para verla aquí y en Vista previa.</span>
            </div>
        {/if}
        {#if stream}<span class="ja-capture-stage-label">● EN DIRECTO</span>{/if}
    </div>
    <div class="ja-capture-footer">
        <div class="ja-capture-status" role="status">{status}{width&&height?" · "+width+" × "+height:""}</div>
        <div class="ja-capture-send">
            <div class="ja-capture-destination">
                <strong>Proyección</strong>
                <span>{selectedTargets.length
                    ?selectedTargets.map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")
                    :"Sin pantallas seleccionadas"}</span>
            </div>
            <button type="button" class="ja-target-link" on:click={locateTargets}>Elegir destinos arriba</button>
            <button class="ja-capture-publish" type="button" on:click={project}
                disabled={!stream||!selectedTargets.length}>▶ Enviar con Envío rápido</button>
        </div>
        {#if sourceId && assigned[sourceId]?.length}
            <div class="ja-capture-onair">
                <span>● Proyectando en {assigned[sourceId].map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")}</span>
                <button type="button" on:click={detach}>Retirar de esas pantallas</button>
            </div>
        {/if}
    </div>
    {#if error}<div class="ja-capture-error" role="alert">{error}</div>{/if}
    <p class="ja-capture-help">Seleccionar una ventana no cambia Programa. Al cambiar de módulo, la captura continúa. Si pulsas Detener, también se retira de las pantallas porque comparten la señal. Audio pendiente.</p>
</section>
<style>
.ja-capture{display:flex;flex-direction:column;gap:10px;height:100%;overflow:auto;padding:14px 16px;color:#eaf4ff;background:#0b1a37;font-size:12px}
.ja-capture-header,.ja-source-heading,.ja-source-controls,.ja-source-options,.ja-capture-send,.ja-capture-onair{display:flex;align-items:center;gap:9px}
.ja-capture-header{justify-content:space-between;gap:14px;flex-wrap:wrap}
.ja-capture-heading{min-width:160px}
.ja-capture-heading h2{font-size:17px;font-weight:750;color:#ffe000;margin:0 0 3px}
.ja-capture-heading p,.ja-capture-help,.ja-source-hint{font-size:10px;color:#a8bfda;line-height:1.4;margin:0}
.ja-capture button,.ja-capture select{background:#1b3d69;color:#f2f8ff;border:1px solid #587fa5;border-radius:7px;padding:7px 10px;max-width:100%;font:inherit}
.ja-capture button{cursor:pointer;white-space:nowrap}
.ja-capture button:disabled{opacity:.45;cursor:not-allowed}
.ja-capture button:focus-visible,.ja-capture select:focus-visible{outline:2px solid #4cd1fd;outline-offset:2px}
.ja-source-section,.ja-capture-footer{display:flex;flex-direction:column;gap:8px;padding:10px 11px;background:#122849;border:1px solid #35557c;border-radius:9px}
.ja-source-heading{justify-content:space-between}
.ja-source-heading span{font-size:10px;color:#a3b7cd}
.ja-source-heading span.ja-live,.ja-capture-onair{color:#8ce4b4}
.ja-source-controls{flex-wrap:wrap}
.ja-source-controls select{flex:1;min-width:185px}
.ja-capture button.ja-capture-start,.ja-capture button.ja-capture-publish{background:#2d75ae;border-color:#72b6ed;font-weight:700}
.ja-source-options{flex-wrap:wrap;align-items:baseline}
.ja-source-options label{display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer}
.ja-source-options input{accent-color:#4cd1fd}
.ja-capture-stage{position:relative;width:100%;min-height:170px;max-height:285px;aspect-ratio:16/9;background:#030b19;border:1px solid #345a81;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.ja-capture-stage video{width:100%;height:100%;object-fit:contain}
.ja-capture-stage.ja-hide-cursor,.ja-capture-stage.ja-hide-cursor *{cursor:none!important}
.ja-capture-placeholder{position:absolute;display:flex;align-items:center;flex-direction:column;gap:8px;padding:16px;text-align:center;color:#a8c6e2;max-width:320px}
.ja-capture-placeholder-icon{font-size:30px;color:#557fab}
.ja-capture-placeholder span:last-child{font-size:11px}
.ja-capture-stage-label{position:absolute;left:8px;top:8px;background:#063c30ee;border:1px solid #3b986e;color:#c8f8dd;border-radius:5px;padding:4px 7px;font-size:9px;pointer-events:none}
.ja-capture-status{font-size:10px;color:#b5d0ed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ja-capture-send{flex-wrap:wrap;border-top:1px solid #385777;padding-top:8px}
.ja-capture-destination{display:flex;flex:1;flex-direction:column;gap:3px;min-width:120px}
.ja-capture-destination span{font-size:10px;color:#c4d8ef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ja-capture button.ja-target-link{border-color:transparent;background:transparent;text-decoration:underline;color:#91c8ff;padding:5px 2px}
.ja-capture-onair{justify-content:space-between;flex-wrap:wrap;border-top:1px solid #385777;padding-top:8px;font-size:10px}
.ja-capture-onair button{font-size:10px}
.ja-capture-error{padding:8px 10px;background:#582b39;border:1px solid #bd6976;border-radius:6px;font-size:11px}
@media(max-width:650px){.ja-source-controls select{width:100%;flex-basis:100%}.ja-capture-stage{min-height:140px}.ja-capture-send{align-items:stretch}.ja-capture-publish{width:100%}}
</style>