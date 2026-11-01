<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte"
    import { currentWindow, special } from "../../../stores"
    import YouTubePlayer from "./YouTubePlayer.svelte"
    import { VideoPlayer } from "../../media/video/videoPlayer"
    import { shouldMuteYouTube, syncNativeYouTubeAudio } from "./youtubeAudio"
    import { decideYouTubeTransport } from "./youtubeTransport"

    export let videoData = { paused: false, muted: true, loop: false, duration: 0 }
    export let videoTime = 0
    export let actualVideoTime = 0
    export let id: string
    export let preview = false
    export let sessionId = ""
    export let outputId = ""
    export let sessionActive = false

    // Native YT.Player is received from the iframe ready event, just as
    // FreeShow originally did. Do not mix its synchronous API with the
    // Promise-returning youtube-player wrapper interface.
    $: id = id.includes("?list") ? id.slice(0, id.indexOf("?list")) : id
    $: id = id.slice(-11)

    const options = {
        playerVars: {
            autoplay: 0,
            loop: videoData.loop,
            fs: 0,
            rel: 0,
            controls: $special.hideCursor ? 0 : 1
        }
    }

    const dispatch = createEventDispatcher()
    let player: any = null
    let loaded = false
    let disposed = false
    let timeInterval: ReturnType<typeof setInterval> | null = null
    let seeking = false
    let seekResetTimeout: ReturnType<typeof setTimeout> | null = null
    let wasAudible = false

    function onReady(event: CustomEvent) {
        player = event.detail?.target || null
        if (!player) return
        loaded = true
        reconcileAudio()
        if (sessionActive) reconcileTransport()
        else if (preview && !videoData.paused) player.playVideo()
        dispatch("loaded", true)
        if (timeInterval) clearInterval(timeInterval)
        timeInterval = setInterval(updateTime, 250)
    }

    function updateTime() {
        if (!loaded || !player || disposed) return
        try {
            const state = Number(player.getPlayerState())
            const seconds = Number(player.getCurrentTime())
            if (!Number.isFinite(seconds)) return
            if (state === 1) actualVideoTime = seconds
            if (preview && !seeking) videoTime = seconds
            if (preview && !videoData.duration) {
                const duration = Number(player.getDuration())
                if (Number.isFinite(duration) && duration > 0) videoData.duration = duration
            }
        } catch (error) {
            console.warn("[YouTube] Reading native player failed:", error)
        }
    }

    $: if (!seeking && loaded && videoTime !== undefined) seekPlayer()
    function seekPlayer() {
        if (!loaded || !player || disposed || seeking) return
        const target = Number(videoTime)
        if (!Number.isFinite(target)) return
        try {
            const current = Number(player.getCurrentTime())
            if (!Number.isFinite(current) || Math.abs(current - target) < 2) return
            seeking = true
            player.seekTo(target, true)
            if (seekResetTimeout) clearTimeout(seekResetTimeout)
            seekResetTimeout = setTimeout(() => {
                seeking = false
                if (sessionActive) reconcileTransport()
            }, 450)
        } catch (error) {
            seeking = false
            console.warn("[YouTube] Seek failed:", error)
        }
    }

    // The JA clock owns the projected transport; a standalone preview retains
    // native YouTube controls, including pause, resume and seeking.
    function reconcileTransport() {
        if (!player || !loaded || disposed || seeking || !sessionActive) return
        try {
            const action = decideYouTubeTransport(!!videoData.paused, Number(player.getPlayerState()))
            if (action === "pause") player.pauseVideo()
            else if (action === "play") player.playVideo()
        } catch (error) {
            console.warn("[YouTube] Transport sync failed:", error)
        }
    }
    $: if (loaded && player && sessionActive && !seeking && videoData.paused !== undefined) reconcileTransport()

    function relayPreviewTransport(playing: boolean) {
        // Events from JA commands already match the latest shared clock and
        // must not result in a second (or reverse) command.
        if (!preview || !sessionActive || !sessionId || !outputId) return
        if (playing === !videoData.paused) return
        if (playing) VideoPlayer.play(sessionId, outputId)
        else VideoPlayer.pause(sessionId, outputId)
    }
    function onPlayerPlaying() {
        relayPreviewTransport(true)
        reconcileAudio()
        if (!preview && sessionActive && videoData.paused) reconcileTransport()
    }
    function onPlayerPaused() {
        relayPreviewTransport(false)
        if (!preview && sessionActive && !videoData.paused) reconcileTransport()
    }

    $: shouldBeMuted = shouldMuteYouTube(preview, $currentWindow === "output", sessionActive, !!videoData.muted)
    $: if (loaded && player && shouldBeMuted !== undefined) reconcileAudio()
    function reconcileAudio() {
        if (!loaded || !player || disposed) return
        try {
            syncNativeYouTubeAudio(player, shouldBeMuted, !shouldBeMuted && !wasAudible)
            if (!shouldBeMuted) wasAudible = true
        } catch (error) {
            console.warn("[YouTube] Native audio sync failed:", error)
        }
    }

    $: if (!id && player) player.stopVideo()
    function ended() { dispatch("ended", true) }
    onDestroy(() => {
        disposed = true
        if (timeInterval) clearInterval(timeInterval)
        if (seekResetTimeout) clearTimeout(seekResetTimeout)
    })
</script>

<div class="main" class:hide={!id}>
    {#if id}
        <YouTubePlayer class="yt" videoId={id} {options} on:ready={onReady} on:play={onPlayerPlaying} on:pause={onPlayerPaused} on:end={ended} />
    {/if}
</div>

<style>
    .main { pointer-events: initial; }
    .main, .main :global(.yt), .main :global(iframe) { height: 100%; width: 100%; }
    .hide :global(.yt) { display: none; }
</style>
