<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte"
    import YouTubePlayer from "../drawer/player/YouTubePlayer.svelte"

    export let videoId: string
    const dispatch=createEventDispatcher()
    let native:any=null
    let clock:ReturnType<typeof setInterval>|null=null
    let state={paused:true,muted:true,currentTime:0,duration:0,ready:false}
    function report(){dispatch("state",{...state})}
    function onReady(event:CustomEvent){
        native=event.detail?.target||null
        if(!native)return
        try{native.mute();native.pauseVideo()}catch{}
        state={...state,paused:true,muted:true,ready:true}
        report()
        if(clock)clearInterval(clock)
        clock=setInterval(()=>{
            if(!native)return
            try{
                const current=Number(native.getCurrentTime())
                const duration=Number(native.getDuration())
                state={...state,
                    currentTime:Number.isFinite(current)?current:state.currentTime,
                    duration:Number.isFinite(duration)?duration:state.duration}
                report()
            }catch{}
        },500)
    }
    export function getState(){return {...state}}
    export function pause(){
        try{native?.pauseVideo()}catch{}
        state={...state,paused:true}
        report()
    }
    export function toggle(){
        if(!native)return
        try{
            if(state.paused){native.playVideo();state={...state,paused:false}}
            else{native.pauseVideo();state={...state,paused:true}}
            report()
        }catch{}
    }
    export function seek(seconds:number){
        if(!native||!Number.isFinite(seconds))return
        try{native.seekTo(seconds,true);state={...state,currentTime:seconds};report()}catch{}
    }
    export function toggleMute(){
        if(!native)return
        try{
            if(state.muted)native.unMute()
            else native.mute()
            state={...state,muted:!state.muted}
            report()
        }catch{}
    }
    onDestroy(()=>{
        if(clock)clearInterval(clock)
        try{native?.pauseVideo();native?.mute()}catch{}
    })
</script>

<div class="ja-youtube-preview-stage" role="group" aria-label="Vista previa de YouTube">
    {#key videoId}
        <YouTubePlayer class="ja-yt-preview-player" {videoId}
            options={{playerVars:{autoplay:0,controls:1,rel:0}}}
            on:ready={onReady}
            on:play={()=>{state={...state,paused:false};report()}}
            on:pause={()=>{state={...state,paused:true};report()}}
            on:end={()=>{state={...state,paused:true};report()}}/>
    {/key}
    <div class="ja-youtube-preview-label">YouTube · Vista previa</div>
</div>
<style>
    .ja-youtube-preview-stage{width:100%;height:100%;position:relative;background:#050e21;overflow:hidden;display:flex;justify-content:center;align-items:center}
    .ja-youtube-preview-stage :global(.ja-yt-preview-player),.ja-youtube-preview-stage :global(.ja-yt-preview-player>div),.ja-youtube-preview-stage :global(iframe){width:100%;height:100%}
    .ja-youtube-preview-label{position:absolute;bottom:7px;left:8px;padding:4px 8px;border-radius:5px;background:#081b39bb;color:#e9f3ff;font-size:11px;pointer-events:none}
</style>
