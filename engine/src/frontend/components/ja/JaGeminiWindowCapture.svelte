<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte"
    import { Main } from "../../../types/IPC/Main"
    import { requestMain, sendMain } from "../../IPC/main"

    type CaptureSource={id:string;name:string;kind:"window"|"screen"}
    export let destinations:Array<{id:string;name:string;primary:boolean}>=[]
    export let selectedTargets:string[]=[]
    export let assigned:Record<string,string[]>={}
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
    $: if(!requested){requested=true;void refresh()}
    function stop(reason="Captura detenida"){
        generation++
        stream?.getTracks().forEach(track=>track.stop())
        stream=null
        if(video){video.pause();video.srcObject=null}
        status=reason
        width=0
        height=0
        dispatch("stopped",{})
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
    <header>
        <div>
            <h2>▣ Captura de ventanas</h2>
            <p>Prueba de compatibilidad · PowerPoint, UxPlay y aplicaciones de Windows</p>
        </div>
        <button type="button" on:click={refresh} disabled={loading||busy}>↻ Actualizar ventanas</button>
    </header>
    <div class="ja-capture-toolbar">
        <label for="ja-capture-source">Fuente real de Windows</label>
        <select id="ja-capture-source" bind:value={sourceId} disabled={busy||!!stream}>
            <option value="">Selecciona una ventana o pantalla…</option>
            {#each sources as source (source.id)}
                <option value={source.id}>{source.kind==="window"?"▣ Ventana":"▤ Pantalla"} · {source.name}</option>
            {/each}
        </select>
        <button class="ja-capture-start" type="button" on:click={start} disabled={!sourceId||busy||!!stream}>
            ▶ Iniciar captura
        </button>
        <button type="button" on:click={()=>stop()} disabled={!stream}>■ Detener</button>
    </div>
    <div class="ja-capture-targets">
        <strong>Enviar fuente a las pantallas seleccionadas</strong>
        {#if destinations.length}
            <div class="ja-capture-target-list">
                {#each destinations as dest (dest.id)}
                    <label><input type="checkbox" checked={selectedTargets.includes(dest.id)}
                        on:change={e=>dispatch("target",{id:dest.id,enabled:e.currentTarget.checked})}/>
                        {dest.name}{dest.primary?" · Principal":""}</label>
                {/each}
            </div>
        {:else}
            <span>No se detectaron salidas externas activas. Revisa Configuración de pantallas.</span>
        {/if}
        <div class="ja-capture-actions">
            <button class="ja-capture-start" type="button" on:click={project}
                disabled={!stream || !selectedTargets.length}>▶ Enviar captura a {selectedTargets.length} pantalla(s)</button>
            <button type="button" on:click={detach} disabled={!sourceId || !assigned[sourceId]?.length}>
                Retirar esta captura de sus pantallas
            </button>
        </div>
        {#if sourceId && assigned[sourceId]?.length}
            <span class="ja-capture-projected">En Programa: {assigned[sourceId].map(id=>destinations.find(d=>d.id===id)?.name||id).join(", ")}</span>
        {/if}
        <small>La captura proyectada continúa al cambiar de módulo. Puedes enviar otra ventana a otra pantalla sin reemplazarla.</small>
    </div>
    <div class="ja-capture-stage">
        <video bind:this={video} autoplay muted playsinline aria-label="Monitor local de captura de Windows"></video>
        {#if !stream}<div class="ja-capture-placeholder">Selecciona una ventana e inicia la captura para ver la señal real.</div>{/if}
    </div>
    <div class="ja-capture-status" role="status">{status}{width&&height?" · "+width+" × "+height:""}</div>
    {#if error}<div class="ja-capture-error" role="alert">{error}</div>{/if}
    <p class="ja-capture-help">La selección solo modifica Vista previa; <strong>Programa cambia únicamente al pulsar Enviar captura</strong>. Al detener la captura local, la proyección externa continúa hasta retirarla o reemplazarla. No minimices la ventana capturada. Audio pendiente de pruebas.</p>
</section>
<style>
.ja-capture{display:flex;flex-direction:column;gap:12px;height:100%;overflow:auto;padding:15px;color:#ecf5ff;background:#0b1a37;font-size:12px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h2{font-size:17px;font-weight:700}header p,.ja-capture-help{font-size:11px;color:#b3c9e3}
button,select{background:#17365f;color:#f4f9ff;border:1px solid #587fa5;border-radius:7px;padding:8px;max-width:100%}
button{cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.ja-capture-start{background:#2576a9;border-color:#72c3ef}
.ja-capture-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px}
.ja-capture-toolbar select{flex:1;min-width:200px}
.ja-capture-stage{position:relative;aspect-ratio:16/9;max-height:370px;min-height:180px;display:flex;align-items:center;justify-content:center;background:#020b1c;border:1px solid #375a7d;border-radius:9px;overflow:hidden}
.ja-capture-stage video{width:100%;height:100%;object-fit:contain}
.ja-capture-placeholder{position:absolute;text-align:center;color:#9eb8d5;padding:14px}
.ja-capture-status{padding:7px 10px;background:#112c4e;border-radius:6px}
.ja-capture-error{padding:8px;background:#622c39;border:1px solid #af6171;border-radius:6px}
.ja-capture-help{line-height:1.5}
.ja-capture-targets{display:flex;flex-direction:column;gap:8px;padding:10px;background:#112849;border:1px solid #3e668d;border-radius:8px}
.ja-capture-target-list,.ja-capture-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.ja-capture-target-list label{display:flex;gap:5px;align-items:center;font-size:11px}
.ja-capture-target-list input{accent-color:#4cd1fd}
.ja-capture-projected{color:#9fe6bd;font-size:11px}
.ja-capture-targets small{color:#a8c1dd;font-size:10px}
</style>