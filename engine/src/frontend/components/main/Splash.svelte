<script lang="ts">
    import { onMount } from "svelte"
    import { activePopup, activeProject, projects, projectView, quickSearchActive, showRecentlyUsedProjects, shows, special, version } from "../../stores"
    import { history } from "../helpers/history"
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import Link from "../inputs/Link.svelte"
    import MaterialButton from "../inputs/MaterialButton.svelte"
    import Center from "../system/Center.svelte"
    import { getVOTD } from "./votd"

    function createProject() {
        // if opened project is empty go to project list (to reduce confusion)
        if ($projects[$activeProject || ""]?.shows?.length === 0) {
            activeProject.set(null)
            projectView.set(true)
        }

        history({ id: "UPDATE", location: { page: "show", id: "project" } })

        showRecentlyUsedProjects.set(false)
    }

    let links: string[] = []
    function extractLinksAndCleanText(text: string) {
        links = []

        // extract and remove links from <a> tags
        const textWithoutATags = text.replace(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>.*?<\/a>/gi, (_match, url) => {
            links.push(url)
            return ""
        })
        // extract and remove raw links from plain text
        const finalText = textWithoutATags.replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
            links.push(url)
            return ""
        })

        return finalText.replaceAll("\n", "<br>").replace(/\s+/g, " ").trim()
    }

    let votd: string = ""
    onMount(async () => {
        if ($special.splashText) return
        votd = await getVOTD()
    })
</script>

<Center class="context #splash ja-splash" style="background: radial-gradient(ellipse at 52% 1%, rgba(40,144,222,.42), transparent 46%), linear-gradient(180deg, rgba(3,23,46,.08), rgba(3,17,36,.72)), url('./ja-hero.jpg') center / cover no-repeat, #061e37;">
    <div class="ja-welcome">
        <img src="./ja-logo.png" alt="Emblema JA" draggable={false} />
        <h1>JA <span>Proyección</span></h1>
        <p class="ja-subtitle">Presentaciones que inspiran, para una generación que sirve.</p>
        <p class="ja-version">v{$version}</p>
    </div>
    {#if $special.splashText}
        <div class="ja-custom-message">
            {@html extractLinksAndCleanText($special.splashText)}
            <span class="links" style="display: flex;flex-direction: column;align-items:center;">
                {#each links as link}
                    <Link url={link}>{link.replace(/^(https?:\/\/)/, "")}<Icon id="launch" white /></Link>
                {/each}
            </span>
        </div>
    {:else if votd && Object.keys($shows).length >= 20}
        <p class="votd"><Link url="https://votd.org/">{votd}</Link></p>
    {/if}

    <span class="buttons">
        <div class="ja-main-action">
            <MaterialButton icon="search" title="main.quick_search" on:click={() => quickSearchActive.set(true)}>
                <T id="main.quick_search" />
            </MaterialButton>
        </div>
        <div class="ja-minor-action">
            <MaterialButton icon="project" title="tooltip.project" on:click={createProject}>
                <T id="new.project" />
            </MaterialButton>
        </div>
        <div class="ja-minor-action">
            <MaterialButton
                icon="add"
                title="tooltip.show"
                on:click={(e) => {
                    if (e.detail.ctrl) {
                        history({ id: "UPDATE", newData: { remember: { project: $activeProject } }, location: { page: "show", id: "show" } })
                    } else activePopup.set("show")
                }}
            >
                <T id="new.show" />
            </MaterialButton>
        </div>
    </span>
</Center>


<style>
    :global(.ja-splash) {
        position: relative;
        padding: 16px;
        isolation: isolate;
        overflow-y: auto;
    }
    .ja-welcome {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        max-width: min(95%, 680px);
        margin: 0 auto;
        padding: 5px 12px 0;
        text-align: center;
    }
    .ja-welcome img {
        height: clamp(150px, 27vh, 205px);
        width: min(275px, 40vw);
        max-width: 80%;
        object-fit: cover;
        object-position: center;
        filter: drop-shadow(0 7px 15px rgba(1, 9, 19, 0.28));
    }
    .ja-welcome h1 {
        font-size: clamp(2.4em, 4.25vw, 4.3em);
        color: var(--text);
        line-height: 1.12;
        letter-spacing: -0.055em;
        font-weight: 760;
        overflow: visible;
        margin-top: 2px;
        text-shadow: 0 2px 12px rgba(2, 16, 40, 0.48);
    }
    .ja-welcome h1 span {
        color: #ffcb2c;
    }
    .ja-welcome .ja-subtitle {
        font-size: clamp(0.78em, 1.15vw, 1.06em);
        color: #d1dfef;
        opacity: 0.93;
        overflow: visible;
        white-space: normal;
    }
    .ja-welcome .ja-version {
        margin-top: 3px;
        font-size: 0.78em;
        color: #c8d1dd;
        opacity: 0.82;
    }
    .buttons {
        display: flex;
        flex-direction: column;
        gap: 9px;
        width: min(280px, 75vw);
        margin-top: 15px;
    }
    .buttons .ja-main-action,
    .buttons .ja-minor-action {
        display: flex;
        width: 100%;
    }
    .buttons :global(button) {
        width: 100%;
        display: flex;
        justify-content: center;
        padding: 10px 15px;
        border: 1px solid #2c83c4;
        border-radius: 24px;
        min-height: 41px;
        background: linear-gradient(90deg, rgba(9, 47, 82, 0.96), rgba(3, 45, 84, 0.96));
        color: #f7fbff;
        font-weight: 600;
        font-size: 0.94em;
        box-shadow: 0 4px 12px rgba(0, 8, 22, 0.14);
        transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .buttons .ja-main-action :global(button) {
        color: #0a1a30;
        background: linear-gradient(180deg, #ffe04b, #f8b71a);
        border: 1px solid #f4d02b;
        font-weight: 760;
    }
    .buttons :global(button:hover) {
        border-color: #f6bf19;
        filter: brightness(1.12);
    }
    .ja-custom-message, .votd {
        max-width: 600px;
        padding: 10px 16px;
        margin-top: 10px;
        text-align: center;
        font-size: 0.82em;
        background: rgba(2, 20, 38, 0.55);
        border-radius: 8px;
        white-space: normal;
    }
    .votd :global(a) { text-decoration: none; }
    @media (max-height: 650px) {
        .ja-welcome img { height: clamp(96px, 20vh, 150px); width: min(210px, 40vw); }
        .ja-welcome h1 { font-size: clamp(2em, 3.8vw, 3.3em); }
        .buttons { margin-top: 8px; gap: 6px; }
        .buttons :global(button) { min-height: 35px; padding: 7px 12px; }
    }
    @media (max-width: 680px) {
        .ja-welcome h1 { font-size: 2.1em; }
        .ja-welcome img { height: 112px; width: 160px; max-width: 60vw; }
    }
</style>
