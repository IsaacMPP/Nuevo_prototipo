<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte"
    import YouTubePlayer from "../drawer/player/YouTubePlayer.svelte"
    import { jaYoutubeId } from "../../utils/jaGeminiPlaylists"
    import { getYouTubeData } from "../drawer/player/playerHelper"

    export let initialUrl = ""
    export let destinations: Array<{id:string;name:string;primary:boolean}> = []
    export let chosen: string[] = []
    const dispatch=createEventDispatcher()
    let url=""
    let videoId=""
    let player:any=null
    let paused=true
    let muted=true
    let position=0
    let duration=0
    let error=""
    let clock:ReturnType<typeof setInterval>|null=null
    let volume=100
    let label=""
    let saved:Array<{id:string;title:string}>=[]
    let listening=false
    let thumbnailFallback=new Set<string>()
    const STORAGE="ja-youtube-library-v1"
    $: effectiveTargets=chosen.filter(id=>destinations.some(d=>d.id===id))
    onMount(()=>{
        try{
            const parsed=JSON.parse(localStorage.getItem(STORAGE)||"[]")
            if(Array.isArray(parsed))
                saved=parsed.filter(v=>v && typeof v.id==="string" && /^[a-zA-Z0-9_-]{11}$/.test(v.id) && typeof v.title==="string").slice(0,100)
        }catch{}
    })
    function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved.slice(0,100)))}catch{}}
    function remember(id:string){
        if(saved.some(item=>item.id===id))return
        saved=[{id,title:"YouTube · "+id},...saved].slice(0,100)
        persist()
        // FreeShow already resolves public YouTube video titles. Fail softly
        // when metadata is blocked: the thumbnail remains useful.
        void getYouTubeData(id).then(data=>{
            if(!data.name || !saved.some(item=>item.id===id))return
            saved=saved.map(item=>item.id===id?{...item,title:data.name}:item)
            if(videoId===id)label=data.name
            persist()
        }).catch(()=>{})
    }
    function chooseVideo(id:string){
        url="https://www.youtube.com/watch?v="+id
        load()
    }
    function removeVideo(id:string){
        saved=saved.filter(item=>item.id!==id)
        persist()
    }
    $: if(initialUrl && initialUrl!==url){url=initialUrl;load()}
    function load(){
        const id=jaYoutubeId(url)
        if(!id){error="Pega un enlace válido de YouTube.";return}
        // Selecting a card prepares it only; the official player opens on request.
        if(id===videoId){
            if(player){try{player.pauseVideo();player.mute();player.seekTo(0,true)}catch{}}
            muted=true
            paused=true
            position=0
            error=""
            dispatch("prepare",{id,title:saved.find(x=>x.id===id)?.title||label})
            return
        }
        if(player){try{player.stopVideo()}catch{}}
        videoId=id
        label="YouTube · "+id
        remember(id)
        closeListening()
        player=null
        paused=true
        muted=true
        position=0
        duration=0
        error=""
        dispatch("prepare",{id,title:saved.find(x=>x.id===id)?.title||label})
    }
    function ready(event:CustomEvent){
        player=event.detail?.target||null
        if(!player)return
        try{player.mute();player.setVolume(volume);player.pauseVideo()}catch{}
        muted=true
        paused=true
        if(clock)clearInterval(clock)
        clock=setInterval(()=>{
            if(!player)return
            try{
                const now=Number(player.getCurrentTime())
                const end=Number(player.getDuration())
                if(Number.isFinite(now))position=now
                if(Number.isFinite(end))duration=end
            }catch{}
        },500)
    }
    function openListening(){
        if(!videoId){error="Selecciona primero un video.";return}
        listening=true
        // IFrame is mounted visibly in the floating console panel.
        // Playback starts only with the user's explicit Play action.
    }
    function closeListening(){
        listening=false
        if(clock){clearInterval(clock);clock=null}
        try{player?.pauseVideo();player?.mute()}catch{}
        player=null
        paused=true
        muted=true
    }
    function play(){
        if(!player)return
        try{
            player.unMute()
            player.setVolume(volume)
            player.playVideo()
            muted=false
            paused=false
            error=""
        }catch(e){error="YouTube no permitió iniciar la reproducción: "+String(e)}
    }
    function toggle(){
        if(!player)return
        try{
            if(paused)play()
            else{player.pauseVideo();paused=true}
        }catch(e){error=String(e)}
    }
    function stop(){
        if(!player)return
        try{player.pauseVideo();player.seekTo(0,true);paused=true;position=0}catch(e){error=String(e)}
    }
    function setVolume(e:Event){
        volume=Number((e.currentTarget as HTMLInputElement).value)
        try{player?.setVolume(volume)}catch{}
    }
    function seek(e:Event){
        const seconds=Number((e.currentTarget as HTMLInputElement).value)
        if(!Number.isFinite(seconds)||!player)return
        try{player.seekTo(seconds,true);position=seconds}catch{}
    }
    function setMuted(){
        if(!player)return
        try{
            if(muted)player.unMute()
            else player.mute()
            muted=!muted
        }catch{}
    }
    function selectOutput(id:string,enabled:boolean){
        dispatch("target",{id,enabled})
    }
    function send(){
        if(!videoId){error="Carga primero un enlace válido.";return}
        if(!effectiveTargets.length){error="Selecciona una pantalla externa activa.";return}
        // Sending replaces local listening, never allowing two soundtracks.
        closeListening()
        dispatch("send",{id:videoId,title:label,targets:[...effectiveTargets]})
    }
    onDestroy(()=>{
        if(clock)clearInterval(clock)
        try{player?.pauseVideo()}catch{}
    })
    const time=(n:number)=>Math.floor(Math.max(0,n)/60)+":"+String(Math.floor(Math.max(0,n)%60)).padStart(2,"0")
