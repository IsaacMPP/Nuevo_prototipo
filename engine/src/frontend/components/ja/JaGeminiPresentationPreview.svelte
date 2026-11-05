<script lang="ts">
    import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFDocumentLoadingTask, type RenderTask } from "pdfjs-dist"
    import { onDestroy } from "svelte"
    import { encodeFilePath } from "../helpers/media"

    export let path=""
    export let page=0
    export let title=""
    let canvas:HTMLCanvasElement
    let task:PDFDocumentLoadingTask|null=null
    let document:PDFDocumentProxy|null=null
    let render:RenderTask|null=null
    let loadedPath=""
    let generation=0
    let error=""
    GlobalWorkerOptions.workerSrc="./assets/pdf.worker.min.mjs"
    $: if(path && path!==loadedPath)void load(path)
    $: if(document && canvas && page>=0)void paint(page,generation)
    async function load(next:string){
        const token=++generation
        loadedPath=next
        error=""
        try{render?.cancel()}catch{}
        try{task?.destroy()}catch{}
        document=null
        try{
            task=getDocument(encodeFilePath(next))
            const doc=await task.promise
            if(token!==generation)return
            // Reactive page rendering runs after PDF and canvas exist.
            // Do not start an overlapping second render for the same page.
            document=doc
        }catch(e){if(token===generation)error="No se pudo mostrar la diapositiva: "+String(e)}
    }
    async function paint(index:number,token:number){
        if(!document||!canvas||index<0||index>=document.numPages||token!==generation)return
        try{render?.cancel()}catch{}
        try{
            const source=await document.getPage(index+1)
            if(token!==generation)return
            const viewport=source.getViewport({scale:1})
            const width=Math.max(640,canvas.clientWidth*window.devicePixelRatio)
            const height=Math.max(360,canvas.clientHeight*window.devicePixelRatio)
            const zoom=Math.min(width/viewport.width,height/viewport.height,3)
            const scaled=source.getViewport({scale:zoom})
            canvas.width=Math.ceil(scaled.width)
            canvas.height=Math.ceil(scaled.height)
            const ctx=canvas.getContext("2d")
            if(!ctx)return
            render=source.render({canvas,canvasContext:ctx,viewport:scaled})
            await render.promise
            if(token===generation)error=""
        }catch(e){if((e as Error)?.name!=="RenderingCancelledException"&&token===generation)error=String(e)}
    }
    onDestroy(()=>{
        generation++
        try{render?.cancel()}catch{}
        try{task?.destroy()}catch{}
    })
</script>
<div class="ja-presentation-preview" role="img" aria-label={"Vista previa: "+title+", diapositiva "+(page+1)}>
    <canvas bind:this={canvas}/>
    {#if error}<p role="alert">{error}</p>{/if}
    <span>Vista previa · {title} · {page+1}</span>
</div>
<style>
.ja-presentation-preview{position:relative;height:100%;width:100%;display:flex;justify-content:center;align-items:center;overflow:hidden;background:#050d20}
canvas{max-width:100%;max-height:100%;object-fit:contain}
span{position:absolute;left:8px;bottom:8px;background:#07162ec9;color:#e5f2ff;border-radius:5px;padding:4px 7px;font-size:10px;pointer-events:none}
p{position:absolute;top:12px;left:12px;right:12px;background:#632b37;padding:9px;color:white;font-size:11px}
</style>