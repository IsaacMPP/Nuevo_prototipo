<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import { outputs } from "../../stores"
    import {
        DEFAULT_JA_BIBLE_APPEARANCE,JA_BIBLE_FONT_FAMILIES,jaBibleAppearances,
        setJABibleAppearance,resetJABibleAppearance,
        type JABibleAppearance
    } from "../../utils/jaBibleAppearance"

    export let outputId: string = ""
    const dispatch=createEventDispatcher()
    $: appearance = $jaBibleAppearances[outputId] || DEFAULT_JA_BIBLE_APPEARANCE
    $: customized = !!$jaBibleAppearances[outputId]
    $: screenName = $outputs[outputId]?.name || "Salida seleccionada"
    const chooseWeight=(value:string) => setStyle("fontWeight",value==="bold"?"bold":"normal")
    const chooseHorizontal=(value:string) => setStyle("textAlign",value==="left"||value==="right"?value:"center")
    const chooseVertical=(value:string) => setStyle("verticalAlign",value==="top"||value==="bottom"?value:"center")
    const chooseBackgroundMode=(value:string) => setStyle("backgroundMode",value==="image"?"image":"color")
    function setStyle<K extends keyof JABibleAppearance>(key:K,value:JABibleAppearance[K]) {
        if(!outputId)return
        setJABibleAppearance(outputId,{[key]:value} as Partial<JABibleAppearance>)
    }
</script>

