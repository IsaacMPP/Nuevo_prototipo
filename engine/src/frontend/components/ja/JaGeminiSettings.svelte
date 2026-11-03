<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte"
    import { Main } from "../../../types/IPC/Main"
    import { requestMain } from "../../IPC/main"
    import { OUTPUT } from "../../../types/Channels"
    import { send } from "../../utils/request"
    import { outputs, mediaFolders, scriptureMode, scriptures, saved } from "../../stores"

    export let selectedOutputId: string = ""
    export let previewAutoplay = true
    export let compactUi = false
    export let largeUi = false
    export let startSection: "general" | "screens" | "libraries" | "playback" | "branding" | "shortcuts" = "general"
    export let logoName = "Logo predeterminado JA"
    export let logoScale = 1.35
    export let logoPosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" = "center"

    const dispatch = createEventDispatcher()
    let section = startSection
    let hymnCollection = "Himnario Adventista"
    type JaDisplay = {id:number;label?:string;internal?:boolean;jaOperatorDisplay?:boolean;bounds:{x:number;y:number;width:number;height:number}}
    const isOperatorDisplay = (display: JaDisplay) => display.jaOperatorDisplay === true || (display.internal === true && !physicalDisplays.some(d=>d.jaOperatorDisplay))
    $: operatorDisplayId = String(physicalDisplays.find(isOperatorDisplay)?.id ?? "")
    let operatorDisplayId = ""
    let physicalDisplays: JaDisplay[] = []
    let displaysLoading = false
    let displaysError = ""
    let selectedPhysicalDisplayId = ""
    async function refreshWindowsDisplays(){
        displaysLoading = true
        displaysError = ""
        try{
            const nativeDisplays = await requestMain(Main.GET_DISPLAYS)
            physicalDisplays = (nativeDisplays || []).filter(d=>d && d.bounds && Number.isFinite(d.id))
                .map(d=>({id:d.id,label:d.label,internal:d.internal,jaOperatorDisplay:(d as typeof d & {jaOperatorDisplay?:boolean}).jaOperatorDisplay,bounds:d.bounds}))
                .sort((a,b)=>a.bounds.x-b.bounds.x)
            const selected = physicalDisplays.find(d=>String(d.id)===selectedPhysicalDisplayId)
            if(!selected || isOperatorDisplay(selected))
                selectedPhysicalDisplayId = physicalDisplays.find(d=>!isOperatorDisplay(d))?.id?.toString() || ""
        }catch(error){
            displaysError = "No se pudo consultar Windows: "+String(error)
        }finally{displaysLoading=false}
    }
    function identifyWindowsDisplays(){
        if(!physicalDisplays.length)return
        send(OUTPUT,["IDENTIFY_SCREENS"],physicalDisplays)
    }
    function activateSelectedDisplay(){
        const display=physicalDisplays.find(d=>String(d.id)===selectedPhysicalDisplayId)
        if(!display || isOperatorDisplay(display))return
        const alreadyAssigned = Object.entries($outputs).find(([,o])=>o.enabled && String(o.screen)===String(display.id))
        if(alreadyAssigned){
            if(!window.confirm("¿Activar la salida "+(alreadyAssigned[1].name||alreadyAssigned[0])+" en este monitor externo? No se enviará contenido nuevo."))return
            dispatch("activateDisplay",{outputId:alreadyAssigned[0],displayId:display.id})
            return
        }
        const availableOutput=Object.entries($outputs).find(([,o])=>o.enabled && !o.stageOutput && !o.screen)
        if(availableOutput){
            if(!window.confirm("¿Asignar y activar "+(availableOutput[1].name||availableOutput[0])+" en "+(display.label||"Pantalla externa")+"? La pantalla de la laptop seguirá reservada."))return
            dispatch("assignDisplay",{outputId:availableOutput[0],displayId:display.id,bounds:display.bounds})
            return
        }
        if(!window.confirm("¿Crear y activar una salida nueva en "+(display.label||"este monitor externo")+"? La nueva pantalla iniciará sin contenido."))return
        dispatch("createDisplayOutput",{displayId:display.id,bounds:display.bounds,name:display.label||"Pantalla externa"})
    }
    onMount(()=>{void refreshWindowsDisplays()})
    const sections = [
        {id:"general",name:"General",symbol:"⚙"},
        {id:"screens",name:"Pantallas y salidas",symbol:"▣"},
        {id:"libraries",name:"Archivos y bibliotecas",symbol:"▤"},
        {id:"playback",name:"Audio y reproducción",symbol:"♫"},
        {id:"branding",name:"Logo y marca",symbol:"✦"},
        {id:"shortcuts",name:"Atajos y ayuda",symbol:"⌨"}
    ] as const

    // Lecturas del estado REAL. No se generan monitores ni salidas ficticias.
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

