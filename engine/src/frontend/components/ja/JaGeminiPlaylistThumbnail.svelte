<script lang="ts">
    import { onMount } from "svelte"
    import { encodeFilePath } from "../helpers/media"
    import { queuedHymnThumbnail } from "../../utils/jaHymnThumbnailQueue"
    export let path:string
    export let kind:"video"|"audio"
    let root:HTMLDivElement
    let image=""
    let failed=false
    onMount(()=>{
        if(kind!=="video")return
        let disposed=false
        const observer=new IntersectionObserver(entries=>{
            if(!entries.some(e=>e.isIntersecting))return
            observer.disconnect()
            void queuedHymnThumbnail(path).then(p=>{
                if(!disposed && p)image=encodeFilePath(p)
            }).catch(()=>{if(!disposed)failed=true})
        },{rootMargin:"100px"})
        observer.observe(root)
        return ()=>{disposed=true;observer.disconnect()}
    })
</script>
<div bind:this={root} class="ja-playlist-cover" role="img" aria-label={kind==="audio"?"Carátula de audio":"Miniatura de video"}>
    {#if image && !failed}
        <img src={image} alt="" loading="lazy" on:error={()=>failed=true}/>
    {:else}
        <span aria-hidden="true">{kind==="audio"?"♫":"▶"}</span>
    {/if}
</div>
<style>
.ja-playlist-cover{width:52px;height:38px;min-width:52px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #355579;border-radius:6px;background:linear-gradient(140deg,#153c70,#08162b);color:#e2c774}
.ja-playlist-cover img{width:100%;height:100%;object-fit:cover}
.ja-playlist-cover span{font-size:20px}
:global(.dock-grid) .ja-playlist-cover{width:100%;height:auto;aspect-ratio:16/9;min-width:0}
</style>
