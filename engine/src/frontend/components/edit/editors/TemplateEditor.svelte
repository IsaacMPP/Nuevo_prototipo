<script lang="ts">
    import { onDestroy } from "svelte"
    import { activeEdit, activePopup, popupData, templates, outputs, scriptureSettings, activeScripture, drawerTabsData } from "../../../stores"
    import { translateText } from "../../../utils/language"
    import TemplateSlide from "../../drawer/pages/TemplateSlide.svelte"
    import { getActiveScripturesContent, getScriptureSlidesNew } from "../../drawer/bible/scripture"
    import Icon from "../../helpers/Icon.svelte"
    import T from "../../helpers/T.svelte"
    import { clone } from "../../helpers/array"
    import { history } from "../../helpers/history"
    import { getStyles } from "../../helpers/style"
    import { getFirstActiveOutput } from "../../helpers/output"
    import FloatingInputs from "../../input/FloatingInputs.svelte"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import MaterialZoom from "../../inputs/MaterialZoom.svelte"
    import Center from "../../system/Center.svelte"
    import DropArea from "../../system/DropArea.svelte"
    import { centerZoom } from "../scripts/zoom"

    const update = () => (Slide = clone($templates[currentId]))
    $: currentId = $activeEdit.id!
    $: if (currentId) update()
    let Slide = clone($templates[currentId])
    const unsubscribe = templates.subscribe((a) => clone((Slide = a[currentId])))
    onDestroy(unsubscribe)

    // The editor presents the active Scripture text, while retaining editable
    // template items as the single persisted source of style and layout.
    $: projectedSlide = getFirstActiveOutput($outputs)?.out?.slide
    $: isBibleTemplate = !!Slide && (Slide.settings?.mode === "scripture" ||
        (Slide.items || []).some((item) => JSON.stringify(item.lines || []).includes("{scripture")))
    // Build the actual verse from Bible selection, not from the output state.
    // The editor must work even when no projector is connected or active.
    let selectedBibleItems: typeof Slide.items | null = null
    let biblePreviewRequest = 0
    $: biblePreviewKey = isBibleTemplate ? JSON.stringify({
        reference: $activeScripture.reference,
        bible: $drawerTabsData.scripture?.activeSubTab,
        template: currentId,
        templateVersion: Slide?.items,
        scriptureSettings: $scriptureSettings
    }) : ""
    $: if (biblePreviewKey) void updateBiblePreview(biblePreviewKey)
    async function updateBiblePreview(key: string) {
        const request = ++biblePreviewRequest
        const content = await getActiveScripturesContent()
        if (!content?.[0]) {
            if (request === biblePreviewRequest) selectedBibleItems = null
            return
        }
        const { slides } = await getScriptureSlidesNew({
            biblesContent: content,
            selectedChapters: content[0].chapters || [],
            selectedVerses: content[0].activeVerses || []
        }, true)
        if (request !== biblePreviewRequest || biblePreviewKey !== key) return
        selectedBibleItems = slides[0] || null
    }
    $: versePreview = isBibleTemplate ? (selectedBibleItems || (projectedSlide?.id === "temp" ? projectedSlide?.tempItems : null)) : null

    let newStyles: { [key: string]: string | number } = {}
    $: active = $activeEdit.items

    let lastActiveIds = ""
    $: if (active.join(",") !== lastActiveIds) {
        newStyles = {}
        lastActiveIds = active.join(",")
    }

    let ratio = 1

    $: {
        if (active.length) updateStyles()
        else newStyles = {}
    }

    function updateStyles() {
        if (!Object.keys(newStyles).length) return

        let items = Slide.items
        let values: string[] = []
        active.forEach((id) => {
            let item = items[id]
            let styles = getStyles(item.style)
            let textStyles = ""

            const itemNewStyles = (newStyles as any).__multiPositions ? (newStyles as any).__multiPositions[id] || {} : newStyles
            Object.entries(itemNewStyles).forEach(([key, value]) => (styles[key] = (value as any).toString()))
            Object.entries(styles).forEach((obj) => (textStyles += obj[0] + ":" + obj[1] + ";"))

            values.push(textStyles)
        })

        let override = "template_items#" + $activeEdit.id + "indexes#" + active.join(",")
        history({ id: "UPDATE", newData: { key: "items", indexes: active, subkey: "style", data: values }, oldData: { id: $activeEdit.id }, location: { page: "edit", id: "template_items", override } })
    }

    let width = 0
    let height = 0

    // ZOOM
    let scrollElem: HTMLDivElement | undefined
    let zoom = 1
    let zoomOrigin: { x: number; y: number } | null = null
    function updateZoom(e: any) {
        zoom = e.detail
        const origin = zoomOrigin
        zoomOrigin = null
        centerZoom(origin, scrollElem, ".droparea")
    }

    $: styleOverrides = (Slide?.settings?.styleOverrides || []).filter((a) => (a.globalRegex || a.pattern) && a.templateId).length
</script>

{#if Slide?.isDefault}
    <div class="default" data-title={translateText("example.default")}>
        <Icon id="protected" white />
    </div>
{/if}

<div class="editArea">
    <div class="parent" class:noOverflow={zoom >= 1} bind:this={scrollElem} bind:offsetWidth={width} bind:offsetHeight={height}>
        <!--  && (!Slide.isDefault) -->
        {#if Slide}
            <DropArea id="edit" file>
                <TemplateSlide
                    bind:newStyles
                    templateId={currentId}
                    template={Slide}
                    displayItems={versePreview || null}
                    edit
                    {width}
                    {height}
                    {zoom}
                    bind:ratio
                />
            </DropArea>
        {:else}
            <Center size={2} faded>
                <T id="empty.slide" />
            </Center>
        {/if}
    </div>

    <FloatingInputs side="left">
        <MaterialZoom columns={zoom} min={0.2} max={4} defaultValue={1} addValue={0.1} on:change={updateZoom} on:origin={(e) => (zoomOrigin = e.detail)} />

        {#if styleOverrides > 0}
            <div class="divider"></div>

            <MaterialButton
                icon="text"
                on:click={() => {
                    popupData.set({ templateId: currentId })
                    activePopup.set("template_style_overrides")
                }}
            >
                {translateText("popup.template_style_overrides")}
                <span style="font-size: 0.8em;opacity: 0.5;">{styleOverrides}</span>
            </MaterialButton>
        {/if}
    </FloatingInputs>
</div>

<style>
    .default {
        position: absolute;
        top: 10px;
        left: 10px;

        width: 42px;
        height: 42px;

        display: flex;
        align-items: center;
        justify-content: center;

        background-color: var(--primary-darkest);
        border: 1px solid var(--primary-lighter);

        padding: 10px;
        border-radius: 50%;

        z-index: 999;
    }

    .editArea {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .parent {
        width: 100%;
        height: 100%;
        display: flex;
        overflow: auto;
    }

    /* disable "glitchy" scroll bars */
    .parent.noOverflow {
        overflow: hidden;
    }
</style>
