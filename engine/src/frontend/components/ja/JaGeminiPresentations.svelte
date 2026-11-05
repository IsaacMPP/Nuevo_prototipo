<script lang="ts">
    import { createEventDispatcher, onDestroy, tick } from "svelte"
    import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFDocumentLoadingTask } from "pdfjs-dist"
    import { encodeFilePath } from "../helpers/media"

    export let pdfPath=""
    export let displayName=""
    export let currentPage=0
    export let destinations:Array<{id:string;name:string;primary:boolean}>=[]
    export let selectedTargets:string[]=[]
    const dispatch=createEventDispatcher()
    GlobalWorkerOptions.workerSrc="./assets/pdf.worker.min.mjs"
    let loadedPath=""
    let pages:number[]=[]
    let canvases:Array<HTMLCanvasElement|undefined>=[]
    let loading=false
    let problem=""
    let doc:PDFDocumentProxy|null=null
    let task:PDFDocumentLoadingTask|null=null
    let generation=0
    let rendered=0
    let observer:IntersectionObserver|null=null
    let activeTasks:Array<{cancel:()=>void}>=[]
    $: if(pdfPath && pdfPath!==loadedPath)void loadPdf(pdfPath)
    $: if(!pdfPath && loadedPath)reset()
    function clear(){
        generation++
        observer?.disconnect();observer=null
        activeTasks.forEach(t=>{try{t.cancel()}catch{}})
        activeTasks=[]
        try{task?.destroy()}catch{}
        task=null
        doc=null
        pages=[]
        canvases=[]
        rendered=0
    }
    function reset(){clear();loadedPath="";problem="";loading=false}
    async function loadPdf(path:string){
        clear()
        const token=generation
        loadedPath=path
        problem=""
        loading=true
        try{
            task=getDocument(encodeFilePath(path))
            const resolved=await task.promise
            if(token!==generation)return
            doc=resolved
            pages=Array.from({length:resolved.numPages},(_,i)=>i)
            currentPage=0
            dispatch("loaded",{path,count:resolved.numPages})
            await tick()
            if(token!==generation)return
            // Render actual PDF pages only when near viewport. Large decks
            // must never create 100+ simultaneous high-resolution tasks.
            observer=new IntersectionObserver(entries=>{
                for(const entry of entries){
                    if(!entry.isIntersecting)continue
                    const index=Number((entry.target as HTMLElement).dataset.page)
                    if(!Number.isInteger(index))continue
                    observer?.unobserve(entry.target)
                    void paintThumbnail(index,token)
                }
            },{rootMargin:"260px"})
            for(const canvas of canvases)if(canvas)observer.observe(canvas)
        }catch(err){
            if(token===generation)problem="No se pudo abrir el PDF real: "+String(err)
        }finally{
            if(token===generation)loading=false
        }
    }
    async function paintThumbnail(index:number,token:number){
        if(!doc || token!==generation)return
        const canvas=canvases[index]
        if(!canvas)return
        try{
            const page=await doc.getPage(index+1)
            if(token!==generation)return
            const viewport=page.getViewport({scale:1})
            const scale=Math.min(1.5,320/Math.max(viewport.width,viewport.height))
            const target=page.getViewport({scale})
            canvas.width=Math.max(1,Math.ceil(target.width))
            canvas.height=Math.max(1,Math.ceil(target.height))
            const ctx=canvas.getContext("2d")
            if(!ctx)return
            const render=page.render({canvas,canvasContext:ctx,viewport:target})
            activeTasks.push(render)
            await render.promise
            if(token===generation)rendered++
        }catch(e){
            if((e as Error)?.name!=="RenderingCancelledException" && token===generation)
                console.warn("JA presentation page thumbnail:",e)
        }
    }
    function choose(index:number){
        if(index<0||index>=pages.length)return
        currentPage=index
        dispatch("prepare",{path:pdfPath,page:index,pages:pages.length,name:displayName})
    }
    export function move(offset:number){choose(Math.max(0,Math.min(pages.length-1,currentPage+offset)))}
    onDestroy(clear)
