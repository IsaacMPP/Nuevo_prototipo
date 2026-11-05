<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte"
    import YouTubePlayer from "../drawer/player/YouTubePlayer.svelte"
    import { jaYoutubeId } from "../../utils/jaGeminiPlaylists"

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
    let showPlayer=true
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
        // Reconstruct the player: no autoplay or soundtrack on selection.
        if(player){try{player.stopVideo()}catch{}}
        videoId=id
        label="YouTube · "+id
        remember(id)
        showPlayer=true
        player=null
        paused=true
        muted=true
        position=0
        duration=0
        error=""
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
        // Playback of the local console iframe stops to avoid double audio.
        try{player?.pauseVideo();player?.mute()}catch{}
        paused=true
        muted=true
        dispatch("send",{id:videoId,title:label,targets:[...effectiveTargets]})
    }
    onDestroy(()=>{
        if(clock)clearInterval(clock)
        try{player?.pauseVideo()}catch{}
    })
    const time=(n:number)=>Math.floor(Math.max(0,n)/60)+":"+String(Math.floor(Math.max(0,n)%60)).padStart(2,"0")
</script>

<section class="ja-youtube-module" aria-label="YouTube de JA Proyecciones">
    <header>
        <div><h2>YouTube</h2><p>Prepara un enlace antes de enviarlo a Programa. Escuchar en consola no modifica las pantallas.</p></div>
    </header>
    <form class="yt-entry" on:submit|preventDefault={load}>
        <input aria-label="Enlace de YouTube" placeholder="Pega la URL de YouTube…" bind:value={url}/>
        <button type="submit">Preparar video</button>
    </form>
    <div class="yt-main">
        <div class="yt-video">
            {#if videoId}
                {#key videoId}
                    <YouTubePlayer class="ja-yt-iframe" {videoId} options={{playerVars:{autoplay:0,controls:1,rel:0}}}
                        on:ready={ready} on:play={()=>paused=false} on:pause={()=>paused=true} on:end={()=>paused=true}
                        on:error={e=>error="YouTube rechazó la reproducción o el enlace (código "+String(e.detail?.data||"desconocido")+")."}/>
                {/key}
            {:else}
                <div class="yt-empty">▶ Pega un enlace para cargar el reproductor oficial de YouTube</div>
            {/if}
        </div>
        <div class="yt-console">
            <strong>Escuchar en consola</strong>
            <p>Reproductor visible de YouTube. No se muestra en Programa hasta que pulses Enviar a pantallas.</p>
            <div class="yt-controls">
                <button type="button" disabled={!player} on:click={toggle}>{paused?"▶ Reproducir":"Ⅱ Pausar"}</button>
                <button type="button" disabled={!player} on:click={stop}>■ Detener</button>
                <button type="button" disabled={!player} on:click={setMuted}>{muted?"🔇 Activar audio":"🔊 Silenciar"}</button>
            </div>
            <span class="yt-time">{time(position)} / {time(duration)}</span>
            <input aria-label="Posición en YouTube" type="range" min="0" max={duration||1} step="1" value={position} disabled={!player||!duration} on:change={seek}/>
            <label class="yt-volume">Volumen <input aria-label="Volumen de YouTube" type="range" min="0" max="100" value={volume} disabled={!player} on:input={setVolume}/></label>
        </div>
    </div>
    <div class="yt-send">
        <strong>Enviar a pantallas</strong>
        {#if destinations.length}
            <div class="yt-targets">
                {#each destinations as target (target.id)}
                    <label><input type="checkbox" checked={chosen.includes(target.id)}
                        on:change={e=>selectOutput(target.id,e.currentTarget.checked)}/>{target.name}{target.primary?" · Principal":""}</label>
                {/each}
            </div>
        {:else}
            <p>Sin pantalla externa. Puedes escuchar el video en la consola.</p>
        {/if}
        <button type="button" class="send" disabled={!videoId||!chosen.length} on:click={send}>▶ Enviar a pantallas</button>
    </div>
    {#if error}<div class="yt-error" role="alert">{error}<button type="button" aria-label="Cerrar error" on:click={()=>error=""}>✕</button></div>{/if}
    <small>Se utiliza el reproductor oficial de YouTube. La publicidad, disponibilidad y controles están sujetos a YouTube.</small>
</section>
<style>
.ja-youtube-module{display:flex;flex-direction:column;gap:12px;width:100%;height:100%;overflow:auto;padding:13px;color:#e5f2ff;background:#0a1935;font-size:12px}
header h2{font-size:20px;font-weight:700}header p,.yt-console p,.yt-send p,small{color:#b8c9e0}
.yt-entry{display:flex;gap:8px}.yt-entry input{flex:1;min-width:0;padding:9px 11px;border:1px solid #55759e;border-radius:7px;background:#102747;color:white}
button{padding:8px 12px;background:#20537f;border:1px solid #649bc4;border-radius:7px;color:white;cursor:pointer}
button:disabled{opacity:.4;cursor:not-allowed}
.yt-main{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(210px,.8fr);gap:12px;min-height:275px}
.yt-video{min-height:260px;aspect-ratio:16/9;overflow:hidden;border:1px solid #456b92;background:black;border-radius:8px}
.yt-video :global(.ja-yt-iframe),.yt-video :global(iframe),.yt-video :global(.ja-yt-iframe>div){width:100%;height:100%}
.yt-empty{display:flex;align-items:center;justify-content:center;height:100%;padding:20px;color:#bbcede;text-align:center}
.yt-console{display:flex;flex-direction:column;gap:12px;padding:12px;background:#0f2445;border:1px solid #385779;border-radius:8px}
.yt-console strong,.yt-send strong{font-size:14px}
.yt-controls{display:flex;flex-wrap:wrap;gap:5px}
.yt-time{font-variant-numeric:tabular-nums}
.yt-console input[type=range]{width:100%}
.yt-volume{display:flex;flex-direction:column;gap:5px}
.yt-send{display:flex;flex-direction:column;align-items:start;gap:8px;padding:11px;border:1px solid #385779;border-radius:8px;background:#0f2445}
.yt-targets{display:flex;flex-wrap:wrap;gap:12px}
.yt-targets label{display:flex;gap:5px;align-items:center}
.yt-targets input{accent-color:#4cd1fd}
.yt-send .send{background:#8a690e;border-color:#d6b94f}
.yt-error{padding:9px;border:1px solid #c46f60;background:#542d32;border-radius:7px;display:flex;gap:12px;justify-content:space-between}
@media(max-width:900px){.yt-main{grid-template-columns:1fr}.yt-video{min-height:210px}}
</style>
