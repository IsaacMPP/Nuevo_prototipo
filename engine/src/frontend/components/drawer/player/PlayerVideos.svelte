<script lang="ts">
    import type { Category } from "../../../../types/Tabs"
    import { activeFocus, activePlayerTagFilter, activeShow, focusMode, outLocked, outputs, playerTags, playerVideos } from "../../../stores"
    import { translateText } from "../../../utils/language"
    import { clone, sortByName } from "../../helpers/array"
    import Icon from "../../helpers/Icon.svelte"
    import { findMatchingOut, getJAMainOutput, sendToJAOutputs, setOutput } from "../../helpers/output"
    import { getJADestinations } from "../../../utils/jaProjectionDestinations"
    import JADestinationChooser from "../../output/tools/JADestinationChooser.svelte"
    import T from "../../helpers/T.svelte"
    import Button from "../../inputs/Button.svelte"
    import { clearBackground, clearSlide } from "../../output/clear"
    import Center from "../../system/Center.svelte"
    import SelectElem from "../../system/SelectElem.svelte"
    import Card from "../Card.svelte"

    export let active: string
    export let searchValue = ""

    $: videos = sortByName(
        Object.entries($playerVideos)
            .map(([id, video]) => ({ rid: id, ...video }))
            .filter((a) => a.type === active)
    )

    // search
    $: if (videos || searchValue !== undefined || $activePlayerTagFilter) filterSearch()
    const filter = (s: string) => s.toLowerCase().replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
    let fullFilteredVideos: (Category & { rid: string })[] = []
    function filterSearch() {
        fullFilteredVideos = clone(videos)

        // filter by tag
        if ($activePlayerTagFilter.length) {
            fullFilteredVideos = fullFilteredVideos.filter((a) => a.tags?.length && !$activePlayerTagFilter.find((tagId) => !a.tags!.includes(tagId)))
        }

        if (searchValue.length > 1) fullFilteredVideos = fullFilteredVideos.filter((a) => filter(a.name).includes(searchValue))
    }

    let loaded: { [key: string]: boolean } = {}

    // thumbnail
    // https://stackoverflow.com/a/20542029
    // https://stackoverflow.com/a/61662687
    function getThumbnail(videoId: string) {
        if (!videoId) return ""

        if (active === "youtube") {
            return `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`
        }
        if (active === "vimeo") {
            return `https://vumbnail.com/${videoId}_medium.jpg`
        }

        return ""
    }

    // One source and one FreeShow output pipeline for YouTube and Vimeo.
    // Replace slides only in the chosen destination(s), never on other outputs.
    function projectOnlineVideo(videoId: string, outputIds: string[]) {
        if ($outLocked || !outputIds.length) return
        const primaryId = typeof localStorage === "undefined" ? "" : localStorage.getItem("ja-main-projector") || ""
        const available = new Set(getJADestinations($outputs, primaryId).map((item) => item.id))
        const selected = [...new Set(outputIds)].filter((id) => available.has(id))
        if (!selected.length) return
        const slidesToClear = selected.filter((id) => !!$outputs[id]?.out?.slide)
        if (slidesToClear.length) clearSlide(true, slidesToClear)
        sendToJAOutputs("background", { id: videoId, type: "player", muted: false, loop: false, startAt: 0, ignoreLayer: true }, selected, { replaceScripture: true })
    }

    function projectOnlineToPrimary(videoId: string) {
        if ($outLocked) return
        const main = getJAMainOutput()
        if (!main) return
        if ($outputs[main.id]?.out?.background?.id === videoId) {
            clearBackground(main.id)
            return
        }
        if ($outputs[main.id]?.out?.slide) clearSlide(true, main.id)
        setOutput("background", { id: videoId, type: "player", muted: false, loop: false, startAt: 0, ignoreLayer: true }, false, main.id)
    }

    let iconClicked: NodeJS.Timeout | null = null
    function removeStyle(key: string, id: string | undefined) {
        if (!id) return
        iconClicked = setTimeout(() => (iconClicked = null), 50)

        playerVideos.update((a) => {
            if (!a[id]) return a

            if (key === "tags") {
                a[id].tags = []
            }

            return a
        })
    }
</script>

{#if fullFilteredVideos.length}
    {#each fullFilteredVideos as video}
        {@const tags = video.tags || []}

        <Card
            loaded={loaded[video.rid]}
            class="context #player_button"
            preview={$activeShow?.id === video.rid}
            active={findMatchingOut(video.rid, $outputs) !== null}
            outlineColor={findMatchingOut(video.rid, $outputs)}
            label={video.name || ""}
            renameId="player_{video.rid}"
            title={video.id || ""}
            showPlayOnHover
            on:click={(e) => {
                if ($outLocked || e.ctrlKey || e.metaKey || iconClicked) return
                if (e.target?.closest?.(".edit, .jaPlayerDest")) return
                projectOnlineToPrimary(video.rid)
            }}
            on:dblclick={() => {
                if (iconClicked) return
                if ($focusMode) activeFocus.set({ id: video.rid, type: "player" })
                else activeShow.set({ id: video.rid, type: "player" })
            }}
        >
            <!-- Use the same JA modal as Himnario and Multimedia, without
                 bubbling a click into the card's primary-only projection. -->
            <div class="jaPlayerDest" on:click|stopPropagation on:mousedown|stopPropagation>
                <JADestinationChooser label={"Enviar " + (video.name || "video") + " a…"} onSend={(ids) => projectOnlineVideo(video.rid, ids)} />
            </div>
            <!-- icons -->
            <div class="icons">
                {#if tags.length}
                    <div style="max-width: 100%;">
                        <div class="button">
                            <Button style="padding: 3px;" redHover title={translateText("actions.remove")} on:click={() => removeStyle("tags", video.rid)}>
                                <Icon id="tag" size={0.9} white />
                            </Button>
                        </div>
                        <span style="max-width: 100%;">
                            <p>{tags.length === 1 ? $playerTags[tags[0]]?.name || "—" : tags.length}</p>
                        </span>
                    </div>
                {/if}
            </div>

            <SelectElem id="player" data={video.rid} style="width: 100%;" draggable>
                <img src={getThumbnail(video.id || "")} alt="Video thumbnail for {video.name || 'video'}" style="width: 100%;height: 100%;aspect-ratio: 19/9;object-fit: cover;" on:load={() => (loaded[video.rid] = true)} />
            </SelectElem>
        </Card>
    {/each}
{:else}
    <Center size={1.2} faded>
        {#if videos.length}
            <T id="empty.search" />
        {:else}
            <T id="empty.player" />
        {/if}
    </Center>
{/if}

<style>
    .jaPlayerDest { position: absolute; right: 6px; bottom: 7px; z-index: 5; pointer-events: auto; opacity: 1; }
    .jaPlayerDest :global(button) { min-width: 32px; background: var(--primary-darkest); border: 1px solid var(--secondary); box-shadow: 0 2px 6px #0008; }
    /* icons */

    .icons {
        pointer-events: none;
        display: flex;
        flex-direction: column;
        position: absolute;
        left: 0;
        z-index: 1;
        font-size: 0.9em;

        height: 80%;
        flex-wrap: wrap;

        max-width: calc(100% - 21px);
    }
    .icons div {
        opacity: 0.9;
        display: flex;
    }
    .icons .button {
        background-color: rgb(0 0 0 / 0.6);
        pointer-events: all;
    }
    .icons span {
        pointer-events: all;
        background-color: rgb(0 0 0 / 0.6);
        padding: 3px;
        font-size: 0.75em;
        font-weight: bold;
        display: flex;
        align-items: center;
    }
</style>
