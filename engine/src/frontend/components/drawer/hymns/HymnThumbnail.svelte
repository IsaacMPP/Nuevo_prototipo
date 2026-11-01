<script lang="ts">
    import { onMount } from "svelte"
    import { encodeFilePath } from "../../helpers/media"
    import { queuedHymnThumbnail } from "../../../utils/jaHymnThumbnailQueue"

    export let path: string
    export let revision = 0
    let node: HTMLDivElement
    let thumbnail = ""
    let failed = false
    let generation = 0
    let visible = false

    async function load() {
        const current = ++generation
        failed = false
        try {
            const result = await queuedHymnThumbnail(path)
            if (generation === current) {
                thumbnail = result || ""
                failed = !result
            }
        } catch {
            if (generation === current) failed = true
        }
    }
    let lastRevision = revision
    $: if (revision !== lastRevision) {
        lastRevision = revision
        thumbnail = ""
        failed = false
        if (node && visible) void load()
    }
    onMount(() => {
        if (typeof IntersectionObserver === "undefined") { visible = true; void load(); return }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                visible = true
                void load()
                observer.disconnect()
            }
        }, { rootMargin: "250px" })
        observer.observe(node)
        return () => { generation++; observer.disconnect() }
    })
</script>
<div class="thumb" bind:this={node}>
    {#if thumbnail}
        <img src={encodeFilePath(thumbnail)} alt="" loading="lazy" on:error={() => { thumbnail = ""; failed = true }} />
    {:else}
        <span aria-hidden="true">▶</span>
    {/if}
</div>
<style>
    .thumb { width:100%;aspect-ratio:16/9;background:var(--primary-darkest);display:flex;align-items:center;justify-content:center;overflow:hidden }
    img { width:100%;height:100%;object-fit:contain }
    span { font-size:24px;opacity:.6 }
</style>