<svelte:window on:keydown|capture={handleKeydown}/>
<div class="ja-settings-backdrop" role="presentation" on:click={() => dispatch("close")}>
    <section class="ja-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ja-settings-title" on:click|stopPropagation={() => {}}>
        <header class="ja-settings-header">
            <div>
                <h2 id="ja-settings-title">Configuración JA</h2>
                <p>Preferencias del operador y controles de la consola Gemini</p>
            </div>
            <button type="button" aria-label="Cerrar configuración" title="Cerrar" on:click={() => dispatch("close")}>✕</button>
        </header>
        <div class="ja-settings-body">
            <nav class="ja-settings-nav" aria-label="Categorías de configuración">
                {#each sections as item}
                    <button type="button" aria-current={section===item.id ? "page" : undefined} on:click={() => (section=item.id)}>
                        <span aria-hidden="true">{item.symbol}</span><span>{item.name}</span>
                    </button>
                {/each}
            </nav>
            <main class="ja-settings-content">
                {#if section === "general"}
                    <h3>General</h3>
                    <p class="intro">Comportamiento y presentación de la consola. Estos ajustes no modifican lo que ya está proyectado.</p>
                    <div class="setting-row">
                        <div><strong>Interfaz compacta</strong><small>Reduce espacios en listas y controles. Conserva el diseño Gemini.</small></div>
                        <input type="checkbox" aria-label="Interfaz compacta" checked={compactUi}
                            on:change={(e) => dispatch("compactUiChange", {enabled:e.currentTarget.checked})}/>
                    </div>
                    <div class="setting-row">
                        <div><strong>Texto de interfaz ampliado</strong><small>Aumenta el tamaño del texto de navegación y de los controles de JA; no modifica diapositivas ni proyección.</small></div>
                        <input type="checkbox" aria-label="Texto de interfaz ampliado" checked={largeUi}
                            on:change={(e) => dispatch("largeUiChange", {enabled:e.currentTarget.checked})}/>
                    </div>
                    <div class="setting-row">
                        <div><strong>Estado del sistema</strong><small>Información del estado de guardado que proporciona el motor.</small></div>
                        <span class="state">{$saved ? "Guardado" : "Cambios pendientes"}</span>
                    </div>
                    <div class="setting-row">
                        <div><strong>Consola única</strong><small>JA Gemini es la única interfaz del operador. FreeShow permanece como motor interno.</small></div>
                        <span class="state">Activa</span>
                    </div>
                    <button class="setting-secondary" type="button" on:click={() => {
                        if (window.confirm("¿Restablecer la densidad, tamaño de texto y reproducción automática de Vista previa? No afecta Programa, archivos ni salidas.")) dispatch("resetPreferences")
                    }}>Restablecer preferencias de interfaz</button>
                {:else if section === "screens"}
                    <h3>Pantallas y salidas</h3>
                    <p class="intro">La laptop se reserva para controlar JA. Las salidas de proyección se activan únicamente en pantallas externas.</p>
                    <div class="status-counter">Salidas configuradas en JA: <strong>{configuredOutputs.length}</strong></div>
                    {#if configuredOutputs.length}
                        <div class="ja-settings-outputs">
                            {#each configuredOutputs as [id, output] (id)}
                                <button type="button" aria-pressed={selectedOutputId===id} disabled={!output.active || !output.screen || String(output.screen)===operatorDisplayId} on:click={() => dispatch("selectOutput",{id})}>
                                    <span>{output.name || "Salida " + id}</span>
                                    <small>{!output.screen ? "Sin monitor asignado" : String(output.screen)===operatorDisplayId ? "Bloqueada: monitor del operador" : output.active ? (selectedOutputId===id ? "Inspeccionada" : "Configurada") : "Inactiva"} · {id}</small>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <p class="info">Todavía no hay una salida de JA lista para inspeccionar.</p>
                    {/if}
                    <div class="setting-group">
                        <strong>Monitores detectados por Windows</strong>
                        <small>Detección real de Electron; no son salidas ficticias de JA.</small>
                        <div class="ja-settings-actions">
                            <button type="button" disabled={displaysLoading} on:click={() => void refreshWindowsDisplays()}>Actualizar detección</button>
                            <button type="button" disabled={!physicalDisplays.length} on:click={identifyWindowsDisplays}>Identificar pantallas</button>
                        </div>
                        {#if displaysError}<p class="info" role="alert">{displaysError}</p>{/if}
                        {#if displaysLoading}<p class="info">Consultando monitores de Windows…</p>{/if}
                        <div class="ja-settings-outputs" role="group" aria-label="Monitores físicos detectados">
                            {#each physicalDisplays as display, index (display.id)}
                                <button type="button" aria-pressed={!isOperatorDisplay(display) && selectedPhysicalDisplayId===String(display.id)}
                                    disabled={isOperatorDisplay(display)}
                                    title={isOperatorDisplay(display)?"Reservada permanentemente para la consola JA": "Seleccionar destino externo"}
                                    on:click={() => {if(!isOperatorDisplay(display))selectedPhysicalDisplayId=String(display.id)}}>
                                    <span>Pantalla {index+1} · {display.label||"Monitor sin modelo informado"}</span>
                                    <small>{display.bounds.width} × {display.bounds.height} · {isOperatorDisplay(display)?"LAPTOP · SOLO OPERADOR":display.internal?"Integrada":"Externa o virtual"} · ID {display.id}</small>
                                    <small>{isOperatorDisplay(display)?"No elegible para proyección":Object.values($outputs).find(o=>o.enabled&&String(o.screen)===String(display.id))?.name||"Sin salida JA asignada"}</small>
                                </button>
                            {/each}
                        </div>
                        {#if !displaysLoading && !physicalDisplays.length && !displaysError}
                            <p class="info">Windows no devolvió monitores. Comprueba la conexión y pulsa Actualizar detección.</p>
                        {/if}
                        <div class="ja-settings-actions">
                            <button type="button" disabled={!selectedPhysicalDisplayId || selectedPhysicalDisplayId===operatorDisplayId} on:click={activateSelectedDisplay}>Activar proyección en pantalla seleccionada</button>
                        </div>
                        <p class="info">Un solo botón: reutiliza una salida sin monitor, reactiva una existente o crea otra si es necesario. No cambia el contenido actual hasta que el operador lo envíe.</p>
                    </div>
                    <p class="info">La pantalla de la laptop está reservada. HDMI y spacedesk pueden activarse por separado. Verifica cada ventana física y su audio antes de usarla en un servicio; no se emite automáticamente a todas.</p>
                {:else if section === "libraries"}
                    <h3>Archivos y bibliotecas</h3>
                    <p class="intro">Vincula carpetas reales sin mover ni borrar archivos de origen.</p>
                    <div class="setting-group">
                        <strong>Multimedia</strong><small>{mediaFolderCount} carpeta(s) registradas</small>
                        <div class="ja-settings-actions">
                            <button type="button" on:click={() => dispatch("linkMedia")}>+ Vincular carpeta</button>
                            <button type="button" on:click={() => dispatch("refreshMedia")}>Actualizar biblioteca</button>
                        </div>
                    </div>
                    <div class="setting-group">
                        <strong>Himnario</strong><small>Colecciones diferenciadas de la biblioteca Multimedia</small>
                        <label for="ja-settings-hymn-collection">Colección</label>
                        <select id="ja-settings-hymn-collection" bind:value={hymnCollection}>
                            <option value="Himnario Adventista">Himnario Adventista</option>
                            <option value="Cantos Juveniles">Cantos Juveniles</option>
                        </select>
                        <div class="ja-settings-actions">
                            <button type="button" on:click={() => dispatch("linkHymn", {collection:hymnCollection})}>+ Vincular carpeta</button>
                            <button type="button" on:click={() => dispatch("refreshHymn")}>Actualizar himnario</button>
                        </div>
                    </div>
                    <div class="setting-group">
                        <strong>Biblias locales</strong><small>{localBibleCount} traducción(es) locales detectadas</small>
                        <div class="ja-settings-actions">
                            <button type="button" aria-pressed={$scriptureMode==="grid"} on:click={() => scriptureMode.set("grid")}>Cuadrícula</button>
                            <button type="button" aria-pressed={$scriptureMode==="list"} on:click={() => scriptureMode.set("list")}>Lista</button>
                        </div>
                        <p class="info">El editor de estilo bíblico se desarrollará dentro del módulo Biblia, no mezclado con la configuración general.</p>
                    </div>
                {:else if section === "playback"}
                    <h3>Audio y reproducción</h3>
                    <p class="intro">Preferencias locales de preparación. El audio público y el volumen de Programa permanecen bajo sus controles independientes.</p>
                    <div class="setting-row">
                        <div><strong>Reproducir automáticamente en Vista previa</strong><small>Al seleccionar un vídeo, se inicia silenciado de forma local. Desactivarlo no interrumpe Programa.</small></div>
                        <input type="checkbox" aria-label="Reproducir automáticamente en Vista previa" checked={previewAutoplay}
                            on:change={(e) => dispatch("previewAutoplayChange",{enabled:e.currentTarget.checked})}/>
                    </div>
                    <p class="info">Vista previa comienza siempre silenciada. El sonido local se habilita desde el control de audio de Vista previa. La configuración de dispositivos de audio por pantalla y aislamiento multipantalla sigue pendiente de pruebas físicas.</p>
                {:else if section === "branding"}
                    <h3>Logo y marca</h3>
                    <p class="intro">Configura una imagen que puedas mostrar u ocultar sobre Programa sin reemplazar el vídeo, el fondo o el audio.</p>
                    <div class="setting-group">
                        <strong>Imagen de logo</strong><small>{logoName}</small>
                        <div class="ja-settings-actions">
                            <button type="button" on:click={() => dispatch("chooseLogo")}>Elegir imagen…</button>
                            <button type="button" on:click={() => {
                                if(window.confirm("¿Volver al logo predeterminado JA? No se borrará el archivo original."))dispatch("resetLogo")
                            }}>Usar logo predeterminado</button>
                        </div>
                        <p class="info">Admite PNG con transparencia, JPG y WEBP. El botón Logo de la consola activa o retira la capa en la salida actual.</p>
                    </div>
                    <div class="setting-group">
                        <label for="ja-logo-position">Posición</label>
                        <select id="ja-logo-position" value={logoPosition} on:change={(event) => dispatch("logoPositionChange",{value:event.currentTarget.value})}>
                            <option value="center">Centro</option>
                            <option value="top-left">Superior izquierda</option>
                            <option value="top-right">Superior derecha</option>
                            <option value="bottom-left">Inferior izquierda</option>
                            <option value="bottom-right">Inferior derecha</option>
                        </select>
                        <label for="ja-logo-size">Tamaño relativo: {Math.round(logoScale*100)}%</label>
                        <input id="ja-logo-size" type="range" min="0.35" max="2.5" step="0.05" value={logoScale}
                            on:change={(event) => dispatch("logoScaleChange",{value:Number(event.currentTarget.value)})}/>
                    </div>
                    <p class="info">Los logos animados MP4/WEBM requerirán una capa de vídeo independiente, silenciosa y con repetición. El renderizador de efectos actual solo admite imágenes; no presentaremos el vídeo como logo hasta que funcione realmente.</p>
                {:else if section === "shortcuts"}
                    <h3>Atajos y ayuda</h3>
                    <p class="intro">Atajos disponibles en la consola Gemini. No interceptan la escritura en los campos de texto.</p>
                    <div class="shortcut-row"><strong>Ctrl + ,</strong><span>Abrir o cerrar Configuración JA</span></div>
                    <div class="shortcut-row"><strong>Esc</strong><span>Cerrar Configuración o salir de pantalla ampliada</span></div>
                    <div class="shortcut-row"><strong>◀ / ▶</strong><span>Preparar el versículo anterior/siguiente dentro de Biblia, sin alterar Programa</span></div>
                    <p class="info">Atajos y opciones adicionales se incorporarán únicamente con una acción verificada, no como controles decorativos.</p>
                {/if}
            </main>
        </div>
        <footer><button type="button" on:click={() => dispatch("close")}>Cerrar</button></footer>
    </section>
</div>

<style>
    .ja-settings-backdrop{position:absolute;inset:0;z-index:1000;background:rgba(2,8,24,.78);display:flex;align-items:center;justify-content:center;padding:16px;color:#edf5ff}
    .ja-settings-dialog{width:min(890px,100%);height:min(650px,92%);overflow:hidden;display:flex;flex-direction:column;border:1px solid #3d648a;border-radius:12px;background:#081732;box-shadow:0 22px 90px #020917}
    .ja-settings-header{display:flex;align-items:start;justify-content:space-between;gap:14px;border-bottom:1px solid #28456c;padding:17px 21px;background:#102447}
    .ja-settings-header h2{font-size:19px;font-weight:750;margin:0;color:#ffe000}
    .ja-settings-header p{font-size:12px;color:#bed2e9;margin:5px 0 0}
    .ja-settings-header button{font-size:18px;padding:3px 9px}
    .ja-settings-body{display:grid;grid-template-columns:210px minmax(0,1fr);min-height:0;flex:1}
    .ja-settings-nav{background:#101f3d;border-right:1px solid #294368;padding:12px 8px;display:flex;flex-direction:column;gap:5px;overflow-y:auto}
    .ja-settings-nav button{display:flex;align-items:center;gap:9px;text-align:left;width:100%;border:1px solid transparent!important;background:transparent!important}
    .ja-settings-nav button[aria-current="page"]{background:#1e466c!important;border-color:#4cd1fd!important}
    .ja-settings-nav span:first-child{width:16px;text-align:center;color:#ffe000}
    .ja-settings-content{overflow-y:auto;min-height:0;padding:24px;display:block}
    .ja-settings-content h3{font-size:18px;font-weight:750;margin:0 0 8px}
    .ja-settings-content .intro{font-size:12px;color:#b7c9e1;line-height:1.6;margin:0 0 20px}
    .setting-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:14px 0;border-bottom:1px solid #263e61}
    .setting-row div,.setting-group{display:flex;flex-direction:column;gap:5px}
    .setting-row strong,.setting-group strong{font-size:13px}
    .setting-row small,.setting-group small,.setting-group label{font-size:11px;color:#b7c9e1;line-height:1.5}
    .setting-row input{min-width:18px;height:18px;accent-color:#4cd1fd;cursor:pointer}
    .state,.status-counter{font-size:12px;color:#a7e5c4}
    .setting-group{padding:14px 0;border-bottom:1px solid #263e61}
    .setting-group select{max-width:240px}
    .ja-settings-actions{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:9px}
    .ja-settings-outputs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;margin-top:14px}
    .ja-settings-outputs button{display:flex;flex-direction:column;align-items:start;gap:5px;min-width:0}
    .ja-settings-outputs small{font-size:11px;color:#9edfc2;overflow:hidden;text-overflow:ellipsis}
    .info{font-size:12px!important;line-height:1.65!important;color:#a6bdd9;margin:15px 0 0}
    .shortcut-row{display:flex;gap:15px;align-items:center;border-bottom:1px solid #263e61;padding:14px 0;font-size:12px}
    .shortcut-row strong{min-width:86px;color:#ffe000}
    .ja-settings-dialog button,.ja-settings-dialog select{border:1px solid #456a94;background:#14375d;color:#fff;border-radius:7px;font-size:12px;padding:9px 11px;cursor:pointer}
    .ja-settings-dialog button:hover{border-color:#4cd1fd;background:#205078}
    .ja-settings-dialog button[aria-pressed="true"]{border-color:#f3bf2b;background:#4b3b16}
    .ja-settings-dialog button:disabled{opacity:.42;cursor:not-allowed}
    .setting-secondary{margin-top:19px}
    .ja-settings-dialog footer{display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid #28456c}
    @media(max-width:610px){.ja-settings-backdrop{padding:7px}.ja-settings-dialog{height:95%}.ja-settings-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.ja-settings-nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #294368}.ja-settings-nav button{white-space:nowrap;flex:none;width:auto}.ja-settings-content{padding:15px}.ja-settings-header{padding:13px}}
</style>
