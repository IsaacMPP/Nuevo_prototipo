<script lang="ts">
    import { outputs } from "../../../stores"
    import { getJADestinations } from "../../../utils/jaProjectionDestinations"
    import { openJADestinationDialog } from "../../../utils/jaDestinationDialog"
    export let label = "Enviar a…"
    export let onSend: (ids: string[]) => void
    export let compact = true
    $: primaryId = typeof localStorage === "undefined" ? "" : localStorage.getItem("ja-main-projector") || ""
    $: destinations = getJADestinations($outputs, primaryId)
    $: enabled = destinations.length >= 2 && destinations.some((d) => d.role === "primary")
</script>
{#if enabled}
    <button class="jaDestTrigger" type="button" title={label} aria-label={label}
        on:click={() => openJADestinationDialog(label, onSend)}>{compact ? "▾" : label}</button>
{/if}
<style>
.jaDestTrigger{background:var(--primary-darker);color:var(--text);border:1px solid var(--secondary);border-radius:6px;padding:6px 10px;cursor:pointer;white-space:nowrap}
.jaDestTrigger:hover{background:var(--primary)}
</style>