</script>

<section class="ja-youtube-module" aria-label="YouTube de JA Proyecciones">
    <header class="yt-header"><strong>▶ YouTube</strong><span>Biblioteca de videos y reproducción con FreeShow</span></header>
    <form class="yt-entry" on:submit|preventDefault={load}>
        <input aria-label="Enlace de YouTube" placeholder="Pegar enlace de YouTube…" bind:value={url}/>
        <button type="submit">＋ Agregar</button>
    </form>
    <div class="yt-library-bar">
        <strong>Mis videos ({saved.length})</strong>
        <span>Selecciona para preparar en Vista previa; Programa no cambia.</span>
    </div>
    {#if saved.length}
        <div class="yt-library" aria-label="Videos guardados">
            {#each saved as item (item.id)}
                <article class="yt-card" class:active={item.id===videoId}>
                    <button class="yt-thumb" type="button" on:click={()=>chooseVideo(item.id)} title={"Preparar "+item.title} aria-pressed={item.id===videoId}>
                        <img loading="lazy" src={"https://i.ytimg.com/vi/"+item.id+(thumbnailFallback.has(item.id)?"/mqdefault.jpg":"/hqdefault.jpg")}
                            alt={item.title} on:error={()=>{if(!thumbnailFallback.has(item.id)){thumbnailFallback=new Set([...thumbnailFallback,item.id])}}}/>
                        {#if item.id===videoId}<span class="yt-selected">✓ Seleccionado</span>{/if}
                    </button>
                    <div class="yt-card-footer">
                        <button type="button" title={item.title} on:click={()=>chooseVideo(item.id)}>{item.title}</button>
                        <button type="button" class="yt-remove" aria-label={"Quitar "+item.title+" de biblioteca"} title="Quitar de biblioteca" on:click={()=>removeVideo(item.id)}>✕</button>
                    </div>
                </article>
            {/each}
        </div>
    {:else}
        <div class="yt-library-empty">Pega un enlace para agregar videos a tu biblioteca, como en FreeShow.</div>
    {/if}
    {#if videoId}
        <div class="yt-selected-line" role="status">✓ Vista previa: {saved.find(item=>item.id===videoId)?.title||label} · Enviar a pantallas cuando esté listo</div>
    {/if}
    {#if listening && videoId}
        <aside class="yt-listen-float" role="region" aria-label="Escuchar YouTube en consola">
            <div class="yt-float-head">
                <strong>♫ Escuchar en consola</strong>
                <button type="button" aria-label="Cerrar reproductor de escucha" title="Cerrar" on:click={closeListening}>✕</button>
            </div>
            <div class="yt-video">
                {#key videoId}
                    <YouTubePlayer class="ja-yt-iframe" {videoId} options={{playerVars:{autoplay:0,controls:1,rel:0}}}
                        on:ready={ready} on:play={()=>paused=false} on:pause={()=>paused=true} on:end={()=>paused=true}
                        on:error={e=>error="YouTube no pudo reproducir el video (código "+String(e.detail?.data||"desconocido")+")."}/>
                {/key}
            </div>
            <div class="yt-controls">
                <button type="button" disabled={!player} on:click={toggle}>{paused?"▶ Reproducir":"Ⅱ Pausar"}</button>
                <button type="button" disabled={!player} on:click={stop}>■ Detener</button>
                <button type="button" disabled={!player} on:click={setMuted}>{muted?"🔇":"🔊"}</button>
            </div>
            <div class="yt-time">{time(position)} / {time(duration)}</div>
            <input aria-label="Posición en YouTube" type="range" min="0" max={duration||1} step="1" value={position} disabled={!player||!duration} on:change={seek}/>
            <label class="yt-volume">Volumen <input aria-label="Volumen de YouTube" type="range" min="0" max="100" value={volume} disabled={!player} on:input={setVolume}/></label>
            <small>Reproductor oficial visible. No modifica Programa.</small>
        </aside>
    {/if}
    <div class="yt-send">
        <div class="yt-action-group">
            <button type="button" disabled={!videoId} on:click={()=>dispatch("addPlaylist",{url:"https://www.youtube.com/watch?v="+videoId})}>＋ Playlist</button>
            <button type="button" disabled={!videoId} aria-expanded={listening} on:click={()=>listening?closeListening():openListening()}>♫ {listening?"Cerrar escucha":"Escuchar en consola"}</button>
        </div>
        <div class="yt-targets-wrap">
            <strong>Proyectar en</strong>
            {#if destinations.length}
                <div class="yt-targets">
                    {#each destinations as target (target.id)}
                        <label><input type="checkbox" checked={effectiveTargets.includes(target.id)}
                            on:change={e=>selectOutput(target.id,e.currentTarget.checked)}/>{target.name}{target.primary?" · Principal":""}</label>
                    {/each}
                </div>
            {:else}
                <span>Sin pantalla externa activa · escucha disponible en consola</span>
            {/if}
        </div>
        <button type="button" class="send" disabled={!videoId||!effectiveTargets.length} on:click={send}>▶ Enviar a pantallas</button>
    </div>
    {#if error}<div class="yt-error" role="alert">{error}<button type="button" aria-label="Cerrar error" on:click={()=>error=""}>✕</button></div>{/if}
    <small class="yt-disclaimer">El reproductor de YouTube controla disponibilidad, anuncios y restricciones.</small>
</section>
<style>
.ja-youtube-module{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-height:0;overflow:auto;padding:10px;color:#e5f2ff;background:#0a1935;font-size:11px}
.yt-header{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.yt-header strong{font-size:15px;color:#fff}
.yt-header span{font-size:10px;color:#a9c3e0}
button{background:#20537f;border:1px solid #5886b3;border-radius:6px;color:white;cursor:pointer;padding:6px 9px}
button:disabled{opacity:.45;cursor:not-allowed}
button:focus-visible{outline:2px solid #4cd1fd}
.yt-entry{display:flex;gap:6px}
.yt-entry input{flex:1;min-width:0;padding:8px;border:1px solid #55759e;border-radius:6px;background:#102747;color:white}
.yt-library-bar{display:flex;align-items:center;justify-content:space-between;gap:6px;padding-bottom:4px;border-bottom:1px solid #2b4771}
.yt-library-bar strong{font-size:12px}
.yt-bar-actions{display:flex;gap:5px}
.yt-bar-actions button{font-size:10px;padding:4px 7px}
.yt-library{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:7px;max-height:193px;overflow-y:auto;align-content:start;scrollbar-width:thin}
.yt-card{min-width:0;overflow:hidden;background:#0e2448;border:1px solid #335681;border-radius:6px}
.yt-card.active{border-color:#f3c34b;box-shadow:inset 0 0 0 1px #f3c34b}
.yt-thumb{position:relative;display:block;aspect-ratio:16/9;width:100%;padding:0;overflow:hidden;border:0;background:#07152a}
.yt-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.yt-thumb span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:4px 9px;border-radius:40px;background:#07152ac7;font-size:17px}
.yt-card-footer{display:flex;align-items:center;gap:2px;min-height:25px}
.yt-card-footer button:first-child{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;background:transparent;border:0;font-size:10px;padding:4px 5px}
.yt-card-footer .yt-remove{flex:0 0 auto;background:transparent;border:0;padding:4px 7px;color:#a8bbcf}
.yt-library-empty{padding:15px;text-align:center;border:1px dashed #3e5d85;border-radius:6px;color:#aebfdc}
.yt-compact-player{display:grid;grid-template-columns:minmax(180px,1.2fr) minmax(138px,.8fr);gap:8px;max-width:660px;align-items:start}
.yt-video{width:100%;aspect-ratio:16/9;overflow:hidden;border:1px solid #456b92;background:black;border-radius:7px}
.yt-video :global(.ja-yt-iframe),.yt-video :global(iframe),.yt-video :global(.ja-yt-iframe>div){height:100%;width:100%}
.yt-console{display:flex;flex-direction:column;gap:7px;padding:8px;background:#102747;border:1px solid #385779;border-radius:7px}
.yt-console strong{font-size:12px}
.yt-controls{display:flex;gap:4px;flex-wrap:wrap}
.yt-controls button{font-size:10px;padding:5px 8px}
.yt-time{font-variant-numeric:tabular-nums;font-size:10px}
.yt-console input[type=range]{width:100%;accent-color:#e93642}
.yt-volume{display:flex;flex-direction:column;gap:3px;font-size:10px}
.yt-send{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px;background:#102747;border:1px solid #385779;border-radius:7px}
.yt-targets-wrap{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;flex:1}
.yt-targets-wrap strong{white-space:nowrap;font-size:11px}
.yt-targets-wrap>span{font-size:10px;color:#eacb82}
.yt-targets{display:flex;gap:9px;flex-wrap:wrap}
.yt-targets label{display:flex;align-items:center;gap:4px;font-size:10px}
.yt-targets input{accent-color:#4cd1fd}
.yt-send .send{flex:0 0 auto;white-space:nowrap;background:#8a690e;border-color:#dfbc58}
.yt-error{display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px solid #c46f60;border-radius:7px;background:#542d32}
.yt-disclaimer{font-size:9px;color:#9aafca}
@media(max-width:690px){.yt-compact-player{grid-template-columns:1fr}.yt-video{max-width:390px}.yt-library{max-height:145px}}

.yt-library{max-height:none;overflow-y:auto;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));align-content:start}
.yt-thumb{width:100%;aspect-ratio:16/9}
.yt-thumb img{width:100%;height:100%;object-fit:cover}
.yt-selected{position:absolute;left:6px;top:6px;padding:3px 7px;border-radius:5px;background:#0e6749dd;font-size:10px}
.yt-selected-line{font-size:11px;color:#e8c766;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.yt-library-bar>span{font-size:10px;color:#a7c0dc}
.yt-action-group{display:flex;gap:6px;flex-wrap:wrap}
.yt-listen-float{position:absolute;right:10px;top:85px;z-index:55;width:min(330px,calc(100% - 20px));padding:10px;background:#102746;border:1px solid #73a4cb;border-radius:10px;box-shadow:0 12px 36px #0009;display:flex;flex-direction:column;gap:7px}
.yt-float-head{display:flex;align-items:center;justify-content:space-between}
.yt-float-head button{padding:3px 8px}
.yt-listen-float .yt-video{width:100%;aspect-ratio:16/9;max-width:none}
.yt-listen-float input[type=range]{width:100%;accent-color:#e93642}
.yt-listen-float small{font-size:10px;color:#adc4e0}
.yt-send{gap:8px}
@media(max-width:700px){.yt-library{grid-template-columns:repeat(auto-fill,minmax(125px,1fr))}.yt-listen-float{top:65px}}
</style>