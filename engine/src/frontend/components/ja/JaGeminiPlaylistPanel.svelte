<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import type { JAPlaylist, JAPlaylistEntry } from "../../utils/jaGeminiPlaylists"
    import JaGeminiPlaylistThumbnail from "./JaGeminiPlaylistThumbnail.svelte"
    export type LibraryItem = {path:string;name:string;source:"multimedia"|"himnario";kind:"video"|"audio"}
    export let playlists:JAPlaylist[]=[]
    export let libraryFiles:LibraryItem[]=[]
    export let selectedId=""
    export let runningPlaylistId=""
    export let runningIndex=-1
    export let running=false
    export let paused=false
    export let busy=false
    export let currentFile:{path:string;source:"multimedia"|"himnario";kind:"audio"|"video"}|null=null
    export let primaryLabel="Primario"
    export let outputChoices:Array<{id:string;name:string;primary:boolean}>=[]
    export let selectedTargets:string[]=[]
    let gridView=true
    const dispatch=createEventDispatcher()
    let name=""
    let youtubeUrl=""
    let search=""
    let category:"all"|"video"|"himnario"|"audio"="all"
    let chosen=new Set<string>()
    let shown=60
    let draggedIndex=-1
    let playlist:JAPlaylist|null=null
    $: playlist=playlists.find(x=>x.id===selectedId)||null
    const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    $: matches=libraryFiles.filter(f=>
        (category==="all"||(category==="himnario"?f.source==="himnario":category==="audio"?f.kind==="audio":f.kind==="video"&&f.source==="multimedia")) &&
        (!search.trim()||normalize(f.name).includes(normalize(search.trim()))))
    const action=(type:string,data:Record<string,unknown>={})=>dispatch("action",{type,...data})
    const kindName=(entry:JAPlaylistEntry)=>entry.kind==="youtube"?"YouTube":entry.source==="himnario"?"Himnario":entry.kind==="audio"?"Audio":"Video"
    const fileKey=(f:LibraryItem)=>f.source+"|"+f.path
    function chooseCategory(value:string){
        if(value==="all"||value==="video"||value==="himnario"||value==="audio")category=value
        shown=60
    }
    function dropAtEnd(event:DragEvent){onQueueDrop(event,playlist?.entries.length||0)}
    function toggleFile(f:LibraryItem){
        const next=new Set(chosen),key=fileKey(f)
        if(next.has(key))next.delete(key);else next.add(key)
        chosen=next
    }
    function addOne(f:LibraryItem){
        if(!playlist)return
        action("addFiles",{id:playlist.id,files:[{path:f.path,source:f.source}]})
    }
    function addChecked(){
        if(!playlist)return
        const files=libraryFiles.filter(f=>chosen.has(fileKey(f))).map(f=>({path:f.path,source:f.source}))
        if(files.length)action("addFiles",{id:playlist.id,files})
        chosen=new Set()
    }
    function addYoutube(){
        if(!youtubeUrl.trim())return
        action("addYoutube",{id:playlist?.id,url:youtubeUrl})
        youtubeUrl=""
    }
    function onLibraryDrag(event:DragEvent,f:LibraryItem){
        event.dataTransfer?.setData("text/plain",fileKey(f))
        if(event.dataTransfer)event.dataTransfer.effectAllowed="copy"
    }
    function onQueueDrop(event:DragEvent,to:number){
        event.preventDefault()
        if(!playlist)return
        const code=event.dataTransfer?.getData("text/plain")||""
        const file=libraryFiles.find(f=>fileKey(f)===code)
        if(file){addOne(file);draggedIndex=-1;return}
        if(draggedIndex>=0 && draggedIndex!==to)
            action("reorder",{id:playlist.id,from:draggedIndex,to})
        draggedIndex=-1
    }
</script>

