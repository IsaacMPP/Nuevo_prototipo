<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte"
    import { receiveJACapture } from "../../utils/jaCaptureRelay"

    export let id: string
    export let hidePointer = true
    export let useJARelay = false

    let videoElem: HTMLVideoElement | undefined

    let constraints: any = {
        video: {
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/cursor
            // hiding the cursor is not yet supported
            // cursor: "never",
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: id,
                maxWidth: 1920,
                maxHeight: 1080,
                // maxAspectRatio: 16/9,
                maxFrameRate: 60
            }
        }
    }

    let currentStream: MediaStream | null = null
    let destroyed = false
    let disconnectRelay:(()=>void)|null=null
    let relayError=""
    onDestroy(() => {
        destroyed = true
        disconnectRelay?.()
        if(!useJARelay)currentStream?.getTracks().forEach((track) => track.stop())
        if(videoElem)videoElem.srcObject=null
    })

    onMount(() => {
        if(useJARelay){
            disconnectRelay=receiveJACapture(id,(stream)=>{
                if(destroyed||!videoElem)return
                currentStream=stream
                relayError=""
                videoElem.srcObject=stream
                videoElem.onloadedmetadata=loaded
                void videoElem.play().catch(err=>{relayError="La salida no pudo reproducir la captura: "+String(err)})
            },(message)=>{relayError=message})
            return
        }
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream) => {
                if (destroyed || !videoElem) return stream.getTracks().forEach((track) => track.stop())

                currentStream = stream
                videoElem.srcObject = stream
                videoElem.onloadedmetadata = loaded
            })
            .catch((err) => {
                console.error(err.name + ": " + err.message)
            })
    })

    let dispatch = createEventDispatcher()
    function loaded() {
        // WIP not working!!!
        console.log("window loaded")
        if (!videoElem) return

        videoElem.play()
        dispatch("loaded", true)
    }
</script>

<video bind:this={videoElem} autoplay muted playsinline class={$props.class} style={($props.style || "") + ";cursor:" + (hidePointer ? "none" : "auto") + ";"}>
    <track kind="captions" />
</video>
{#if relayError}<div class="ja-capture-output-error" role="alert">{relayError}</div>{/if}
<style>.ja-capture-output-error{position:absolute;left:10px;bottom:10px;max-width:70%;padding:7px;background:#541e27ee;color:white;font-size:12px;border-radius:6px;z-index:20}</style>
