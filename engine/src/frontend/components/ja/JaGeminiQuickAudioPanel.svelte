<script lang="ts">
 import {createEventDispatcher} from "svelte"
 export let files:Array<{path:string;name:string;source:"multimedia"|"himnario";kind:"video"|"audio"}>=[]
 export let currentPath=""
 export let busy=false
 const dispatch=createEventDispatcher()
 let search=""
 let shown=40
 const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 $: results=files.filter(f=>norm(f.name).includes(norm(search.trim())))
</script>
<section class="ja-global-music-panel" role="dialog" aria-label="Reproductor de música de fondo">
 <header>
  <div><strong>♫ Música de fondo</strong><small>Solo audio sin cambiar Biblia, imágenes o videos en Programa</small></div>
  <button type="button" aria-label="Cerrar música" on:click={()=>dispatch("close")}>✕</button>
 </header>
 <input aria-label="Buscar pistas para solo audio" placeholder="Buscar cantos, videos o MP3…" bind:value={search}
    on:input={()=>shown=40}/>
 <div class="music-results">
  {#each results.slice(0,shown) as file (file.source+"|"+file.path)}
   <div class="music-row">
    <span aria-hidden="true">{file.kind==="audio"?"♫":"▶"}</span>
    <div><strong title={file.path}>{file.name}</strong><small>{file.source==="himnario"?"Himnario":file.kind==="audio"?"Audio local":"Video local"}</small></div>
    <button type="button" disabled={busy} on:click={()=>dispatch("play",{path:file.path})}
      aria-label={"Escuchar "+file.name+" sin video"}>▶</button>
   </div>
  {/each}
  {#if !results.length}<p>No se encontraron archivos reales. Vincula primero tus carpetas.</p>{/if}
  {#if shown<results.length}<button type="button" on:click={()=>shown+=40}>Mostrar más</button>{/if}
 </div>
 <footer><span title={currentPath}>{currentPath?"♫ "+currentPath.split(/[\/\\]/).pop():"Sin música activa"}</span>
  <button type="button" disabled={!currentPath} on:click={()=>dispatch("stop")}>■ Detener</button>
 </footer>
 <small>El sonido sale por el dispositivo configurado en Windows. No cambia las pantallas.</small>
</section>
<style>
 .ja-global-music-panel{position:absolute;bottom:48px;right:14px;z-index:62;width:min(410px,94%);height:min(470px,72vh);
 display:flex;flex-direction:column;gap:8px;padding:12px;color:#eff6ff;background:#0c1c3b;border:1px solid #5b81ab;border-radius:10px;
 box-shadow:0 14px 34px #000c;font-size:12px}
 header{display:flex;justify-content:space-between;align-items:flex-start;gap:7px}
 header strong{font-size:14px}header small{display:block;color:#b6cbe9;font-size:10px;margin-top:4px}
 button{background:#1b496f;border:1px solid #5481a6;color:#fff;padding:5px 9px;border-radius:6px;cursor:pointer}
 button:disabled{opacity:.4;cursor:not-allowed}button:focus-visible{outline:2px solid #4cd1fd}
 input{width:100%;min-width:0;padding:8px;background:#112949;border:1px solid #4e7398;border-radius:6px;color:white}
 .music-results{overflow:auto;display:flex;flex-direction:column;gap:4px;min-height:0;flex:1}
 .music-row{display:flex;align-items:center;gap:8px;border:1px solid #294d71;background:#122a4b;padding:6px;border-radius:6px}
 .music-row>span{color:#f3cc6e;font-size:17px}.music-row>div{flex:1;min-width:0}
 .music-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
 .music-row small{font-size:10px;color:#a8c3e2}
 footer{display:flex;gap:7px;justify-content:space-between;align-items:center;border-top:1px solid #38587a;padding-top:8px}
 footer span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 section>small{font-size:10px;color:#b4c9e6}
</style>