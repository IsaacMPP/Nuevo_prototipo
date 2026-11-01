<script lang="ts">
    import { onDestroy } from "svelte"
    import { activeProject, activeShow, playerVideos, projects } from "../../stores"
    import Vimeo from "../drawer/player/Vimeo.svelte"
    import YouTube from "../drawer/player/YouTube.svelte"
    import { _show } from "../helpers/shows"
    import { videoSync } from "../media/video/videoSync"

    export let id: string
    export let outputId = ""
    export let preview = false

    let data: { type: "youtube" | "vimeo"; id: string; name?: string } | null = null
    $: if ($activeShow && !$playerVideos[id]) getProjectData()
    function getProjectData() {
        const showMedia = _show($activeShow?.id || "").get("media")?.[id]
        if ((showMedia as any)?.data) data = (showMedia as any).data
        else if (showMedia?.type === "youtube" || showMedia?.type === "vimeo") data = { type: showMedia.type, id: showMedia.id || showMedia.path || id, name: showMedia.name }
        else data = $projects[$activeProject || ""]?.shows.find((a) => a.index === $activeShow?.index)?.data || null
    }

    $: video = $playerVideos[id] || data

    export let videoData = { muted: true, paused: true, loop: false, duration: 0 }
    // An iframe must never auto-start before its JA transport has synchronized.
    let sessionActive = false
    export let videoTime = 0

    // TODO: looping player videos does not work!

    let actualVideoTime = 0

    let unsubscribe: (() => void) | null = null
    $: if (id && outputId) {
        unsubscribe?.()
        sessionActive = false
        actualVideoTime = 0
        unsubscribe = videoSync(id, outputId, (data) => {
            if (!video) return
            sessionActive = true

            // update video time if significant difference
            const seekOffset = data.paused ? 0.5 : 2
            if (data.currentTime !== undefined && Math.abs(actualVideoTime - data.currentTime) > seekOffset) {
                videoTime = data.currentTime
            }

            // Assign a new object when transport properties change. Explicit
            // Svelte invalidation makes pause/mute updates propagate reliably
            // through Player -> YouTube and VideoShow's bound preview.
            if (videoData.loop !== data.loop || videoData.paused !== data.paused || videoData.muted !== data.muted) {
                videoData = { ...videoData, loop: data.loop, paused: data.paused, muted: data.muted }
            }
        })
    }

    onDestroy(() => {
        unsubscribe?.()
    })
</script>

{#if video?.type === "youtube"}
    {#key video.id}
        <YouTube id={video.id} sessionId={id} {outputId} {sessionActive} bind:videoData bind:videoTime bind:actualVideoTime {preview} on:loaded on:ended />
    {/key}
{:else if video?.type === "vimeo"}
    {#key video.id}
        <Vimeo id={video.id} bind:videoData bind:videoTime bind:actualVideoTime {preview} on:loaded />
    {/key}
{/if}
