<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import { outputs, mediaFolders, scriptureMode, scriptures } from "../../stores"

    export let selectedOutputId: string = ""
    const dispatch = createEventDispatcher()
    let hymnCollection = "Himnario Adventista"

    // Datos reales de FreeShow: no inventar salidas ni bibliotecas.
    $: configuredOutputs = Object.entries($outputs).filter(([, output]) => output?.enabled && !output?.stageOutput)
    $: mediaFolderCount = Object.values($mediaFolders).filter((folder) => !!folder?.path).length
    $: localBibleCount = Object.values($scriptures).filter((bible) => !!bible && !bible.api && !bible.collection).length

    function handleKeydown(event: KeyboardEvent) {
        if (event.key !== "Escape") return
        event.preventDefault()
        event.stopImmediatePropagation()
        dispatch("close")
    }
</script>

<svelte:window on:keydown|capture={handleKeydown} />
<div class="ja-settings-backdrop" role="presentation" on:click={() => dispatch("close")}>
    <section class="ja-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ja-settings-title" on:click|stopPropagation={() => {}}>
        <header class="ja-settings-header">
            <div>
                <h2 id="ja-settings-title">Configuración JA</h2>
                <p>Salidas, bibliotecas y preferencias disponibles en la consola Gemini.</p>
            </div>
            <button type="button" aria-label="Cerrar configuración" title="Cerrar configuración" on:click={() => dispatch("close")}>✕</button>
        </header>
        <div class="ja-settings-content">
            <section class="ja-settings-section">
                <h3>Pantalla de trabajo</h3>
                <p>Selecciona qué salida inspeccionas en Programa. No se envía ni cambia contenido al seleccionar.</p>
                {#if configuredOutputs.length}
                    <div class="ja-settings-outputs">
                        {#each configuredOutputs as [id, output] (id)}
                            <button type="button" aria-pressed={selectedOutputId === id} disabled={!output.active} on:click={() => dispatch("selectOutput", {id})}>
                                <span>{output.name || "Salida"}</span>
                                <small>{output.active ? (selectedOutputId === id ? "Seleccionada" : "Activa") : "Inactiva"}</small>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <p>No hay salidas configuradas. La detección y asignación física se integrarán en esta interfaz; no se creará una salida ficticia.</p>
                {/if}
            </section>
            <section class="ja-settings-section">
                <h3>Biblia</h3>
                <p>{localBibleCount} traducción(es) locales detectadas. Cambia la presentación del navegador de versículos.</p>
                <div class="ja-settings-actions">
                    <button type="button" aria-pressed={$scriptureMode === "grid"} on:click={() => scriptureMode.set("grid")}>Cuadrícula</button>
                    <button type="button" aria-pressed={$scriptureMode === "list"} on:click={() => scriptureMode.set("list")}>Lista</button>
                </div>
            </section>
            <section class="ja-settings-section">
                <h3>Bibliotecas locales</h3>
                <p>{mediaFolderCount} carpeta(s) multimedia registradas. Vincular o actualizar no borra los archivos originales.</p>
                <div class="ja-settings-actions">
                    <button type="button" on:click={() => dispatch("linkMedia")}>+ Vincular Multimedia</button>
                    <button type="button" on:click={() => dispatch("refreshMedia")}>Actualizar Multimedia</button>
                </div>
                <div class="ja-settings-actions">
                    <label for="ja-settings-hymn-collection">Colección</label>
                    <select id="ja-settings-hymn-collection" bind:value={hymnCollection}>
                        <option value="Himnario Adventista">Himnario Adventista</option>
                        <option value="Cantos Juveniles">Cantos Juveniles</option>
                    </select>
                    <button type="button" on:click={() => dispatch("linkHymn", {collection:hymnCollection})}>+ Vincular carpeta</button>
                    <button type="button" on:click={() => dispatch("refreshHymn")}>Actualizar Himnario</button>
                </div>
            </section>
            <p class="ja-settings-disclaimer">Configuración de dispositivos HDMI, audio independiente, fondos bíblicos y transiciones: integración pendiente. No se ofrecen opciones simuladas.</p>
        </div>
        <footer><button type="button" on:click={() => dispatch("close")}>Cerrar</button></footer>
    </section>
</div>

<style>
    .ja-settings-backdrop {position:absolute;inset:0;z-index:1000;background:rgba(2,8,24,.78);display:flex;align-items:center;justify-content:center;padding:18px;color:#edf5ff}
    .ja-settings-dialog {width:min(760px,100%);max-height:95%;overflow:hidden;display:flex;flex-direction:column;border:1px solid #3d648a;border-radius:13px;background:#081732;box-shadow:0 22px 90px #020917}
    .ja-settings-header {display:flex;align-items:start;justify-content:space-between;gap:14px;border-bottom:1px solid #28456c;padding:18px 22px;background:#102447}
    .ja-settings-header h2 {font-size:19px;font-weight:750;margin:0}
    .ja-settings-header p {font-size:12px;color:#bed2e9;margin:5px 0 0}
    .ja-settings-header button {font-size:18px;padding:3px 9px}
    .ja-settings-content {overflow:auto;flex:1;min-height:0;padding:12px 22px}
    .ja-settings-section {border-bottom:1px solid #26416a;padding:12px 0 17px}
    .ja-settings-section h3 {font-size:14px;font-weight:700;margin:0 0 6px}
    .ja-settings-section p {font-size:12px;color:#bfcee3;margin:0 0 12px}
    .ja-settings-actions {display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:9px}
    .ja-settings-outputs {display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}
    .ja-settings-outputs button {display:flex;flex-direction:column;align-items:start;gap:4px;min-width:0}
    .ja-settings-outputs small {font-size:11px;color:#9edfc2}
    .ja-settings-dialog button,.ja-settings-dialog select {border:1px solid #456a94;background:#14375d;color:#fff;border-radius:7px;font-size:12px;padding:9px 11px;cursor:pointer}
    .ja-settings-dialog button:hover {border-color:#4cd1fd;background:#205078}
    .ja-settings-dialog button[aria-pressed="true"] {border-color:#f3bf2b;background:#4b3b16}
    .ja-settings-dialog button:disabled {opacity:.42;cursor:not-allowed}
    .ja-settings-dialog label {font-size:12px;color:#dde7f6}
    .ja-settings-disclaimer {font-size:11px;line-height:1.5;color:#a9b9d2;margin:18px 0 8px}
    .ja-settings-dialog footer {display:flex;justify-content:flex-end;padding:12px 22px;border-top:1px solid #28456c}
    @media(max-width:600px) {.ja-settings-backdrop{padding:8px}.ja-settings-header,.ja-settings-content,.ja-settings-dialog footer{padding-left:13px;padding-right:13px}}
</style>
