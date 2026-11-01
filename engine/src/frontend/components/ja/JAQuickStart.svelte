<script lang="ts">
    import type { DrawerTabIds } from "../../../types/Tabs"
    import { activeDrawerTab, activePage, drawer, drawerTabsData, outputs, settingsTab } from "../../stores"
    import { restoreJAPresentationWorkspace } from "../../utils/jaControlledOutput"

    type Module = "shows" | "hymns" | "scripture" | "media"
    function openModule(id: Module, section?: string): void {
        activePage.set("show")
        if (id === "shows") restoreJAPresentationWorkspace()
        if (section) drawerTabsData.update((data) => {
            const previous = data[id] || { enabled: true, activeSubTab: null, openedSubSubTab: {} }
            data[id] = { ...previous, enabled: true, activeSubTab: section, openedSubSubTab: id === "media" && section === "online" ? { ...previous.openedSubSubTab, online: "youtube" } : previous.openedSubSubTab }
            return data
        })
        activeDrawerTab.set(id as DrawerTabIds)
        drawer.update((d) => ({ ...d, height: Math.max(340, d.height), stored: null, autoclosed: false }))
    }
    function openScreens(): void {
        activePage.set("settings")
        settingsTab.set("display_settings")
    }
    $: displays = Object.values($outputs).filter(o => o.enabled && o.active && !!o.screen && !o.stageOutput && !o.ndi && !o.omt && !o.rtmp && !o.webrtc && !o.blackmagic).length
</script>

<nav class="ja-quick" aria-label="Accesos JA Proyecciones">
    <div class="ja-brand-title"><span class="dot"></span> JA Proyecciones <small>Motor nativo</small></div>
    <div class="ja-buttons">
        <button type="button" class:active={$activeDrawerTab === "hymns"} on:click={() => openModule("hymns", "Himnario Adventista")}>Himnario</button>
        <button type="button" class:active={$activeDrawerTab === "scripture"} on:click={() => openModule("scripture")}>Biblia</button>
        <button type="button" class:active={$activeDrawerTab === "media" && $drawerTabsData.media?.activeSubTab !== "online"} on:click={() => openModule("media", "all")}>Multimedia</button>
        <button type="button" class:active={$activeDrawerTab === "media" && $drawerTabsData.media?.activeSubTab === "online"} on:click={() => openModule("media", "online")}>YouTube</button>
        <button type="button" on:click={() => openModule("shows")}>Proyectos y presentaciones</button>
        <button type="button" on:click={openScreens}>Pantallas ({displays})</button>
    </div>
</nav>

<style>
    .ja-quick {display:flex;align-items:center;gap:12px;padding:6px 13px;min-height:49px;box-sizing:border-box;background:#071a36;border-bottom:1px solid #2b4f79;color:white}
    .ja-brand-title {display:flex;align-items:center;gap:6px;white-space:nowrap;font-weight:700;font-size:12px}
    .ja-brand-title small{font-size:10px;color:#bfd0e3;font-weight:400}
    .dot{width:7px;height:7px;border-radius:50%;background:#4cd1fd}
    .ja-buttons{display:flex;gap:5px;min-width:0;overflow-x:auto;flex:1}
    .ja-buttons button{background:transparent;color:#e1e9f5;border:1px solid transparent;border-radius:7px;white-space:nowrap;padding:7px 11px;cursor:pointer;font-size:12px;font-family:inherit}
    .ja-buttons button:hover,.ja-buttons button.active{background:#17406a;border-color:#41678c}
    .ja-buttons button:focus-visible{outline:2px solid #4cd1fd}
    @media(max-width:1050px){.ja-quick{flex-direction:column;align-items:stretch}.ja-brand-title{font-size:11px}}
</style>
