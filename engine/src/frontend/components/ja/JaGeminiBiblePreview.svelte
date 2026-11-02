<script lang="ts">
    import { outputs, styles } from "../../stores"
    import type { OutData } from "../../../types/Output"
    import { getResolution } from "../helpers/output"
    import { getStyleResolution } from "../slide/getStyleResolution"
    import Output from "../output/Output.svelte"

    // Renderiza una instantánea sin mutar ningún output.
    export let outputId = ""
    export let prepared: OutData
    $: resolution = getResolution(null, [$outputs, $styles], false, outputId)
</script>

<div class="ja-gemini-bible-preview previewOutput" style={"aspect-ratio:" + resolution.width + "/" + resolution.height}>
    {#if outputId && prepared}
        <Output {outputId} outOverride={prepared} style={getStyleResolution(resolution, resolution.width, resolution.height, "fit")} mirror preview={false} />
    {/if}
</div>

<style>
.ja-gemini-bible-preview {width:100%;height:100%;max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;background:#050d1e;overflow:hidden}
</style>
