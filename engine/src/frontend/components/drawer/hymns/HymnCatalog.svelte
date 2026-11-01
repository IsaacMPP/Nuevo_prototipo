<script lang="ts">
    import { onMount } from "svelte"
    import HymnThumbnail from "./HymnThumbnail.svelte"
    import VirtualList from "../VirtualList.svelte"
    import { clearHymnThumbnailRequests } from "../../../utils/jaHymnThumbnailQueue"
    import { hymnFolders, hymnCollectionPaths, hymnVideos, hymnLibraryError, refreshJAHymnLibrary } from "../../../utils/jaHymnLibrary"
    import JADestinationChooser from "../../output/tools/JADestinationChooser.svelte"
    import { isPathInJACollection } from "../../../utils/jaHymnPaths"
    import { getMediaStyle } from "../../helpers/media"
    import { clearTemporaryScriptureOnJAOutputs, getFirstActiveOutput, sendToJAOutputs, setOutput } from "../../helpers/output"
    import { activeEdit, activeShow, media, outLocked, outputs, styles } from "../../../stores"

    let searches: Record<string, string> = {}
    let revision = 0
    let updating = false
    $: searchValue = searches[collection] || ""
    export let collection = "Himnario Adventista"
    $: currentRoot = $hymnFolders[collection] || ""
    $: shown = $hymnVideos.filter((video) => (($hymnCollectionPaths[collection] || []).some((p) => isPathInJACollection(video.path, p))) && (!searchValue || video.name.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchValue.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))))
    let catalogWidth = 0
    $: columnCount = Math.max(1, Math.floor(Math.max(180, catalogWidth - 10) / 165))
    // Match row height to the rendered 16:9 thumbnail, title, button and spacing.
    $: cardWidth = Math.max(155, (catalogWidth - 10 - (columnCount - 1) * 10 - 8) / columnCount)
    $: rowHeight = Math.ceil(cardWidth * 9 / 16 + 88)
    $: virtualRows = Array.from({ length: Math.ceil(shown.length / columnCount) }, (_, index) => shown.slice(index * columnCount, (index + 1) * columnCount))

    async function updateCatalog() {
        if (updating) return
        updating = true
        try {
            await refreshJAHymnLibrary()
            clearHymnThumbnailRequests()
            revision += 1
        } finally {
            updating = false
        }
    }
    function changeSearch(value: string) {
        searches = { ...searches, [collection]: value }
    }
    function preview(video: typeof shown[number]) {
        activeEdit.set({ id: video.path, type: "media", items: [] })
        activeShow.set({ id: video.path, name: video.name.replace(/\.[^.]+$/, ""), type: "video" })
    }
    function project(video: typeof shown[number]) {
        if ($outLocked) return
        const savedPrimary = typeof localStorage === "undefined" ? "" : (localStorage.getItem("ja-main-projector") || "")
        // In multi-output mode do not fall back silently to a different monitor.
        const activeCount = Object.values($outputs).filter((o) => o.enabled && o.active).length
        const output = savedPrimary ? ($outputs[savedPrimary]?.enabled && $outputs[savedPrimary]?.active ? { ...$outputs[savedPrimary], id: savedPrimary } : null) : activeCount > 1 ? null : getFirstActiveOutput($outputs)
        if (!output) return
        const mediaStyle = getMediaStyle($media[video.path], $styles[output.style || ""])
        clearTemporaryScriptureOnJAOutputs([output.id])
        setOutput("background", { path: video.path, type: "video", loop: false, startAt: 0, ...mediaStyle, muted: false }, false, output.id)
    }
    function sendToSelected(video: typeof shown[number], ids: string[]) {
        if ($outLocked) return
        const selected = ids.filter((id) => $outputs[id]?.enabled && $outputs[id]?.active)
        if (!selected.length) return
        const style = getMediaStyle($media[video.path], $styles[$outputs[selected[0]].style || ""])
        sendToJAOutputs("background", { path: video.path, type: "video", loop: false, startAt: 0, ...style, muted: false }, selected, { replaceScripture: true })
    }
    onMount(() => { void updateCatalog() })
</script>