<section class="ja-list-dock" role="dialog" aria-label="Centro de listas y reproducción" aria-modal="false">
    <header class="dock-top">
        <div>
            <strong>♫ Listas de reproducción</strong>
            <small>Biblioteca local, Himnario y YouTube · controles reales de FreeShow</small>
        </div>
        <button type="button" aria-label="Cerrar centro de listas" title="Cerrar" on:click={()=>action("close")}>✕</button>
    </header>
    <div class="dock-body">
        <aside class="dock-saved">
            <strong>Mis listas</strong>
            <form on:submit|preventDefault={()=>{if(name.trim()){action("create",{name});name=""}}}>
                <input aria-label="Nombre de la nueva lista" placeholder="Nueva lista…" maxlength="80" bind:value={name}/>
                <button type="submit" disabled={!name.trim()||playlists.length>=40}>+ Crear</button>
            </form>
            <div class="saved-scroll">
                {#each playlists as list (list.id)}
                    <button type="button" class:selected={list.id===selectedId} aria-pressed={list.id===selectedId}
                        on:click={()=>action("select",{id:list.id})}>
                        <span>{list.name}</span><small>{list.entries.length} elementos</small>
                    </button>
                {/each}
                {#if !playlists.length}<p>Crea una lista para empezar.</p>{/if}
            </div>
            <small>Guardadas localmente. Tus archivos originales no se modifican.</small>
        </aside>
        <section class="dock-library" aria-label="Biblioteca para agregar contenido">
            <div class="dock-section-head"><strong>Biblioteca</strong><small>{matches.length} resultados</small></div>
            <div class="dock-view-choice" role="group" aria-label="Vista de la biblioteca">
                <button type="button" aria-pressed={gridView} class:active={gridView} on:click={()=>gridView=true}>▦ Cuadrícula</button>
                <button type="button" aria-pressed={!gridView} class:active={!gridView} on:click={()=>gridView=false}>☷ Lista</button>
            </div>
            <input aria-label="Buscar cantos, videos o música" placeholder="⌕ Buscar archivos reales…" bind:value={search}
                on:input={()=>shown=60}/>
            <div class="dock-filter" role="group" aria-label="Filtrar biblioteca">
                {#each [{v:"all",n:"Todos"},{v:"video",n:"Videos"},{v:"himnario",n:"Himnario"},{v:"audio",n:"Audio"}] as item}
                    <button type="button" class:active={category===item.v} aria-pressed={category===item.v}
                        on:click={()=>chooseCategory(item.v)}>{item.n}</button>
                {/each}
            </div>
            <div class:dock-grid={gridView} class="dock-library-rows">
                {#each matches.slice(0,shown) as file (fileKey(file))}
                    <div class="dock-file" draggable="true" on:dragstart={e=>onLibraryDrag(e,file)}>
                        <input type="checkbox" aria-label={"Seleccionar "+file.name} checked={chosen.has(fileKey(file))}
                            on:change={()=>toggleFile(file)}/>
                        <JaGeminiPlaylistThumbnail path={file.path} kind={file.kind}/>
                        <div class="file-name" title={file.path}><strong>{file.name}</strong><small>{file.source==="himnario"?"Himnario":file.kind==="audio"?"Audio local":"Video local"}</small></div>
                        <button type="button" class="quick-add" title="Añadir a la lista" aria-label={"Añadir "+file.name}
                            disabled={!playlist||playlist.entries.length>=200} on:click={()=>addOne(file)}>+</button>
                    </div>
                {/each}
                {#if !matches.length}<p class="empty">No se encontraron archivos reales para este filtro.</p>{/if}
                {#if shown<matches.length}
                    <button type="button" class="show-more" on:click={()=>shown+=60}>Mostrar 60 más ({matches.length-shown} restantes)</button>
                {/if}
            </div>
            <footer class="dock-library-footer">
                <span>{chosen.size} seleccionados</span>
                <button type="button" disabled={!playlist||chosen.size===0} on:click={addChecked}>+ Añadir seleccionados</button>
            </footer>
        </section>
        <main class="dock-queue">
            {#if playlist}
                <div class="dock-section-head queue-head">
                    <div><strong>{playlist.name}</strong><small>{playlist.entries.length} pistas · Audio: {primaryLabel}</small></div>
                    <button type="button" class="delete" title="Eliminar lista" on:click={()=>{if(confirm("¿Eliminar esta lista?"))action("delete",{id:playlist.id})}}>Eliminar</button>
                </div>
                <div class="dock-playlist-targets" role="group" aria-label="Elegir pantallas de la lista">
                    <strong>Proyectar en</strong>
                    {#if outputChoices.length}
                        {#each outputChoices as target (target.id)}
                            <label title={target.primary?"Pantalla principal con audio":"Pantalla secundaria"}>
                                <input type="checkbox" checked={selectedTargets.includes(target.id)}
                                    on:change={e=>action("targets",{id:target.id,value:e.currentTarget.checked})}/>
                                {target.name}{target.primary?" · Principal":""}
                            </label>
                        {/each}
                    {:else}
                        <span role="status">Sin pantalla externa · reproducción local disponible</span>
                    {/if}
                </div>
                <div class="dock-quick-line">
                    <button type="button" disabled={!currentFile||playlist.entries.length>=200}
                        on:click={()=>action("addFile",{id:playlist.id})}>+ Añadir archivo preparado {currentFile?"("+currentFile.path.split(/[\/\\]/).pop()+")":""}</button>
                    <form on:submit|preventDefault={addYoutube}>
                        <input aria-label="Pegar URL de YouTube" placeholder="Pegar URL de YouTube" bind:value={youtubeUrl}/>
                        <button type="submit" disabled={!youtubeUrl.trim()||playlist.entries.length>=200}>+ YouTube</button>
                    </form>
                </div>
                <div class="dock-options">
                    <label><input type="checkbox" checked={playlist.autoNext}
                        on:change={e=>action("autoNext",{id:playlist.id,value:e.currentTarget.checked})}/> Siguiente automático</label>
                    <div class="play-modes" role="group" aria-label="Modo de reproducción, modificable durante la música">
                        {#each [{v:"normal",i:"☷",n:"Normal"},{v:"shuffle",i:"⤨",n:"Aleatorio"},
                            {v:"repeat-all",i:"↻",n:"Repetir lista"},{v:"repeat-one",i:"↻1",n:"Repetir canción"}] as mode}
                            <button type="button" class:active={playlist.playMode===mode.v}
                                aria-pressed={playlist.playMode===mode.v}
                                title={mode.n+" · cambiar sin detener la canción actual"} on:click={()=>action("playMode",{id:playlist.id,playMode:mode.v})}>
                                <span>{mode.i}</span><small>{mode.n}</small>
                            </button>
                        {/each}
                    </div>
                </div>
                <div class="dock-queue-list" role="list" on:dragover|preventDefault>
                    {#each playlist.entries as entry,index (entry.id)}
                        <article role="listitem" class:playing={running&&runningPlaylistId===playlist.id&&runningIndex===index}
                            draggable={!running} on:dragstart={()=>draggedIndex=index}
                            on:drop={e=>onQueueDrop(e,index)}>
                            <span class="queue-grip" aria-hidden="true">⠿</span>
                            <span class="queue-number">{index+1}</span>
                            {#if entry.kind==="video" || entry.kind==="audio"}
                                <JaGeminiPlaylistThumbnail path={entry.path} kind={entry.kind}/>
                            {/if}
                            <div class="queue-title" title={entry.path}><strong>{entry.title}</strong><small>{kindName(entry)}</small></div>
                            {#if entry.kind==="video"}
                                <label class="option-check" title="Solo audio: conserva Biblia, imágenes y videos en Programa">
                                    <input type="checkbox" checked={entry.audioOnly} disabled={running}
                                        on:change={e=>action("audioOnly",{id:playlist.id,entryId:entry.id,value:e.currentTarget.checked})}/> Solo audio
                                </label>
                                {#if !entry.audioOnly}
                                    <label class="option-check" title="Bucle de video independiente de repetir playlist">
                                        <input type="checkbox" checked={entry.loopVideo===true} disabled={running}
                                            on:change={e=>action("loopVideo",{id:playlist.id,entryId:entry.id,value:e.currentTarget.checked})}/> Bucle
                                    </label>
                                {/if}
                            {/if}
                            <div class="queue-actions">
                                <button type="button" disabled={busy} title="Reproducir desde este elemento" aria-label={"Reproducir "+entry.title}
                                    on:click={()=>action("play",{id:playlist.id,index})}>▶</button>
                                <button type="button" disabled={running||index===0} title="Subir" on:click={()=>action("move",{id:playlist.id,index,offset:-1})}>↑</button>
                                <button type="button" disabled={running||index===playlist.entries.length-1} title="Bajar" on:click={()=>action("move",{id:playlist.id,index,offset:1})}>↓</button>
                                <button type="button" disabled={running} title="Quitar" on:click={()=>action("remove",{id:playlist.id,entryId:entry.id})}>×</button>
                            </div>
                        </article>
                    {/each}
                    {#if !playlist.entries.length}
                        <p class="empty">Pulsa + en la biblioteca, arrastra una canción o selecciona varios archivos.</p>
                    {/if}
                    <div class="queue-drop-end" on:dragover|preventDefault on:drop={dropAtEnd}>
                        Soltar aquí para añadir archivos
                    </div>
                </div>
                <footer class="dock-transport">
                    <div class="transport-actions">
                        <button type="button" disabled={!playlist.entries.length||busy} class="primary"
                            on:click={()=>action("play",{id:playlist.id,index:0})}>▶ Reproducir</button>
                        <button type="button" disabled={!running||busy} title="Anterior" on:click={()=>action("previous")}>⏮</button>
                        <button type="button" disabled={!running||busy} title="Pausar o continuar" on:click={()=>action("togglePause")}>
                            {paused?"▶ Continuar":"Ⅱ Pausar"}
                        </button>
                        <button type="button" disabled={!running||busy} title="Siguiente" on:click={()=>action("next")}>⏭</button>
                        <button type="button" disabled={!running} on:click={()=>action("stop")}>■ Detener</button>
                    </div>
                    <small>{running&&runningPlaylistId===playlist.id
                        ? "En reproducción: "+(playlist.entries[runningIndex]?.title||"") : "Lista preparada"}</small>
                </footer>
            {:else}
                <div class="empty">Selecciona o crea una lista para añadir tus cantos.</div>
            {/if}
        </main>
    </div>
</section>

<style>
    .ja-list-dock{position:absolute;inset:auto 1% 1% 15.8%;height:min(62vh,690px);min-height:360px;max-height:calc(100% - 70px);z-index:55;
        display:flex;flex-direction:column;border:1px solid #496c98;border-radius:12px;box-shadow:0 18px 40px #000c;color:#eaf3ff;background:#0b1934;overflow:hidden;font-size:12px}
    button{border:1px solid #3b5b83;background:#19365b;color:white;padding:6px 9px;border-radius:6px;cursor:pointer;font-size:12px}
    button:disabled{opacity:.38;cursor:not-allowed}button:focus-visible{outline:2px solid #4cd1fd;outline-offset:1px}
    button:hover:not(:disabled){background:#285c88}
    input:not([type="checkbox"]){background:#0d2241;border:1px solid #3e5d84;border-radius:6px;color:white;padding:8px;min-width:0;width:100%;font-size:12px}
    input[type="checkbox"]{accent-color:#4cd1fd}
    .dock-top{padding:10px 14px;background:#15294c;border-bottom:1px solid #314e78;display:flex;justify-content:space-between;align-items:center}
    .dock-top strong{font-size:15px}.dock-top small{display:block;color:#afc7e4;font-size:10px;margin-top:3px}
    .dock-body{display:grid;grid-template-columns:minmax(145px,17%) minmax(240px,34%) minmax(0,1fr);flex:1;min-height:0}
    .dock-body>aside,.dock-body>section,.dock-body>main{min-width:0;min-height:0;padding:10px;display:flex;flex-direction:column;gap:8px}
    .dock-saved,.dock-library{border-right:1px solid #31476c}.dock-saved{background:#0f2140}
    .dock-saved form{display:flex;flex-direction:column;gap:5px}
    .dock-saved .saved-scroll{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:5px}
    .saved-scroll button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:2px;overflow-wrap:anywhere}
    .saved-scroll button.selected{background:#344967;border-color:#e3bd49}
    .saved-scroll small,.dock-saved>small{color:#a8bedb;font-size:10px}
    .dock-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
    .dock-section-head strong{font-size:13px}.dock-section-head small{display:block;font-size:10px;color:#afc5e1;margin-top:2px}
    .dock-filter{display:flex;gap:4px;flex-wrap:wrap}.dock-filter button{padding:5px 7px;font-size:10px}
    .dock-filter button.active,.play-modes button.active{background:#2169a5;border-color:#4cd1fd}
    .dock-library-rows{flex:1;overflow:auto;min-height:0;display:flex;flex-direction:column;gap:4px}
    .dock-library-rows.dock-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));align-content:start;gap:8px}
    .dock-library-rows.dock-grid .dock-file{flex-direction:column;align-items:stretch;position:relative;min-height:142px}
    .dock-library-rows.dock-grid .dock-file input[type="checkbox"]{position:absolute;left:9px;top:9px;z-index:2}
    .dock-library-rows.dock-grid .dock-file .file-name{width:100%}
    .dock-library-rows.dock-grid .dock-file .quick-add{position:absolute;right:8px;top:76px;background:#17446f}
    .dock-view-choice{display:flex;gap:5px}.dock-view-choice button{font-size:10px}
    .dock-view-choice button.active{border-color:#4cd1fd;background:#225687}
    .dock-playlist-targets{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid #345579;background:#0d2344;padding:7px;border-radius:7px}
    .dock-playlist-targets strong{font-size:11px;color:#cfeaff}.dock-playlist-targets label{display:flex;gap:4px;align-items:center;font-size:10px}
    .dock-playlist-targets span{color:#ffdf9b;font-size:11px}
    .dock-file{display:flex;align-items:center;gap:7px;border:1px solid #2c456b;background:#101f40;border-radius:6px;padding:6px;min-width:0}
    .file-name{flex:1;min-width:0}
    .file-name strong{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:11px}
    .file-name small{color:#a4bbda;font-size:10px}.dock-file button.quick-add{padding:2px 8px;font-weight:700;font-size:15px}
    .dock-library-footer{border-top:1px solid #324b70;padding-top:8px;display:flex;justify-content:space-between;gap:5px;align-items:center}
    .dock-library-footer span{font-size:10px;color:#afc7e5}.show-more{width:100%;font-size:11px}
    .queue-head .delete{background:transparent;color:#ffbdbd}
    .dock-quick-line{display:grid;grid-template-columns:1fr 1.3fr;gap:5px}
    .dock-quick-line button{font-size:10px}.dock-quick-line form{display:flex;gap:5px}
    .dock-options{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
    .dock-options label,.option-check{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:10px}
    .play-modes{display:flex;gap:4px;flex-wrap:wrap}
    .play-modes button{display:flex;gap:4px;align-items:center;font-size:10px;padding:4px 7px}
    .play-modes button span{font-size:16px}.play-modes button small{font-size:10px}
    .dock-queue-list{overflow:auto;flex:1;min-height:0;display:flex;flex-direction:column;gap:4px}
    .dock-queue-list article{display:flex;gap:7px;align-items:center;min-width:0;padding:7px;background:#112448;border:1px solid #304c77;border-radius:6px}
    .dock-queue-list article.playing{background:#2d3e52;border-color:#eed06a}
    .queue-grip{color:#7293c0;cursor:grab}.queue-number{font-variant-numeric:tabular-nums;color:#b8cee8;min-width:16px}
    .queue-title{flex:1;min-width:0}.queue-title strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .queue-title small{font-size:10px;color:#a6c0df}.queue-actions{display:flex;gap:3px}.queue-actions button{padding:4px 6px}
    .queue-drop-end{font-size:10px;color:#95b1d0;text-align:center;border:1px dashed #354e70;border-radius:5px;padding:6px}
    .dock-transport{display:flex;justify-content:space-between;gap:6px;align-items:center;border-top:1px solid #38547a;padding-top:9px;flex-wrap:wrap}
    .transport-actions{display:flex;gap:5px;flex-wrap:wrap}.dock-transport .primary{background:#896706;border-color:#d6ad37}
    .dock-transport small{font-size:10px;color:#b8cde7;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .empty{color:#b6c9e2;font-size:12px;line-height:1.5;padding:15px 5px}
    @media(max-width:1100px){
      .ja-list-dock{inset:auto 1% 1% 1%;height:min(70vh,730px)}
      .dock-body{grid-template-columns:145px minmax(195px,36%) minmax(0,1fr)}
      .dock-quick-line{grid-template-columns:1fr}
      .dock-queue-list article{flex-wrap:wrap}
    }
</style>