</script>
<section class="ja-presentation-module" aria-label="Presentaciones de JA">
    <header>
        <div><h2>▣ Presentaciones</h2><p>PowerPoint y PDF reales · primero Vista previa, después Programa</p></div>
        <button class="ja-open" type="button" on:click={()=>dispatch("open")}>＋ Abrir presentación</button>
    </header>
    {#if pdfPath}
        <div class="ja-deck-bar">
            <strong title={displayName}>{displayName}</strong>
            <span>{pages.length ? pages.length+" diapositivas" : loading?"Cargando…":"Sin páginas"}</span>
            <button type="button" on:click={()=>dispatch("open")}>Cambiar archivo</button>
        </div>
        {#if problem}
            <div class="ja-presentation-error" role="alert">{problem}</div>
        {:else if loading && !pages.length}
            <div class="ja-presentation-empty">Cargando páginas reales…</div>
        {:else}
            <div class="ja-page-grid" aria-label="Miniaturas de las diapositivas">
                {#each pages as page (page)}
                    <button type="button" class="ja-page-card" class:active={currentPage===page}
                        on:click={()=>choose(page)} title={"Preparar diapositiva "+(page+1)} aria-pressed={currentPage===page}>
                        <div class="ja-page-image"><canvas bind:this={canvases[page]} data-page={page}/></div>
                        <span>{page+1}</span>
                    </button>
                {/each}
            </div>
        {/if}
        <div class="ja-deck-controls">
            <button type="button" disabled={!pages.length || currentPage===0} on:click={()=>move(-1)}>◀ Anterior</button>
            <span>Diapositiva {pages.length?currentPage+1:0} / {pages.length}</span>
            <button type="button" disabled={!pages.length || currentPage===pages.length-1} on:click={()=>move(1)}>Siguiente ▶</button>
            <button class="ja-send" type="button" disabled={!pages.length || !selectedTargets.length}
                on:click={()=>dispatch("send",{path:pdfPath,page:currentPage,pages:pages.length,name:displayName})}>
                ▶ Enviar a {selectedTargets.length} pantalla(s)
            </button>
        </div>
        <div class="ja-deck-targets">Pantallas:
            {#if destinations.length}
                {#each destinations as destination (destination.id)}
                    <label><input type="checkbox" checked={selectedTargets.includes(destination.id)}
                        on:change={e=>dispatch("target",{id:destination.id,enabled:e.currentTarget.checked})}/>
                        {destination.name}{destination.primary?" · Principal":""}</label>
                {/each}
            {:else}<span>Conecta o activa una pantalla para proyectar.</span>{/if}
        </div>
    {:else}
        <div class="ja-presentation-empty">Abre un PDF o PowerPoint (.ppt/.pptx). Las diapositivas se mostrarán aquí como miniaturas reales.</div>
    {/if}
    <small>Las diapositivas se preparan sin cambiar Programa. PowerPoint requiere conversión local mediante LibreOffice o Microsoft PowerPoint.</small>
</section>
<style>
.ja-presentation-module{height:100%;width:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:13px;color:#ecf4ff;background:#0a1935;font-size:12px}
header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
header h2{font-size:17px;font-weight:750}header p,small{font-size:10px;color:#aec7e1}
button{background:#1c4674;border:1px solid #5685ad;border-radius:6px;color:#f7fbff;padding:7px 10px;cursor:pointer}
button:disabled{opacity:.42;cursor:not-allowed}button:focus-visible{outline:2px solid #4cd1fd}
.ja-open{background:#1979b5;border-color:#79cef0;font-weight:700}
.ja-deck-bar{display:flex;align-items:center;gap:10px;padding:7px 10px;background:#102b50;border-radius:7px}
.ja-deck-bar strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ja-deck-bar span{color:#a6c2e4}.ja-deck-bar button{font-size:10px}
.ja-page-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-content:start;gap:9px;overflow:auto;min-height:90px;max-height:370px;padding:5px}
.ja-page-card{padding:3px;min-width:0;background:#0f2546;border:1px solid #4a719a;border-radius:7px;overflow:hidden}
.ja-page-card.active{outline:2px solid #f5c34a;border-color:#f5c34a}
.ja-page-image{height:auto;aspect-ratio:16/9;background:#030c1a;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ja-page-image canvas{width:100%;height:100%;object-fit:contain}
.ja-page-card span{display:block;text-align:center;padding:4px;font-size:11px}
.ja-deck-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;background:#132b4c;border:1px solid #35587f;border-radius:7px}
.ja-deck-controls span{white-space:nowrap;color:#c0d6ed}
.ja-deck-controls .ja-send{margin-left:auto;background:#997710;border-color:#f1cc59}
.ja-deck-targets{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:6px}
.ja-deck-targets label{display:flex;align-items:center;gap:4px;font-size:11px}
.ja-deck-targets input{accent-color:#4cd1fd}
.ja-presentation-empty{padding:28px 16px;text-align:center;border:1px dashed #507399;border-radius:7px;color:#b6cce2}
.ja-presentation-error{padding:10px;border:1px solid #c86c6c;background:#542d38;border-radius:7px}
</style>