<section class="ja-bible-editor" role="dialog" aria-label="Editor de estilo bíblico para {screenName}">
    <header>
        <div>
            <strong>Editar apariencia bíblica</strong>
            <small>{screenName} · {customized ? "Configuración propia" : "Plantilla original"}</small>
        </div>
        <button class="editor-close" type="button" aria-label="Cerrar editor bíblico" on:click={() => dispatch("close")}>✕</button>
    </header>
    <div class="editor-body">
        <p class="editor-note">Cada ajuste modifica solo su propiedad. Los demás conservan el diseño original de FreeShow. Vista previa se actualiza al instante; Programa solo cambia con Proyectar, Aplicar o seguimiento activo.</p>
        <label class="editor-field">
            <span>Fuente</span>
            <select aria-label="Fuente bíblica" value={appearance.fontFamily}
                on:change={(e) => setStyle("fontFamily",e.currentTarget.value)}>
                {#each JA_BIBLE_FONT_FAMILIES as font}
                    <option value={font}>{font}</option>
                {/each}
            </select>
        </label>
        <label class="editor-field">
            <span>Tamaño <output>{appearance.fontSize} px</output></span>
            <input aria-label="Tamaño de versículos" type="range" min="24" max="180" step="2"
                value={appearance.fontSize} on:input={(e) => setStyle("fontSize",Number(e.currentTarget.value))}/>
        </label>
        <div class="editor-grid">
            <label class="editor-field">
                <span>Color del texto</span>
                <input aria-label="Color del texto bíblico" type="color" value={appearance.textColor}
                    on:input={(e) => setStyle("textColor",e.currentTarget.value)}/>
            </label>
            <label class="editor-field">
                <span>Grosor</span>
                <select aria-label="Grosor del texto" value={appearance.fontWeight}
                    on:change={(e) => chooseWeight(e.currentTarget.value)}>
                    <option value="normal">Normal</option><option value="bold">Negrita</option>
                </select>
            </label>
        </div>
        <div class="editor-grid">
            <label class="editor-field">
                <span>Alineación horizontal</span>
                <select aria-label="Alineación horizontal bíblica" value={appearance.textAlign}
                    on:change={(e) => chooseHorizontal(e.currentTarget.value)}>
                    <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
                </select>
            </label>
            <label class="editor-field">
                <span>Posición vertical</span>
                <select aria-label="Alineación vertical bíblica" value={appearance.verticalAlign}
                    on:change={(e) => chooseVertical(e.currentTarget.value)}>
                    <option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option>
                </select>
            </label>
        </div>
        <label class="editor-check">
            <input type="checkbox" checked={appearance.shadow}
                on:change={(e) => setStyle("shadow",e.currentTarget.checked)}/>
            Sombra para mejorar la lectura
        </label>
        <div class="editor-separator"></div>
        <label class="editor-field">
            <span>Fondo de los versículos</span>
            <select aria-label="Tipo de fondo bíblico" value={appearance.backgroundMode}
                on:change={(e) => chooseBackgroundMode(e.currentTarget.value)}>
                <option value="color">Color sólido</option><option value="image">Imagen propia</option>
            </select>
        </label>
        {#if appearance.backgroundMode==="color"}
            <label class="editor-field">
                <span>Color del fondo</span>
                <input type="color" aria-label="Color de fondo bíblico" value={appearance.backgroundColor}
                    on:input={(e) => setStyle("backgroundColor",e.currentTarget.value)}/>
            </label>
        {:else}
            <button type="button" class="editor-action" on:click={() => dispatch("chooseBackground")}>Elegir imagen de fondo…</button>
            <small class="editor-path">{appearance.backgroundPath ? appearance.backgroundPath.split(/[\\/]/).pop() : "No hay imagen elegida: fondo negro temporal"}</small>
        {/if}
        <div class="editor-separator"></div>
        <button type="button" class="editor-action editor-apply" on:click={() => dispatch("applyToProgram")}>Aplicar al Programa actual</button>
        <button type="button" class="editor-action editor-reset" disabled={!customized} on:click={() => resetJABibleAppearance(outputId)}>Restaurar plantilla de esta pantalla</button>
        <p class="editor-note">Cada pantalla conserva su configuración. Si envías Biblia a varias a la vez, todas toman el estilo de <strong>Primario</strong>; las pantallas no marcadas quedan intactas.</p>
    </div>
</section>

<style>
    .ja-bible-editor{position:absolute;top:68px;right:10px;bottom:55px;z-index:35;width:min(345px,calc(100% - 20px));display:flex;flex-direction:column;color:#f0f5ff;background:#0b1a34;border:1px solid #56749e;border-radius:12px;box-shadow:0 12px 35px #0009;overflow:hidden;font-size:12px}
    .ja-bible-editor header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;background:#142b4d;border-bottom:1px solid #345579;flex-shrink:0}
    .ja-bible-editor header strong{display:block;font-size:14px}
    .ja-bible-editor header small{display:block;color:#c4d9f4;margin-top:4px}
    .editor-close{background:#213b5e;color:white;border:1px solid #41628b;border-radius:6px;padding:5px 9px;cursor:pointer}
    .editor-body{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:13px}
    .editor-note{color:#c0d2ef;font-size:11px;line-height:1.5;margin:0}
    .editor-field{display:flex;flex-direction:column;gap:6px;font-weight:600;color:#e8f2ff;min-width:0}
    .editor-field>span{display:flex;justify-content:space-between;align-items:center;gap:6px}
    .editor-field select{background:#132a4d;color:white;border:1px solid #41628b;border-radius:6px;min-width:0;padding:8px;width:100%}
    .editor-field input[type="range"]{width:100%;accent-color:#f1bd28}
    .editor-field input[type="color"]{height:32px;width:100%;background:#132a4d;border:1px solid #41628b;border-radius:6px;cursor:pointer}
    .editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .editor-check{display:flex;align-items:center;gap:9px;color:#e8f2ff}
    .editor-check input{accent-color:#f1bd28}
    .editor-separator{border-top:1px solid #2f496a;margin:0}
    .editor-action{padding:9px 10px;background:#24466f;border:1px solid #496c94;border-radius:7px;color:white;font-weight:600;cursor:pointer}
    .editor-apply{background:#825e06;border-color:#bd9220}
    .editor-reset{background:transparent;color:#d3e1f6}
    .editor-action:disabled{opacity:.45;cursor:not-allowed}
    .editor-path{word-break:break-all;color:#a8c1e1}
</style>
