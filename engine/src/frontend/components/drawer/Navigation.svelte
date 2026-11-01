<script lang="ts">
    import { uid } from "uid"
    import { Main } from "../../../types/IPC/Main"
    import { ToMain } from "../../../types/IPC/ToMain"
    import { sendMain, receiveToMain, destroyMain } from "../../IPC/main"
    import { onDestroy } from "svelte"
    import DropArea from "../system/DropArea.svelte"
    import AudioTabs from "./navigation/AudioTabs.svelte"
    import CalendarTabs from "./navigation/CalendarTabs.svelte"
    import FunctionsTabs from "./navigation/FunctionsTabs.svelte"
    import MediaTabs from "./navigation/MediaTabs.svelte"
    import OverlaysTabs from "./navigation/OverlaysTabs.svelte"
    import ScriptureTabs from "./navigation/ScriptureTabs.svelte"
    import ShowsTabs from "./navigation/ShowsTabs.svelte"
    import TemplatesTabs from "./navigation/TemplatesTabs.svelte"

    import { drawerTabsData } from "../../stores"
    import { hymnVideos, hymnCollectionPaths, hymnLinks, hymnSourceStatus, linkHymnFolder, unlinkHymnFolder } from "../../utils/jaHymnLibrary"
    import { isPathInJACollection } from "../../utils/jaHymnPaths"

    const pickerId = uid()
    let pendingCollection = ""
    let replacing = ""
    function chooseFolder(collection: string, previous = "") {
        pendingCollection = collection
        replacing = previous
        sendMain(Main.OPEN_FOLDER, { channel: pickerId })
    }
    const pickerListener = receiveToMain(ToMain.OPEN_FOLDER2, (data) => {
        if (data.channel !== pickerId || !data.path || !pendingCollection) return
        linkHymnFolder(pendingCollection, data.path, replacing)
        pendingCollection = ""
        replacing = ""
    })
    onDestroy(() => destroyMain(pickerListener))
    export let id: "shows" | "media" | "overlays" | "audio" | "effects" | "scripture" | "hymns" | "calendar" | "functions" | "templates" | "timers"
</script>

<div class="main">
    <div class="categories context #category_{id}">
        {#if id === "hymns"}
            <div class="hymnNav">
                <strong>Colecciones</strong>
                {#each ["Himnario Adventista", "Cantos Juveniles"] as name}
                    <button class:active={($drawerTabsData.hymns?.activeSubTab || "Himnario Adventista") === name} on:click={() => drawerTabsData.update((data) => ({ ...data, hymns: { ...data.hymns, enabled: true, activeSubTab: name } }))} type="button">
                        {name}
                        <small>{$hymnVideos.filter((v) => ($hymnCollectionPaths[name] || []).some((p) => isPathInJACollection(v.path, p))).length}</small>
                    </button>
                {/each}
                {#each ["Himnario Adventista", "Cantos Juveniles"] as name}
                    {#if ($drawerTabsData.hymns?.activeSubTab || "Himnario Adventista") === name}
                        <button type="button" on:click={() => chooseFolder(name)}>+ Vincular carpeta externa</button>
                        {#each $hymnLinks[name] || [] as linked}
                            <div class="hymnPath">
                                <small title={linked}>{linked}</small>
                                <small>{$hymnSourceStatus[linked] === "unavailable" ? "Unidad no disponible" : "Vinculada"}</small>
                                <button type="button" on:click={() => chooseFolder(name, linked)}>Buscar nueva ubicación</button>
                                <button type="button" on:click={() => unlinkHymnFolder(name, linked)}>Desvincular</button>
                            </div>
                        {/each}
                    {/if}
                {/each}
            </div>
        {:else if id === "scripture"}
            <ScriptureTabs />
        {:else if id === "calendar"}
            <CalendarTabs />
        {:else if id === "functions"}
            <FunctionsTabs />
        {:else}
            <DropArea id="navigation" selectChildren>
                {#if id === "shows"}
                    <ShowsTabs />
                {:else if id === "media"}
                    <MediaTabs />
                {:else if id === "audio"}
                    <AudioTabs />
                {:else if id === "overlays"}
                    <OverlaysTabs />
                {:else if id === "templates"}
                    <TemplatesTabs />
                {/if}
            </DropArea>
        {/if}
    </div>
</div>

<style>
    .hymnNav { padding:12px;display:flex;flex-direction:column;gap:8px }
    .hymnNav button { background:var(--primary);color:var(--text);border:1px solid var(--primary-lighter);border-radius:5px;padding:10px;text-align:left;cursor:pointer }
    .hymnNav button.active { border-left:3px solid var(--secondary) }
    .hymnNav small { float:right;opacity:.65 }
    .hymnPath {overflow-wrap:anywhere;display:flex;flex-direction:column;gap:5px;padding:8px;border:1px solid var(--primary-lighter)}
    .hymnPath small {float:none}

    .main,
    .categories {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
    }

    /* .categories :global(button) {
        width: 100%;
        padding: 0.1em 0.8em !important;
        justify-content: space-between;
    }
    .tabs :global(button) {
        width: 100%;
    } */

    .tabs {
        display: flex;
        background-color: var(--primary-darker);
    }

    .source {
        display: flex;
        justify-content: center;
        color: var(--text);
        opacity: 0.5;
        padding: 10px;
        font-weight: bold;
    }
    .source:hover {
        opacity: 0.8;
    }
</style>
