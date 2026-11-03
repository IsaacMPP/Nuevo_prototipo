<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import type { JAPlaylist, JAPlaylistEntry } from "../../utils/jaGeminiPlaylists"
    export let playlists: JAPlaylist[] = []
    export let selectedId = ""
    export let runningPlaylistId = ""
    export let runningIndex = -1
    export let running = false
    export let busy = false
    export let currentFile: {path:string;source:"multimedia"|"himnario";kind:"audio"|"video"}|null = null
    export let primaryLabel = "Primario"
    const dispatch=createEventDispatcher()
    let newName=""
    let youtubeUrl=""
    let error=""
    let current:JAPlaylist|null=null
    $: current=playlists.find(p=>p.id===selectedId) || null
    const action=(type:string,data:Record<string,unknown>={})=>dispatch("action",{type,...data})
    function addYoutube(){
        if(!youtubeUrl.trim()){error="Pega un enlace real de YouTube.";return}
        action("addYoutube",{url:youtubeUrl})
        youtubeUrl=""
        error=""
    }
    const label=(entry:JAPlaylistEntry)=>entry.kind==="youtube"?"YouTube":
        entry.source==="himnario"?"Himnario":entry.kind==="audio"?"Audio local":"Video local"
</script>

<section class="playlist-panel" role="dialog" aria-label="Administrador de listas de reproducción" aria-modal="true">
    <header class="playlist-top">
        <div>
            <strong><span aria-hidden="true">♫ </span>Listas de reproducción</strong>
            <small>Multimedia + Himnario + YouTube · Reproductores reales de FreeShow</small>
        </div>
        <button type="button" class="playlist-close" aria-label="Cerrar listas" on:click={() => action("close")}>✕</button>
    </header>
    <div class="playlist-body">
        <aside class="playlist-side">
            <label for="jaPlaylistNewName">Nueva lista</label>
            <form on:submit|preventDefault={() => {if(newName.trim()){action("create",{name:newName});newName=""}}}>
                <input id="jaPlaylistNewName" placeholder="Ej. Cantos de apertura" maxlength="80" bind:value={newName}/>
                <button type="submit" disabled={!newName.trim()||playlists.length>=40}>+ Crear</button>
            </form>
            <div class="playlist-saved">
                {#each playlists as list (list.id)}
                    <button type="button" class:selected={list.id===selectedId}
                        aria-pressed={list.id===selectedId}
                        on:click={() => action("select",{id:list.id})}>
                        <span>{list.name}</span><small>{list.entries.length} archivos</small>
                    </button>
                {/each}
                {#if !playlists.length}
                    <p>Crea una lista para organizar los cantos y medios del programa.</p>
                {/if}
            </div>
            <p class="playlist-note">Se guardan en esta computadora. Los archivos no se copian ni se modifican.</p>
        </aside>
        <main class="playlist-main">
            {#if current}
                <div class="playlist-name">
                    <div><strong>{current.name}</strong><small>{current.entries.length} elementos · Salida de audio: {primaryLabel}</small></div>
                    <button type="button" class="danger-link" on:click={() => {if(confirm("¿Eliminar esta lista guardada?"))action("delete",{id:current.id})}}>Eliminar lista</button>
                </div>
                <div class="playlist-add">
                    <button type="button" disabled={!currentFile||current.entries.length>=200}
                        on:click={() => action("addFile",{id:current.id})}>
                        + Añadir archivo preparado {currentFile?"("+currentFile.path.split(/[\/\\]/).pop()+")":""}
                    </button>
                    <form on:submit|preventDefault={addYoutube}>
                        <input aria-label="Enlace de YouTube" placeholder="Pegar URL de YouTube" bind:value={youtubeUrl}/>
                        <button type="submit" disabled={current.entries.length>=200}>+ YouTube</button>
                    </form>
                </div>
                {#if error}<small class="playlist-error">{error}</small>{/if}
                <div class="playlist-options">
                    <label><input type="checkbox" checked={current.autoNext}
                        on:change={e=>action("autoNext",{id:current.id,value:e.currentTarget.checked})}/> Reproducir siguiente automáticamente</label>
                    <div class="playlist-modes" role="group" aria-label="Modo de reproducción">
                        {#each [
                            {id:"normal",label:"Normal",icon:"☷"},
                            {id:"shuffle",label:"Aleatorio",icon:"🔀"},
                            {id:"repeat-all",label:"Repetir lista",icon:"🔁"},
                            {id:"repeat-one",label:"Repetir canción",icon:"🔂"}
                        ] as playbackMode (playbackMode.id)}
                            <button type="button" class:active={current.playMode===playbackMode.id}
                                aria-pressed={current.playMode===playbackMode.id} title={playbackMode.label}
                                on:click={()=>action("playMode",{id:current.id,playMode:playbackMode.id})}>{playbackMode.icon} {playbackMode.label}</button>
                        {/each}
                    </div>
                </div>
                <div class="playlist-list" role="list">
                    {#each current.entries as entry, index (entry.id)}
                        <article class:playing={running&&runningPlaylistId===current.id&&runningIndex===index} role="listitem">
                            <span class="playlist-order">{index+1}</span>
                            <div class="playlist-entry-title"><strong title={entry.path}>{entry.title}</strong><small>{label(entry)}</small></div>
                            {#if entry.kind==="video"}
                                <label class="playlist-audio-toggle" title="Reproducir únicamente sonido, conservando imágenes y versículos">
                                    <input type="checkbox" checked={entry.audioOnly}
                                        on:change={e=>action("audioOnly",{id:current.id,entryId:entry.id,value:e.currentTarget.checked})}/>
                                    Solo audio
                                </label>
                                {#if !entry.audioOnly}
                                    <label class="playlist-audio-toggle" title="Bucle del video proyectado, independiente de repetir lista">
                                        <input type="checkbox" checked={entry.loopVideo===true}
                                            on:change={e=>action("loopVideo",{id:current.id,entryId:entry.id,value:e.currentTarget.checked})}/> Bucle video
                                    </label>
                                {/if}
                            {:else if entry.kind==="audio"}
                                <span class="playlist-audio-note">Solo audio</span>
                            {:else}
                                <span class="playlist-audio-note">Video visible</span>
                            {/if}
                            <div class="playlist-entry-actions">
                                <button type="button" aria-label={"Reproducir "+entry.title} disabled={busy} title="Iniciar desde aquí"
                                    on:click={() => action("play",{id:current.id,index})}>▶</button>
                                <button type="button" aria-label={"Subir "+entry.title} disabled={index===0||busy}
                                    on:click={() => action("move",{id:current.id,index,offset:-1})}>↑</button>
                                <button type="button" aria-label={"Bajar "+entry.title} disabled={index===current.entries.length-1||busy}
                                    on:click={() => action("move",{id:current.id,index,offset:1})}>↓</button>
                                <button type="button" aria-label={"Quitar "+entry.title} disabled={busy}
                                    on:click={() => action("remove",{id:current.id,entryId:entry.id})}>✕</button>
                            </div>
                        </article>
                    {/each}
                    {#if !current.entries.length}<p class="playlist-empty">Prepara un video, himno o audio y pulsa «Añadir archivo preparado», o pega un enlace de YouTube.</p>{/if}
                </div>
                <footer class="playlist-footer">
                    <button type="button" class="primary" disabled={!current.entries.length||busy}
                        on:click={() => action("play",{id:current.id,index:0})}>▶ Reproducir lista</button>
                    <button type="button" disabled={!running||busy} title="Anterior" on:click={() => action("previous")}>⏮ Anterior</button>
                    <button type="button" disabled={!running||busy} title="Reproducir o pausar" on:click={() => action("togglePause")}>⏯ Pausar / Continuar</button>
                    <button type="button" disabled={!running||busy} on:click={() => action("next")}>Siguiente ⏭</button>
                    <button type="button" disabled={!running} on:click={() => action("stop")}>■ Detener lista</button>
                </footer>
                <small class="playlist-explain">«Solo audio» funciona con archivos locales de video e himnos: no cambia lo proyectado. YouTube se reproduce con su video visible y requiere conexión; algunos videos pueden bloquear la reproducción automática.</small>
            {:else}
                <p class="playlist-empty">Selecciona una lista o crea una nueva.</p>
            {/if}
        </main>
    </div>
</section>

<style>
    .playlist-panel{position:absolute;z-index:55;inset:5% 6%;background:#0c1934;color:#eaf4ff;border:1px solid #43628e;border-radius:12px;box-shadow:0 16px 55px #000c;display:flex;flex-direction:column;font-size:12px;overflow:hidden}
    .playlist-top{padding:13px 18px;display:flex;align-items:center;justify-content:space-between;background:#152849;border-bottom:1px solid #304f7d}
    .playlist-top strong{font-size:16px}.playlist-top small{display:block;color:#b1cae8;margin-top:4px}
    button{border:1px solid #42648a;color:white;background:#1e3b61;border-radius:6px;padding:6px 9px;cursor:pointer}
    button:hover:not(:disabled){background:#286394}button:disabled{opacity:.4;cursor:not-allowed}button:focus-visible{outline:2px solid #4cd1fd}
    .playlist-close{font-size:15px}.playlist-body{display:grid;grid-template-columns:minmax(170px,24%) minmax(0,1fr);min-height:0;flex:1}
    .playlist-side{background:#101e3c;border-right:1px solid #314e76;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0}
    input:not([type="checkbox"]){min-width:0;width:100%;padding:8px;border:1px solid #42648a;border-radius:6px;color:white;background:#09162f}
    .playlist-side form{display:flex;flex-direction:column;gap:6px}
    .playlist-saved{overflow:auto;min-height:0;flex:1;display:flex;flex-direction:column;gap:6px}
    .playlist-saved button{text-align:left;display:flex;flex-direction:column;gap:3px;overflow-wrap:anywhere}
    .playlist-saved button.selected{border-color:#f1ca58;background:#344a68}
    .playlist-saved small,.playlist-note,.playlist-name small{font-size:10px;color:#b4c9e5}
    .playlist-note{line-height:1.5}.playlist-main{padding:15px;display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0}
    .playlist-name{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    .playlist-name strong{font-size:16px}.playlist-name small{display:block;margin-top:4px}
    .danger-link{background:transparent;color:#f0adad}.playlist-add{display:grid;grid-template-columns:1fr 1.5fr;gap:9px}
    .playlist-add form{display:flex;gap:7px;min-width:0}.playlist-add form button{white-space:nowrap}
    .playlist-options{display:flex;flex-wrap:wrap;gap:12px;color:#d9e5fa;align-items:center}.playlist-options label,.playlist-audio-toggle{display:flex;align-items:center;gap:6px}
    .playlist-modes{display:flex;align-items:center;flex-wrap:wrap;gap:5px}
    .playlist-modes button{padding:5px 8px;font-size:11px;background:#152c50}
    .playlist-modes button.active{border-color:#4cd1fd;background:#22649b;color:#fff}
    input[type="checkbox"]{accent-color:#4cd1fd}.playlist-list{flex:1;overflow:auto;min-height:80px;display:flex;flex-direction:column;gap:6px}
    .playlist-list article{display:flex;align-items:center;gap:10px;padding:9px;background:#101f40;border:1px solid #294774;border-radius:8px}
    .playlist-list article.playing{border-color:#f1bd28;background:#23304a}
    .playlist-order{min-width:19px;font-variant-numeric:tabular-nums;color:#c8d8eb}
    .playlist-entry-title{min-width:0;flex:1}.playlist-entry-title strong{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
    .playlist-entry-title small{font-size:10px;color:#adc3e0}.playlist-audio-toggle{white-space:nowrap}.playlist-audio-note{font-size:10px;color:#9fb8da;white-space:nowrap}
    .playlist-entry-actions{display:flex;gap:4px}.playlist-entry-actions button{padding:4px 7px}
    .playlist-footer{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid #304f77;padding-top:9px}
    .playlist-footer .primary{background:#9b7409;border-color:#dfac25}
    .playlist-empty,.playlist-explain{color:#bfd1e9;line-height:1.5}.playlist-error{color:#ff9d9d}
    @media(max-width:1000px){.playlist-panel{inset:3% 2%}.playlist-body{grid-template-columns:175px minmax(0,1fr)}.playlist-add{grid-template-columns:1fr}.playlist-list article{flex-wrap:wrap}}
</style>
