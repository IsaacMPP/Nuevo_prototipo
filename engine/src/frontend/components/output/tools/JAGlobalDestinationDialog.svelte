<script lang="ts">
    import { outputs } from "../../../stores"
    import { jaDestinationDialog } from "../../../utils/jaDestinationDialog"
    import { getJADestinations } from "../../../utils/jaProjectionDestinations"
    let selected: string[] = []
    $: primaryId = typeof localStorage === "undefined" ? "" : localStorage.getItem("ja-main-projector") || ""
    $: destinations = getJADestinations($outputs, primaryId)
    $: if (!$jaDestinationDialog) selected = []
    function change(id: string) { selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] }
    function close() { jaDestinationDialog.set(null) }
    function submit() {
        const dialog = $jaDestinationDialog
        const valid = selected.filter((id) => destinations.some((d) => d.id === id))
        if (!dialog || !valid.length) return
        close()
        dialog.onSend(valid)
    }
</script>
{#if $jaDestinationDialog}
    <div class="backdrop" role="presentation" on:click={close}>
        <section class="jaDialog" role="dialog" aria-modal="true" aria-label="Seleccionar pantallas" on:click|stopPropagation>
            <div class="header">
                <div><small>JA · Proyección multipantalla</small><h3>Enviar a pantallas</h3></div>
                <button type="button" class="close" on:click={close} aria-label="Cerrar">×</button>
            </div>
            <p class="description">Selecciona una o varias pantallas. No cambia la pantalla principal configurada.</p>
            <div class="destinations">
                {#each destinations as d (d.id)}
                    <label class:checked={selected.includes(d.id)}>
                        <input type="checkbox" checked={selected.includes(d.id)} on:change={() => change(d.id)} />
                        <span class="screenIcon">▣</span>
                        <span class="descriptionName"><strong>{d.name}</strong><small>{d.role === "primary" ? "Principal · conserva el audio" : "Secundaria · audio desactivado"}</small></span>
                    </label>
                {/each}
            </div>
            <div class="footer"><button type="button" class="cancel" on:click={close}>Cancelar</button><button type="button" class="send" disabled={!selected.length} on:click={submit}>Enviar {selected.length ? "a " + selected.length + (selected.length === 1 ? " pantalla" : " pantallas") : ""}</button></div>
        </section>
    </div>
{/if}
<style>
.backdrop{position:fixed;inset:0;z-index:9999;background:#020814af;display:flex;justify-content:center;align-items:center;padding:20px}
.jaDialog{background:#132744;color:#f3f7ff;border:1px solid #344964;border-radius:16px;box-shadow:0 20px 65px #0009;width:min(410px,100%);padding:20px;font-family:inherit}
.header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.header small{color:#a7bddb;font-size:11px}.header h3{font-size:18px;margin:6px 0 0;font-weight:700}
.close{background:transparent;border:0;color:#c9d5e4;font-size:25px;cursor:pointer}
.description{font-size:12px;line-height:1.5;color:#b6c5da;margin:14px 0}
.destinations{display:flex;flex-direction:column;gap:8px}.destinations label{display:flex;align-items:center;gap:12px;padding:12px;background:#1a3354;border:1px solid #365070;border-radius:9px;cursor:pointer}.destinations label.checked{border-color:#ffd400;background:#243957}.screenIcon{font-size:20px;color:#ffd400}.descriptionName{display:flex;flex-direction:column;gap:4px;flex:1}.descriptionName strong{font-size:13px}.descriptionName small{font-size:11px;color:#afc1d9}.destinations input{accent-color:#ffd400}
.footer{display:flex;gap:10px;margin-top:19px}.footer button{padding:11px;border-radius:7px;border:0;cursor:pointer;font-weight:650}.cancel{background:#263b57;color:#fff;flex:1}.send{background:#ffd400;color:#14243b;flex:2}.send:disabled{opacity:.45;cursor:not-allowed}
</style>