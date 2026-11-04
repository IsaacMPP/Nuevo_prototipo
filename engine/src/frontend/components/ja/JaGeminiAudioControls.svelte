<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte"
    import { JaSoloAudioPlayer } from "./JaSoloAudioPlayer"

    export let path: string
    const dispatch=createEventDispatcher()
    const fileName=(name:string)=>name.split(/[\\/]/).pop()||name
    const formatTime=(value:number)=>{
        const seconds=Math.max(0,Math.floor(Number.isFinite(value)?value:0))
        return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0")
    }
    let position=0
    let duration=0
    let volume=100
    let paused=true
    let muted=false
    let seeking=false
    let ended=false
    function refresh(){
        const audio=JaSoloAudioPlayer.path===path ? JaSoloAudioPlayer.audio : null
        if(!audio){
            if(!ended){ended=true;dispatch("ended")}
            return
        }
        if(audio.ended && !ended){ended=true;dispatch("ended");return}
        ended=false
        if(!seeking)position=Number.isFinite(audio.currentTime)?audio.currentTime:0
        duration=Number.isFinite(audio.duration)?Math.max(0,audio.duration):0
        paused=audio.paused
        muted=audio.muted
        volume=Math.round(audio.volume*100)
    }
    onMount(()=>{
        refresh()
        const clock=setInterval(refresh,250)
        return ()=>clearInterval(clock)
    })
    function toggle(){void JaSoloAudioPlayer.toggle();refresh()}
    function stop(){JaSoloAudioPlayer.stop();dispatch("stopped")}
    function seek(){JaSoloAudioPlayer.seek(position);seeking=false;refresh()}
    function changeVolume(event:Event){
        const value=Number((event.currentTarget as HTMLInputElement).value)
        if(!Number.isFinite(value))return
        volume=Math.max(0,Math.min(100,value))
        JaSoloAudioPlayer.setVolume(volume/100)
    }
    function toggleMute(){JaSoloAudioPlayer.setMuted(!muted);refresh()}
</script>

<div class="ja-native-audio-panel" role="group" aria-label="JA Solo audio independiente">
    <div class="ja-native-audio-heading">
        <span class="ja-native-audio-label" title={fileName(path)}>♫ {fileName(path)}</span>
        <small>Reproductor independiente · audio de Windows · no cambia Programa</small>
    </div>
    <div class="ja-native-audio-actions">
        <button type="button" disabled={ended} on:click={toggle} aria-label={paused?"Reproducir audio":"Pausar audio"} title={paused?"Reproducir":"Pausar"}>{paused?"▶":"Ⅱ"}</button>
        <button type="button" disabled={ended} on:click={stop} aria-label="Detener audio" title="Detener">■</button>
        <span class="ja-native-audio-time">{formatTime(position)} / {formatTime(duration)}</span>
        <input type="range" aria-label="Posición del audio" min="0" max={duration>0?duration:1} step="0.1" disabled={ended || duration<=0} bind:value={position} on:input={()=>seeking=true} on:change={seek}/>
        <button type="button" disabled={ended} on:click={toggleMute} aria-label={muted?"Activar audio":"Silenciar audio"} title={muted?"Activar audio":"Silenciar"}>{muted?"🔇":"🔊"}</button>
        <input type="range" aria-label="Volumen del audio" min="0" max="100" step="1" disabled={ended} value={volume} on:input={changeVolume}/>
    </div>
</div>
