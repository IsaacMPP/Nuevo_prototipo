<script lang="ts">
    import { autoOutput, os, special, outputs } from "../../../stores"
    import MaterialToggleSwitch from "../../inputs/MaterialToggleSwitch.svelte"
    import Tip from "../../main/Tip.svelte"

    import { onMount } from "svelte"
    import { Main } from "../../../../types/IPC/Main"
    import { OUTPUT } from "../../../../types/Channels"
    import { send } from "../../../utils/request"
    import { requestMain } from "../../../IPC/main"
    import { getJAProjectionOutputs } from "../../../utils/jaProjectionScreens"
    import { setJAPrimaryAudioRouting } from "../../../audio/routing/audioRoutingInit"
    let displays: any[] = []
    let operatorId = ""
    let principal = ""
    let names: Record<string,string> = {}
    let loading = false
    function label(d: any) { return [names[String(d.id)] || d.label || d.name || "Pantalla " + d.id, d.bounds ? d.bounds.width + " × " + d.bounds.height : "", d.internal ? "Integrada" : ""].filter(Boolean).join(" · ") }
    async function reload() { loading = true; try { displays = (await requestMain(Main.GET_DISPLAYS)) || [] } finally { loading = false } }
    function identify() { if(displays.length) send(OUTPUT, ["IDENTIFY_SCREENS"], displays) }
    function rename(id: string, name: string) { names = {...names,[id]:name}; localStorage.setItem("ja-m1-screen-names",JSON.stringify(names)) }
    onMount(async () => {
        await reload()
        try { names = JSON.parse(localStorage.getItem("ja-m1-screen-names") || "{}") } catch { names = {} }
        operatorId = localStorage.getItem("ja-operator-display") || String(displays.find((d) => d.primary)?.id || displays.find((d) => d.internal)?.id || displays[0]?.id || "")
        principal = localStorage.getItem("ja-main-projector") || ""
        if (principal) setJAPrimaryAudioRouting(principal)
    })
    $: projectors = getJAProjectionOutputs($outputs, displays, operatorId)
    $: principalAvailable = projectors.some((p) => p.id === principal)
    function updateSpecial(value: any, key: string, allowEmpty = false) {
        special.update((a) => {
            if (!allowEmpty && !value) delete a[key]
            else a[key] = value

            return a
        })
    }
</script>

<Tip type="info" value="tips.global_options" bottom={20} />

<MaterialToggleSwitch label="settings.auto_output" checked={$autoOutput} defaultValue={false} on:change={(e) => autoOutput.set(e.detail)} />
<!-- apparently doesn't work on some versions of macOS -->
{#if $os.platform !== "darwin" || $special.hideCursor}
    <MaterialToggleSwitch label="settings.hide_cursor_in_output" checked={$special.hideCursor} defaultValue={false} on:change={(e) => updateSpecial(e.detail, "hideCursor")} />
{/if}

<section class="jaProjectors">
    <strong>JA · Pantallas de proyección</strong>
    <p>Configuración preparatoria. Todavía no cambia el enrutamiento de FreeShow.</p>
    <label for="jaOperator">Pantalla del operador (no se cuenta)</label>
    <select id="jaOperator" value={operatorId} on:change={(e) => {operatorId=e.currentTarget.value;localStorage.setItem("ja-operator-display",operatorId)}}>
        {#each displays as d}<option value={String(d.id)}>{label(d)}</option>{/each}
    </select>
    <div class="jaActions"><button type="button" on:click={identify}>Identificar pantallas</button><button type="button" on:click={reload} disabled={loading}>Actualizar monitores</button></div>
    <div class="jaScreenCards">{#each displays as d (d.id)}<div class="jaScreenCard"><strong>{label(d)}</strong><small>ID: {d.id}{d.primary ? " · Principal de Windows" : ""}</small><input aria-label={"Nombre para pantalla "+d.id} placeholder="Nombre: auditorio, prónter…" value={names[String(d.id)] || ""} on:change={(e) => rename(String(d.id), e.currentTarget.value)} /></div>{/each}</div>
    <label for="jaPrimary">Proyector principal</label>
    <select id="jaPrimary" value={principalAvailable ? principal : ""} on:change={(e) => {principal=e.currentTarget.value;localStorage.setItem("ja-main-projector",principal);if(principal) setJAPrimaryAudioRouting(principal)}}>
        <option value="">Sin seleccionar</option>
        {#each projectors as p}<option value={p.id}>{p.name} · {label(displays.find((d) => String(d.id) === p.screen) || {id:p.screen})}</option>{/each}
    </select>
    <p>{projectors.length} salida(s) de proyección disponible(s). {projectors.length >= 2 ? "Control avanzado habilitable tras M1-03." : "Modo normal."}</p>
    {#if principal && !principalAvailable}<p>La pantalla principal guardada está desconectada o no disponible; no se reasignará automáticamente.</p>{/if}
</section>
<style>
.jaProjectors{display:flex;flex-direction:column;gap:8px;padding:14px;margin-top:16px;border:1px solid var(--primary-lighter);border-radius:8px}
.jaProjectors select{background:var(--primary);color:var(--text);padding:8px}
.jaProjectors p{font-size:12px}
.jaActions{display:flex;gap:8px}.jaActions button{background:var(--primary);color:var(--text);padding:9px;border:1px solid var(--primary-lighter);cursor:pointer}.jaScreenCards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}.jaScreenCard{display:flex;flex-direction:column;gap:8px;padding:10px;background:var(--primary);border-radius:6px}.jaScreenCard small{opacity:.7}.jaScreenCard input{padding:8px;background:var(--primary-darkest);color:var(--text);border:1px solid var(--primary-lighter)}
</style>
