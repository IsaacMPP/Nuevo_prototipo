<script lang="ts">
    import type { Item, ItemType, Line, Slide } from "../../../types/Show"
    import type { TabsObj } from "../../../types/Tabs"
    import { activeEdit, activeShow, copyPasteEdit, overlays, selected, showsCache, storedEditMenuState, templates } from "../../stores"
    import { getAccess } from "../../utils/profile"
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import { clone } from "../helpers/array"
    import { history } from "../helpers/history"
    import { getLayoutRef, isSlideLocked } from "../helpers/show"
    import { _show } from "../helpers/shows"
    import { getStyles } from "../helpers/style"
    import FloatingInputs from "../input/FloatingInputs.svelte"
    import MaterialButton from "../inputs/MaterialButton.svelte"
    import Tabs from "../main/Tabs.svelte"
    import Center from "../system/Center.svelte"
    import { getBoxStyle, getFilterStyle, getItemStyle, getSlideStyle, setBoxStyle, setFilterStyle, setItemStyle, setSlideStyle } from "./scripts/itemClipboard"
    import { DEFAULT_ITEM_STYLE } from "./scripts/itemHelpers"
    import { addStyleString } from "./scripts/textStyle"
    import BoxStyle from "./tools/BoxStyle.svelte"
    import ItemStyle from "./tools/ItemStyle.svelte"
    import OverlayStyle from "./tools/OverlayStyle.svelte"
    import SlideFilters from "./tools/SlideFilters.svelte"
    import SlideStyle from "./tools/SlideStyle.svelte"
    import TemplateStyle from "./tools/TemplateStyle.svelte"
    import { itemBoxes } from "./values/boxes"
    import MaterialCheckbox from "../inputs/MaterialCheckbox.svelte"
    import MaterialColorInput from "../inputs/MaterialColorInput.svelte"
    import MaterialFilePicker from "../inputs/MaterialFilePicker.svelte"
    import { mediaExtensions } from "../../values/extensions"

    let tabs: TabsObj = {
        text: { name: "items.text", icon: "text" },
        item: { name: "tools.item", icon: "item" },
        slide: { name: "tools.slide", icon: "options", overflow: true },
        filters: { name: "edit.filters", icon: "filter", overflow: true }
    }
    let active: string = Object.keys(tabs)[0]
    $: tabs.text.icon = item?.type && itemBoxes[item.type] ? itemBoxes[item.type]!.icon : "text"
    $: tabs.text.name = "items." + (item?.type || "text")

    $: bibleMode = $activeEdit.type === "template" && !!$templates[$activeEdit.id || ""] &&
        ($templates[$activeEdit.id || ""]?.settings?.mode === "scripture" ||
        ($templates[$activeEdit.id || ""]?.items || []).some((entry) => JSON.stringify(entry.lines || []).includes("{scripture")))
    $: plateIndex = $activeEdit.items.length === 1 ? $activeEdit.items[0] : -1
    $: plateItem = bibleMode && plateIndex >= 0 ? $templates[$activeEdit.id || ""]?.items?.[plateIndex] : null
    $: plateStyles = getStyles(plateItem?.style)
    $: plateColor = plateStyles["background-color"] || plateStyles.background || ""
    $: plateEnabled = !!plateColor && plateColor !== "transparent"
    let previousPlateColor = "rgb(0 0 0 / 0.55)"

    function updateBibleBg(key: "backgroundPath" | "backgroundColor", value: string) {
        if (!bibleMode || !activeId) return
        const settings = { ...($templates[activeId]?.settings || {}), [key]: value || "" }
        history({ id: "UPDATE", newData: { key: "settings", data: settings }, oldData: { id: activeId }, location: { page: "edit", id: "template_settings", override: activeId } })
    }
    function updatePlate(key: "background-color" | "border-radius", value: string) {
        if (!plateItem || !activeId) return
        const styles = getStyles(plateItem.style)
        if (key === "background-color") {
            delete styles.background
            if (value) styles[key] = value
            else delete styles[key]
        } else if (value) styles[key] = value
        else delete styles[key]
        const data = Object.entries(styles).map(([name, val]) => name + ":" + val + ";").join("")
        history({ id: "UPDATE", newData: { key: "items", indexes: [plateIndex], subkey: "style", data: [data] }, oldData: { id: activeId }, location: { page: "edit", id: "template_items", override: "ja_scripture_plate#" + activeId + "#" + plateIndex } })
    }
    function togglePlate(enabled: boolean) {
        if (!enabled && plateEnabled) previousPlateColor = plateColor
        updatePlate("background-color", enabled ? previousPlateColor : "")
    }

    function resetEntireBibleAppearance() {
        if (!bibleMode || !activeId) return
        if (!window.confirm("¿Restablecer toda la apariencia de Escrituras? Se restaurarán fuente, tamaño, colores, contorno, sombras, fondos y placas de lectura de esta plantilla. Los textos y Biblias no se borrarán.")) return
        const template = $templates[activeId]
        if (!template) return
        const settings = { ...(template.settings || {}), backgroundPath: "", backgroundColor: "#101a2d" }
        history({ id: "UPDATE", newData: { key: "settings", data: settings }, oldData: { id: activeId }, location: { page: "edit", id: "template_settings", override: "ja_full_reset_settings#" + activeId } })
        const items = template.items || []
        const indexes = items.map((_, i) => i)
        const boxStyles = items.map((entry) => {
            const style = getStyles(entry.style)
            const geometryKeys = ["left", "top", "width", "height", "position", "display", "overflow", "transform"]
            const geometry = Object.entries(style).filter(([key]) => geometryKeys.includes(key))
            if (!entry.lines) return entry.style || ""
            return [...geometry, ["color", "#ffffff"]].map(([key, value]) => key + ":" + value + ";").join("")
        })
        if (indexes.length) history({ id: "UPDATE", newData: { key: "items", indexes, subkey: "style", data: boxStyles }, oldData: { id: activeId }, location: { page: "edit", id: "template_items", override: "ja_full_reset_boxes#" + activeId } })
        // Retain the Biblical placeholder tokens while resetting their visual formatting.
        const textIndexes = items.map((entry, i) => entry.lines ? i : -1).filter((i) => i >= 0)
        const plainLines = textIndexes.map((i) => clone(items[i].lines || []).map((line) => ({ ...line, align: "", text: (line.text || []).map((part) => ({ ...part, style: "color:#ffffff;font-family:Arial;font-size:64px;font-weight:400;font-style:normal;text-decoration:none;text-shadow:none;" })) })))
        if (textIndexes.length) history({ id: "UPDATE", newData: { key: "items", indexes: textIndexes, subkey: "lines", data: plainLines }, oldData: { id: activeId }, location: { page: "edit", id: "template_items", override: "ja_full_reset_text#" + activeId } })
    }
    function resetBibleBackground() {
        if (!bibleMode || !activeId) return
        if (!window.confirm("¿Restablecer el fondo de Escrituras?")) return
        const settings = { ...($templates[activeId]?.settings || {}), backgroundColor: "", backgroundPath: "" }
        history({ id: "UPDATE", newData: { key: "settings", data: settings }, oldData: { id: activeId }, location: { page: "edit", id: "template_settings", override: activeId } })
    }
    function resetPlate() {
        if (!plateItem || !activeId) return
        if (!window.confirm("¿Restablecer el fondo de lectura seleccionado?")) return
        const styles = getStyles(plateItem.style)
        delete styles.background
        delete styles["background-color"]
        delete styles["border-radius"]
        const data = Object.entries(styles).map(([name, value]) => name + ":" + value + ";").join("")
        history({ id: "UPDATE", newData: { key: "items", indexes: [plateIndex], subkey: "style", data: [data] }, oldData: { id: activeId }, location: { page: "edit", id: "template_items", override: "ja_reset_plate#" + activeId + "#" + plateIndex } })
    }
    $: activeId = $activeEdit.id || ""
    $: activeSlide = $activeEdit.slide ?? -1

    // is not template or overlay
    $: isShow = !activeId
    $: tabs.filters.remove = !isShow // TODO: set filters in template / overlay ? ( && $activeEdit.type !== "template")
    $: tabs.slide.remove = (!isShow && $activeEdit.type !== "template" && $activeEdit.type !== "overlay") || templateTextMode
    $: if ((tabs.slide.remove && active === "slide") || (tabs.filters.remove && active === "filters")) active = "text"

    $: templateTextMode = $activeEdit.type === "template" && $templates[activeId]?.settings?.mode === "text"
    $: if (templateTextMode) {
        tabs.item.remove = true
        // tabs.slide.remove = true
    } else {
        tabs.item.remove = false
        // tabs.slide.remove = false
    }
    $: templateItemMode = $activeEdit.type === "template" && $templates[activeId]?.settings?.mode === "item"
    $: if (templateItemMode) {
        if (active === "text") active = "item"
        tabs.text.remove = true
    } else {
        tabs.text.remove = false
    }

    $: showIsActive = $activeShow && ($activeShow.type === undefined || $activeShow.type === "show")
    $: editSlideSelected = $activeEdit.slide !== null && $activeEdit.slide !== undefined
    $: activeIsShow = $activeShow && ($activeShow.type || "show") === "show"

    let slides: Slide[] = []
    $: if (allSlideItems && (($activeEdit?.id && editSlideSelected) || showIsActive))
        slides = _show($activeEdit?.id || $activeShow?.id)
            .slides()
            .get()

    $: isEmpty = !allSlideItems?.length
    $: tabs.item.disabled = isEmpty
    let previousCount = 0
    $: if (isEmpty || activeId || activeSlide) {
        previousCount = 0
    }
    $: if (item !== undefined) itemChanged()
    function itemChanged() {
        if (item === null) {
            if (active === "text" || active === "item") active = "text"
            tabs.text.disabled = true
            return
        }

        let currentCount = allSlideItems.length
        if (previousCount === currentCount) return
        previousCount = currentCount

        tabs.text.disabled = false
    }

    $: ref = getLayoutRef("active", $showsCache)

    $: if (editSlideSelected && activeIsShow && ref.length <= activeSlide && ref.length > 0) activeEdit.set({ slide: 0, items: [], showId: $activeShow?.id })

    let allSlideItems: Item[] = []
    $: {
        if ($activeEdit.type === "overlay") allSlideItems = clone($overlays[activeId]?.items || [])
        else if ($activeEdit.type === "template") allSlideItems = clone($templates[activeId]?.items || [])
        else allSlideItems = editSlideSelected && activeIsShow && ref.length > activeSlide ? clone(_show().slides([ref[activeSlide]?.id]).get("items")[0] || []) : []
    }
    const getItemsByIndex = (array: number[]): Item[] => array.map((i) => allSlideItems[i])

    // select active items or all items
    $: items = $activeEdit.items.length ? getItemsByIndex([...$activeEdit.items].sort((a, b) => a - b)) : allSlideItems
    // select last item
    $: item = items?.length ? items[items.length - 1] : null

    // COPY

    $: itemType = active === "text" ? item?.type || "text" : ""
    $: type = `${active}${itemType}`
    function copyStyle() {
        const styles = getItemsStyle()

        copyPasteEdit.update((a) => {
            a[type] = styles
            return a
        })

        console.log("COPIED STYLE", $copyPasteEdit)
    }

    function clearClipboard() {
        copyPasteEdit.update((a) => {
            delete a[type]
            return a
        })
    }

    function getItemsStyle(_updater: any = null) {
        if (!items?.length) return [getCurrentStyle()]
        return items.map((item) => getCurrentStyle(item))
    }

    function getCurrentStyle(item: Item | null = null) {
        if (active === "text" && item) return getBoxStyle(item)
        if (active === "item" && item) return getItemStyle(item)
        if (active === "slide") return getSlideStyle()
        if (active === "filters") return getFilterStyle()
        return null
    }

    // PASTE

    function pasteStyle(applyToAll = false, applyToFollowing = false) {
        let styles = $copyPasteEdit[type]
        if (!Array.isArray(styles)) return

        // get selected slide(s)
        let slides: any[] = []
        if ($activeEdit.type === "overlay") slides = [$overlays[activeId]]
        else if ($activeEdit.type === "template") slides = [$templates[activeId]]
        else {
            let activeSlides: string[] = []
            // all slides
            if (applyToAll) activeSlides = []
            // selected slides
            else if ($selected.id === "slide" && $selected.data.length) activeSlides = $selected.data.map(({ index }) => ref[index]?.id)
            // active slide
            else activeSlides = [ref[activeSlide]?.id]

            slides = _show().slides(activeSlides).get()
        }

        slides = clone(slides)

        setNewStyle()
        function setNewStyle() {
            if (active === "text") return setBoxStyle(styles, slides, itemType as ItemType)
            if (active === "item") return setItemStyle(styles, slides)
            if (active === "slide") return setSlideStyle(styles[0], slides)
            if (active === "filters") {
                let indexes: number[] = []
                if (applyToFollowing) indexes = ref.map((_, i) => i).filter((a) => a >= activeSlide)
                else if (applyToAll) indexes = ref.map((_, i) => i)
                else indexes = [activeSlide]

                return setFilterStyle(styles[0], indexes)
            }
        }
    }

    // RESET

    function reset() {
        if (!isShow) {
            if (active === "item") {
                history({
                    id: "UPDATE",
                    oldData: { id: $activeEdit.id },
                    newData: { key: "items", subkey: "style", data: DEFAULT_ITEM_STYLE, indexes: $activeEdit.items },
                    location: { page: "edit", id: $activeEdit.type + "_items", override: true }
                })
                return
            }

            if (active === "slide") {
                if ($activeEdit.type !== "template") return

                let id = $activeEdit?.id || ""
                history({ id: "UPDATE", newData: { key: "settings", data: {} }, oldData: { id }, location: { page: "edit", id: "template_settings", override: id } })
                return
            }

            if (active !== "text") return

            if ($activeEdit.type === "overlay") overlays.update(updateItemValues)
            else if ($activeEdit.type === "template") templates.update(updateItemValues)

            function updateItemValues(a: any) {
                if (!a[$activeEdit.id!]?.items) return

                $activeEdit.items.forEach((i: number) => {
                    if (!a[$activeEdit.id!].items[i]?.lines) return

                    delete a[$activeEdit.id!].items[i].autoFontSize

                    a[$activeEdit.id!].items[i].lines.forEach((line: Line) => {
                        line.text?.forEach((text) => {
                            text.style = ""
                        })
                    })
                })

                a[$activeEdit.id!].modified = Date.now()
                return a
            }

            return
        }

        let ref = getLayoutRef()
        let slideId = ref[activeSlide]?.id
        if (!slideId) return

        storedEditMenuState.set({})

        if (active === "item") {
            history({
                id: "setStyle",
                newData: { style: { key: "style", values: [DEFAULT_ITEM_STYLE] } },
                location: { page: "edit", show: $activeShow!, slide: slideId, items: $activeEdit.items }
            })
            return
        }

        if (active === "filters") {
            let indexes = [activeSlide]
            if (typeof indexes[0] !== "number") return

            history({ id: "SHOW_LAYOUT", newData: { key: "filterEnabled", data: undefined, indexes } }) // pre 1.4.4
            history({ id: "SHOW_LAYOUT", newData: { key: "filter", data: undefined, indexes } }) // pre 1.5.0
            history({ id: "SHOW_LAYOUT", newData: { key: "backdrop-filter", data: undefined, indexes } })
            return
        }

        if (active === "slide") {
            history({
                id: "slideStyle",
                oldData: { style: _show().slides([slideId]).get("settings")[0] },
                newData: { style: {} },
                location: { page: "edit", show: $activeShow!, slide: slideId }
            })
            return
        }

        if (active !== "text") return

        let values: any = []
        items.forEach((item) => {
            if (item.lines) {
                let text = item.lines.map((a) => {
                    return (a.text || []).map((a) => {
                        a.style = ""
                        return a
                    })
                })
                values.push(text)
            }
        })

        // let selectedItems = $activeEdit.items.length ? $activeEdit.items : Object.keys(allSlideItems)
        if (values.length) {
            history({
                id: "textStyle",
                newData: { style: { key: "text", values } },
                location: {
                    page: "edit",
                    show: $activeShow!,
                    slide: slideId,
                    items: $activeEdit.items
                }
            })
        }

        let deleteKeys = ["textFit", "specialStyle", "scrolling"]
        // reset timer/icon/media/mirror etc. style
        if (item && item[item.type || ""]) deleteKeys = [item.type!]

        deleteKeys.forEach((key) => {
            history({
                id: "setItems",
                newData: { style: { key, values: [undefined] } },
                location: { page: "edit", show: $activeShow!, slide: slideId, items: $activeEdit.items, id: key }
            })
        })

        // WIP refresh edit tools after resetting
    }

    function keydown(e: KeyboardEvent) {
        if (document.activeElement?.closest(".edit")) return

        // move items with arrow keys
        if (e.key.includes("Arrow") && $activeEdit.items.length) {
            e.preventDefault()

            const key = ["ArrowLeft", "ArrowRight"].includes(e.key) ? "left" : "top"
            let value = ["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1
            if (e.ctrlKey || e.metaKey) value *= 10

            let selectedItems: number[] = $activeEdit.items || allSlideItems.map((_, i) => i)
            if (!selectedItems.length) return

            let values: string[] = []

            selectedItems.forEach((index) => {
                let item = allSlideItems[index]
                if (!item) return

                let previousItemValue = Number(getStyles(item.style, true)?.[key] || "0")
                let newValue = previousItemValue + value + "px"

                values.push(addStyleString(item.style, [key, newValue]))
            })

            if (activeId) {
                history({
                    id: "UPDATE",
                    oldData: { id: activeId },
                    newData: { key: "items", subkey: "style", data: values, indexes: selectedItems },
                    location: { page: "edit", id: $activeEdit.type + "_items", override: true }
                })
                return
            }

            let ref = getLayoutRef()
            let slideId = ref[activeSlide ?? ""]?.id

            history({
                id: "setItems",
                newData: { style: { key: "style", values } },
                location: { page: "edit", show: $activeShow!, slide: slideId, items: selectedItems, override: "slideitem_" + slideId + "_items_" + selectedItems.join(",") }
            })
        }
    }

    $: slideActive = !!((slides?.length && showIsActive && activeSlide !== null) || activeId)
    let profile = getAccess("shows")

    $: currentShow = $showsCache[$activeShow?.id || ""]
    $: isLocked = activeId ? false : currentShow?.locked || isSlideLocked($activeShow?.id || "", ref[activeSlide]?.id || "", currentShow) || profile.global === "read" || profile[currentShow?.category || ""] === "read"
    // $: isDefault = $activeEdit.type === "overlay" ? $overlays[activeId || ""]?.isDefault : $activeEdit.type === "template" ? $templates[activeId || ""]?.isDefault : false
    $: overflowHidden = !!(isShow || $activeEdit.type === "template" || $activeEdit.type === "overlay")

    $: currentCopied = $copyPasteEdit[type]
    $: currentItemStyle = getItemsStyle($showsCache[$activeEdit?.id || $activeShow?.id || ""])
    $: copiedStyleDifferent = currentCopied && JSON.stringify(currentCopied) !== JSON.stringify(currentItemStyle)

    // function copyToCreateData() {
    //     const slide = $activeEdit?.type === "overlay" ? $overlays[activeId || ""] : $activeEdit?.type === "template" ? $templates[activeId || ""] : null
    //     if (!slide) return

    //     const newSlide = {
    //         isDefault: true,
    //         name: slide.name,
    //         color: slide.color || null,
    //         category: slide.category,
    //         items: trimItems(clone(slide.items))
    //         // settings
    //     } as typeof slide

    //     navigator.clipboard.writeText(JSON.stringify(newSlide))
    //     newToast("Copied!")

    //     function trimItems(items: Item[]) {
    //         items.forEach((item) => {
    //             if (item.type === "text") delete item.type

    //             item.lines?.forEach((line, lineIndex) => {
    //                 line.align = (line.align || "").replaceAll(";;", ";")
    //                 if (line.align === ";") line.align = ""

    //                 line.text.forEach((text) => {
    //                     text.value = text.value ? (lineIndex + 1).toString() : ""
    //                     text.style = text.style.replace("color:#FFFFFF;", "")
    //                 })
    //             })
    //         })
    //         return items
    //     }
    // }

    // custom local fonts (likely from PPT import)
    $: customLocalFonts = showIsActive ? $showsCache[$activeEdit?.id || $activeShow?.id || ""]?.settings?.customFonts || [] : []
</script>

<svelte:window on:keydown={keydown} />

<div class="main border editTools">
    {#if slideActive && !isLocked}
        <Tabs {tabs} bind:active {overflowHidden} />

        {#if bibleMode}
            <div class="jaScriptureSidebar">
                <button class="jaResetBtn" type="button" on:click={resetEntireBibleAppearance}>Restablecer toda la apariencia</button>
                <details>
                    <summary>Fondo de Escrituras</summary>
                    <div class="jaScriptureFields">
                        <MaterialColorInput label="edit.background_color" value={$templates[activeId]?.settings?.backgroundColor || ""} on:input={(e) => updateBibleBg("backgroundColor", e.detail)} allowEmpty />
                        <MaterialFilePicker label="edit.background_media" value={$templates[activeId]?.settings?.backgroundPath || ""} filter={{ name: "Media files", extensions: mediaExtensions }} on:change={(e) => updateBibleBg("backgroundPath", e.detail ?? e)} allowEmpty />
                        <button class="jaResetBtn" type="button" on:click={resetBibleBackground}>Restablecer fondo</button>
                    </div>
                </details>
                <details>
                    <summary>Fondo de lectura</summary>
                    <div class="jaScriptureFields">
                        {#if plateItem?.lines}
                            <MaterialCheckbox label="Mostrar fondo" checked={plateEnabled} on:change={(e) => togglePlate(e.detail)} small />
                            {#if plateEnabled}
                                <div class="jaPlateColorRow"><label for="plateColor">Color y opacidad</label><MaterialColorInput label="Color y opacidad" value={plateColor} allowOpacity on:input={(e) => updatePlate("background-color", e.detail)} /></div>
                                <div class="jaPlateRadiusLabel"><label for="jaPlateRadius">Esquinas redondeadas</label><output>{parseInt(plateStyles["border-radius"] || "0") || 0}px</output></div>
                                <input id="jaPlateRadius" type="range" min="0" max="80" step="2" value={parseInt(plateStyles["border-radius"] || "0") || 0} on:input={(e) => updatePlate("border-radius", e.currentTarget.value + "px")} />
                            <button class="jaResetBtn" type="button" on:click={resetPlate}>Restablecer placa de lectura</button>
                            {/if}
                        {:else}
                            <p>Selecciona el cuadro de texto del versículo o de la referencia.</p>
                        {/if}
                    </div>
                </details>
            </div>
        {/if}

        {#if active === "text"}
            <div class="content">
                {#if item}
                    <BoxStyle id={item?.type || "text"} bind:allSlideItems bind:item {customLocalFonts} />
                {:else}
                    <Center faded>
                        <T id="empty.items" />
                    </Center>
                {/if}
            </div>
        {:else if active === "item"}
            <div class="content">
                <ItemStyle bind:allSlideItems bind:item />
            </div>
        {:else if active === "filters"}
            <div class="content">
                <SlideFilters />
            </div>
        {:else if active === "slide"}
            <div class="content">
                {#if $activeEdit.type === "template"}
                    <TemplateStyle bind:allSlideItems />
                {:else if $activeEdit.type === "overlay"}
                    <OverlayStyle bind:allSlideItems />
                {:else}
                    <SlideStyle bind:allSlideItems />
                {/if}
            </div>
        {/if}

        {#if item || active === "slide" || active === "filters"}
            <FloatingInputs>
                {#if copiedStyleDifferent}
                    <MaterialButton icon="paste" title="actions.paste" on:click={() => pasteStyle()}>
                        <T id="actions.paste" />
                    </MaterialButton>

                    <div class="divider"></div>
                {/if}
                {#if currentCopied && !copiedStyleDifferent}
                    {#if isShow}
                        {#if active === "filters"}
                            <MaterialButton icon="down" title="actions.to_following" on:click={() => pasteStyle(false, true)}>
                                <!-- <T id="actions.to_following" /> -->
                            </MaterialButton>

                            <div class="divider"></div>
                        {/if}
                        <MaterialButton icon="paste" title="actions.to_all" on:click={() => pasteStyle(true)}>
                            <T id="actions.to_all" />
                        </MaterialButton>
                    {/if}
                {:else}
                    <MaterialButton disabled={!currentItemStyle?.length} title="actions.copy" on:click={copyStyle}>
                        <Icon id="copy" white={copiedStyleDifferent} />
                        {#if !copiedStyleDifferent}<T id="actions.copy" />{/if}
                    </MaterialButton>
                {/if}

                <div class="divider"></div>

                <!-- && !copiedStyleDifferent -->
                {#if currentCopied}
                    <MaterialButton icon="clear" title="clear.general: formats.clipboard" on:click={clearClipboard}></MaterialButton>
                {:else}
                    <MaterialButton icon="reset" title="actions.reset" on:click={reset}>
                        <!-- {#if !isShow}<T id="actions.reset" />{/if} -->
                    </MaterialButton>
                {/if}
            </FloatingInputs>
        {/if}

        <!-- <span style="display: flex;flex-wrap: wrap;white-space: nowrap;">
            {#if $activeEdit.type === "template" || $activeEdit.type === "overlay"}
                <Button style="flex: 1;" title={translateText("actions.copy")} on:click={copyToCreateData} dark center>
                    <Icon id="copy" right />
                    DEV: Copy to "createData"
                </Button>
            {/if}
        </span> -->
    {:else if isLocked}
        <Center faded>
            <Icon id="lock" size={2} white />
            <p style="margin-top: 8px;"><T id="output.state_locked" /></p>
        </Center>
    {:else}
        <Center faded>
            <T id="empty.slides" />
        </Center>
    {/if}
</div>

<style>
    .jaResetBtn { width: 100%; padding: 9px 8px; border: 1px solid var(--primary-lighter); border-radius: 6px; background: var(--primary-darker); color: var(--text); cursor: pointer; font-size: .8rem; }
    .jaResetBtn:hover { background: var(--primary-dark); }
    .jaScriptureSidebar { flex-shrink: 0; border-bottom: 1px solid var(--primary-lighter); }
    .jaScriptureSidebar details { border-bottom: 1px solid var(--primary-lighter); }
    .jaScriptureSidebar summary { cursor: pointer; padding: 11px 13px; background: var(--primary-darker); font-weight: 600; font-size: .87rem; }
    .jaScriptureFields { padding: 10px 9px 14px; display: flex; flex-direction: column; gap: 8px; }
    .jaScriptureFields p, .jaScriptureFields label { font-size: .8rem; opacity: .8; }
    .jaScriptureFields input[type="range"] { width: 100%; }
    .jaPlateColorRow { display: flex; flex-direction: column; gap: 5px; }
    .jaPlateRadiusLabel { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .jaPlateRadiusLabel output { font-size: .8rem; }

    .main {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
    }

    .content {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;

        padding-bottom: 50px;
    }
    .content :global(section) {
        padding: 10px;
        /* flex: 1; */
        /* height: 100%; */
    }
    .content :global(section div) {
        display: flex;
        justify-content: space-between;
    }
</style>