<section class="jaHymns">
    <header><strong>Videohimnario</strong><span>{shown.length} videos</span><button type="button" disabled={updating} on:click={updateCatalog}>{updating ? "Actualizando…" : "Actualizar"}</button></header>
    <div class="search"><input aria-label={"Buscar en " + collection} type="search" placeholder={"Buscar número o título en " + collection} value={searchValue} on:input={(e) => changeSearch(e.currentTarget.value)} />{#if searchValue}<button type="button" on:click={() => changeSearch("")}>Limpiar</button>{/if}</div>
    <div class="catalogScroll">
    {#if $hymnLibraryError}<p class="error">{$hymnLibraryError}</p>{/if}
    {#if !shown.length}<p>Sin videos en esta colección. Copia tus himnos a Documentos / JA Proyecciones 2 / {collection} y pulsa Actualizar.</p>{/if}
    <div class="virtualContainer" bind:clientWidth={catalogWidth}>
        {#key collection + "|" + searchValue + "|" + columnCount}
            <VirtualList items={virtualRows} itemHeight={rowHeight} let:item>
                <div class="virtualRow" style={"grid-template-columns:repeat(" + columnCount + ", minmax(0,1fr));height:" + rowHeight + "px;"}>

        {#each item as video (video.path)}
            <article title={video.path} class:selected={$activeShow?.id === video.path}>
                <button class="select" type="button" on:click={() => preview(video)} aria-label={"Vista previa: " + video.name}>
                    <HymnThumbnail path={video.path} {revision} />
                    <p>{video.name.replace(/\.[^.]+$/, "")}</p>
                </button>
                <div class="sendActions">
                    <button class="project" type="button" disabled={$outLocked} on:click={() => project(video)}>Proyectar</button>
                    <JADestinationChooser onSend={(ids) => sendToSelected(video, ids)} />
                </div>

            </article>
        {/each}
                </div>
            </VirtualList>
        {/key}
    </div>    </div>
</section>
<style>
    .jaHymns {padding:14px;width:100%;height:100%;min-height:0;color:var(--text);display:flex;flex-direction:column;overflow:hidden}
    .catalogScroll {flex:1;min-height:0;overflow:hidden;overscroll-behavior:contain}
    header {display:flex;align-items:center;gap:10px;margin-bottom:12px}
    header strong {font-size:15px;letter-spacing:.01em}
    header span {font-size:11px;opacity:.72;border:1px solid var(--primary-lighter);padding:4px 8px;border-radius:20px}
    header button {margin-left:auto;border:1px solid var(--primary-lighter);padding:7px 11px;background:var(--primary);color:var(--text);border-radius:7px;cursor:pointer;transition:background .15s ease}
    header button:hover {background:var(--primary-lighter)}
    .search {display:flex;gap:8px;margin-bottom:12px}
    .search input {width:100%;padding:11px 12px;border:1px solid var(--primary-lighter);border-radius:9px;color:var(--text);background:var(--primary);outline:none}
    .search input:focus-visible {border-color:var(--secondary)}
    .search button {padding:6px 10px;border:1px solid var(--primary-lighter);background:var(--primary);color:var(--text);border-radius:7px;cursor:pointer}
    .virtualContainer {height:100%;width:100%;min-height:0}
    .virtualRow {display:grid;gap:10px;padding:3px 4px 9px;box-sizing:border-box}
    article {content-visibility:auto;contain-intrinsic-size:auto 135px;min-width:0;background:var(--primary);border:1px solid var(--primary-lighter);border-radius:9px;overflow:hidden;transition:border-color .15s ease}
    article:hover {border-color:var(--secondary)}
    article.selected {outline:2px solid var(--secondary);outline-offset:0}
    .select {display:block;width:100%;border:0;padding:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
    .thumbnail {aspect-ratio:16/9;background:var(--primary-darkest);display:flex;align-items:center;justify-content:center;position:relative}
    .thumbnail img {width:100%;height:100%;object-fit:contain}
    .thumbnail span {font-size:24px;opacity:.6}
    article p {padding:7px 9px 6px;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sendActions {display:flex;gap:5px;margin:0 8px 8px}
    .sendActions .project {flex:1;width:auto;min-width:0;margin:0;padding:6px;border:1px solid var(--secondary);background:var(--primary-darker);color:var(--text);border-radius:6px;cursor:pointer;font-size:11px;font-weight:600}
    .sendActions .project:hover {background:var(--primary-lighter)}
    .project:disabled {opacity:.45;cursor:not-allowed}
    .error {color:var(--secondary)}
    @media (prefers-reduced-motion: reduce) {article,header button {transition:none}}
</style>