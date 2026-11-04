<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte"
    import { get } from "svelte/store"
    import { AudioPlayer } from "../../audio/audioPlayer"
    import { AudioAnalyser } from "../../audio/audioAnalyser"
    import { outLocked } from "../../stores"

    // Exact JA-owned session, not the currently focused global FreeShow music.
    export let path: string
    const dispatch=createEventDispatcher()
    const fileName=(name:string)=>name.split(/[\/\\]/).pop()||name
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
        // File-location recovery may store a resolved path as the player key.
        // Use the same lookup as the native engine, not raw store indexing.
        const session=path?AudioPlayer.getPlaying(path):null
        if(!session?.audio){
            if(!ended){
                ended=true
                dispatch("ended")
            }
            return
        }
        ended=false
        const audio=session.audio
        if(!seeking)position=Number.isFinite(audio.currentTime)?audio.currentTime:0
        duration=Number.isFinite(audio.duration)?Math.max(0,audio.duration):0
        paused=!!session.paused || audio.paused
        muted=!!audio.muted
        // The native audio engine owns its gain. Read it; don't change global media options.
        volume=Math.max(0,Math.min(100,Math.round((audio.volume||0)*100)))
    }
    onMount(()=>{
        refresh()
        const clock=setInterval(refresh,250)
        return ()=>clearInterval(clock)
    })
    function toggle(){
        if(get(outLocked) || !AudioPlayer.audioExists(path))return
        if(AudioPlayer.isPaused(path))AudioPlayer.play(path)
        else AudioPlayer.pause(path)
        refresh()
    }
    function stop(){
        if(get(outLocked))return
        if(AudioPlayer.audioExists(path))AudioPlayer.stop(path)
        dispatch("stopped")
    }
    function seek(){
        if(get(outLocked) || !AudioPlayer.audioExists(path) || !Number.isFinite(duration) || duration<=0)return
        AudioPlayer.setTime(path,Math.max(0,Math.min(duration,position)))
        seeking=false
        refresh()
    }
    function changeVolume(event:Event){
        if(get(outLocked) || !AudioPlayer.audioExists(path))return
        const value=Number((event.currentTarget as HTMLInputElement).value)
        if(!Number.isFinite(value))return
        volume=Math.max(0,Math.min(100,value))
        const audio=AudioPlayer.getAudio(path)
        if(!audio)return
        audio.volume=volume/100
        if(!audio.muted)AudioAnalyser.setSourceVolume(path,volume/100)
    }
    function toggleMute(){
        if(get(outLocked))return
        const audio=AudioPlayer.getAudio(path)
        if(!audio)return
        audio.muted=!audio.muted
        AudioAnalyser.setSourceVolume(path,audio.muted?0:volume/100)
        refresh()
    }
</script>

<div class="ja-native-audio-panel" role="group" aria-label="Audio de Multimedia en la consola">
    <div class="ja-native-audio-heading">
        <span class="ja-native-audio-label" title={fileName(path)}>♫ {fileName(path)}</span>
        <small>Audio de Windows · no sustituye la imagen proyectada</small>
    </div>
    <div class="ja-native-audio-actions">
        <button type="button" disabled={$outLocked || ended} on:click={toggle} aria-label={paused?"Reproducir audio":"Pausar audio"} title={paused?"Reproducir":"Pausar"}>{paused?"▶":"Ⅱ"}</button>
        <button type="button" disabled={$outLocked || ended} on:click={stop} aria-label="Detener audio" title="Detener">■</button>
        <span class="ja-native-audio-time">{formatTime(position)} / {formatTime(duration)}</span>
        <input type="range" aria-label="Posición del audio" min="0" max={duration>0?duration:1} step="0.1" disabled={$outLocked || ended || duration<=0} bind:value={position} on:input={()=>{seeking=true}} on:change={seek}/>
        <button type="button" disabled={$outLocked || ended} on:click={toggleMute} aria-label={muted?"Activar audio":"Silenciar audio"} title={muted?"Activar audio":"Silenciar"}>{muted?"🔇":"🔊"}</button>
        <input type="range" aria-label="Volumen del audio" min="0" max="100" step="1" disabled={$outLocked || ended} value={volume} on:input={changeVolume}/>
    </div>
</div>
