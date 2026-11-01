"use strict";
// C1: one Settings workspace; all mutations use validated main-process IPC.
(() => {
const api=window.jaDesktop;
if(!api)return;
let root=null,body=null,status=null,current=null,tab="pantallas",libraryCategory="Himnario Adventista",lastFocus=null,busy=false;
const tabs=[["pantallas","🖥 Pantallas y salidas"],["bibliotecas","📂 Bibliotecas"],["biblia","📖 Biblia"],["general","⚙ General"],["audio","🔊 Audio"],["ndi","📡 Red / NDI"],["diagnostico","🛠 Diagnóstico"]];
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;}
function add(parent,...children){parent.append(...children);return parent;}
function button(label,handler,extra=""){const b=el("button","js-button "+extra,label);b.type="button";b.addEventListener("click",()=>run(handler));return b;}
function card(){return el("section","js-card");}
function heading(title,description){add(body,el("h2","",title),el("p","js-muted",description));}
function label(text,control){const x=el("label","js-field",text);x.append(control);return x;}
function select(entries,value){
 const x=el("select");
 for(const [id,name] of entries){const o=el("option","",name);o.value=String(id);x.append(o);}
 x.value=String(value??"");return x;
}
function textInput(value,type="text"){const x=el("input");x.type=type;x.value=String(value??"");return x;}
function info(text){body.append(el("div","js-tip",text));}
function setStatus(text,error=false){if(status){status.textContent=text;status.classList.toggle("js-danger",error);}}
async function run(fn){
 if(busy)return;
 busy=true;
 try{await fn();}catch(err){setStatus("Error: "+String(err?.message||err),true);}
 finally{busy=false;}
}
async function refresh(){current=await api.config();}
function btnrow(...controls){return add(el("div","js-row"),...controls);}
function displayName(d){return (d.name||"Monitor") + " · "+d.size.width+"×"+d.size.height+(d.primary?" · Principal Windows":"");}
function ensureUi(){
 if(root)return;
 root=el("section");root.id="jaSettingsRoot";root.hidden=true;root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Configuración JA");
 const windowBox=el("div","js-window"),header=el("header","js-header");
 const title=el("div");add(title,el("strong","","Configuración · JA Proyecciones"),el("p","","Dispositivos, bibliotecas y preferencias reales"));
 header.append(title,button("✕ Cerrar",close,"js-close"));
 const contentArea=el("div","js-content"),nav=el("nav","js-nav");
 for(const [id,name] of tabs){
  const b=el("button","js-tab",name);b.type="button";b.dataset.tab=id;
  b.addEventListener("click",()=>run(async()=>{tab=id;await render();}));
  nav.append(b);
 }
 body=el("main","js-main");contentArea.append(nav,body);
 status=el("footer","js-status","Sin cambios");
 windowBox.append(header,contentArea,status);root.append(windowBox);document.body.append(root);
 root.addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();close();}});
}
async function open(requested="pantallas"){
 ensureUi();
 lastFocus=document.activeElement;
 tab=tabs.some(t=>t[0]===requested)?requested:"pantallas";
 root.hidden=false;
 setStatus("Leyendo configuración real…");
 try{await refresh();await render();root.querySelector(".js-close")?.focus();}
 catch(e){setStatus("Error al leer configuración: "+String(e?.message||e),true);}
}
function close(){
 if(root)root.hidden=true;
 if(lastFocus?.focus)lastFocus.focus();
}
async function render(){
 if(!current)await refresh();
 for(const b of root.querySelectorAll(".js-tab"))b.setAttribute("aria-selected",String(b.dataset.tab===tab));
 body.replaceChildren();
 if(tab==="pantallas")await screens();
 if(tab==="bibliotecas")await libraries();
 if(tab==="biblia")await bible();
 if(tab==="general")await general();
 if(tab==="audio"||tab==="ndi")await future();
 if(tab==="diagnostico")await diagnostics();
 if(current.health.status==="corrupt")setStatus("Ajustes dañados: revisa Diagnóstico para restaurar una copia",true);
 else setStatus("Configuración leída desde el motor JA · "+(current.screens.displays.length)+" monitor(es) Windows");
}
async function screens(){
 const cfg=current.settings,snapshot=current.screens,displays=snapshot.displays||[];
 heading("Pantallas y salidas","Estos son monitores detectados realmente por Windows. El monitor del operador nunca puede ser destino JA.");
 const list=card();
 const cap=btnrow(el("strong","","Inventario Windows"),button("↻ Actualizar",async()=>{await refresh();await render();}));
 list.append(cap);
 if(!displays.length)list.append(el("p","js-danger","Windows no informó monitores disponibles."));
 for(const d of displays){
  const row=el("div","js-row"),txt=el("div");
  add(txt,el("strong","",displayName(d)),el("p","js-path","ID Windows: "+d.id+" · posición "+d.bounds.x+","+d.bounds.y));
  const role=d.id===snapshot.operatorDisplayId?"Operador":d.id===cfg.mainDisplayId?"Principal JA":"No asignado";
  row.append(txt,el("span","js-badge",role));list.append(row);
 }
 body.append(list);
 if(snapshot.operatorNeedsReview)info("La pantalla de operador guardada no está conectada. JA usa temporalmente la pantalla principal de Windows para proteger la consola; revisa la asignación antes de proyectar.");
 if(cfg.mainDisplayId&&!displays.some(d=>d.id===cfg.mainDisplayId))info("La salida principal configurada está desconectada. JA no elegirá otro proyector automáticamente.");
 const form=card();form.append(el("h3","","Asignación de pantallas"));
 const operator=select(displays.map(d=>[d.id,displayName(d)]),snapshot.operatorDisplayId);
 const main=select([["","— Sin proyector principal —"],...displays.filter(d=>d.id!==operator.value).map(d=>[d.id,displayName(d)])],cfg.mainDisplayId);
 const mainHolder=label("Proyector principal JA",main);
 const assign=()=>{
  const prev=main.value;main.replaceChildren();
  const rows=[["","— Sin proyector principal —"],...displays.filter(d=>d.id!==operator.value).map(d=>[d.id,displayName(d)])];
  for(const [id,title]of rows){const o=el("option","",title);o.value=id;main.append(o);}
  main.value=rows.some(r=>r[0]===prev)?prev:"";
 };
 operator.addEventListener("change",assign);
 form.append(add(el("div","js-grid"),label("Pantalla del operador",operator),mainHolder));
 const sessions=current.sessions.filter(s=>s.state!=="empty");
 form.append(el("p","js-muted",current.sessions.length?"Hay "+current.sessions.length+" ventana(s) de salida abierta(s). Para reasignar pantallas debes cerrarlas explícitamente.":"Cambiar asignaciones no envía contenido ni abre ventanas."));
 if(current.sessions.length)form.append(button("Cerrar ventanas de salida (interrumpe proyección)",async()=>{
  if(!confirm("Se cerrarán todas las ventanas de proyección y se detendrán sus contenidos. ¿Continuar?"))return;
  await api.closeOutputsForSettings();await refresh();await render();
  setStatus("✓ Ventanas cerradas. Ahora puedes guardar la nueva asignación.");
 },"js-warn"));
 form.append(btnrow(button("Guardar asignación",async()=>{
  const response=await api.saveScreens({operatorDisplayId:operator.value,mainDisplayId:main.value,revision:cfg.revision});
  current=await api.config();
  window.dispatchEvent(new Event("ja:settings:screens-changed"));
  await render();setStatus("✓ Pantallas guardadas · revisión "+response.revision);
 },"js-primary"),button("Descartar cambios",async()=>{await refresh();await render();})));
 body.append(form);
 if(displays.length<2)info("Para proyectar contenido distinto, conecta una segunda pantalla, selecciona Win + P → Extender y vuelve a Actualizar. El modo Duplicar no crea destinos independientes.");
 info("Identificar visualmente cada proyector y administrar salidas auxiliares son tareas de la etapa S1. Aquí solo se guardan asignaciones que ya puede aplicar el motor actual.");
}
async function libraries(){
 heading("Bibliotecas y carpetas","Selecciona una colección, vincula carpetas externas y retíralas sin borrar ni mover tus archivos.");
 const collections=current.categories;
 const chooser=select(collections.map(x=>[x,x]),libraryCategory);
 if(!collections.includes(libraryCategory))libraryCategory=collections[0];
 chooser.value=libraryCategory;
 const container=card();container.append(label("Colección",chooser));body.append(container);
 chooser.addEventListener("change",()=>run(async()=>{libraryCategory=chooser.value;await render();}));
 const data=await api.library(libraryCategory);
 const mainFolder=(current.root.endsWith("\\")?current.root.slice(0,-1):current.root)+"\\"+libraryCategory;
 const summary=card();
 add(summary,el("h3","","Carpeta propia JA"),el("div","js-path",mainFolder),
  el("p","","Archivos encontrados: "+data.items.length+(data.truncated?" (lista limitada)":"")+". Las carpetas externas se consultan sin copiarlas."));
 summary.append(btnrow(button("+ Vincular otra carpeta",async()=>{
  const out=await api.selectFolder(libraryCategory);
  if(!out.cancelled){await refresh();await render();setStatus("✓ Carpeta vinculada a "+libraryCategory);
   window.dispatchEvent(new CustomEvent("ja:settings:folders-changed",{detail:{category:libraryCategory}}));}
 },"js-primary"),button("↻ Releer biblioteca",async()=>{await refresh();await render();})));
 body.append(summary);
 const list=card();list.append(el("h3","","Carpetas externas vinculadas"));
 const links=current.settings.linkedFolders[libraryCategory]||[];
 if(!links.length)list.append(el("p","js-muted","Esta colección todavía no tiene carpetas externas."));
 for(const folder of links){
  const row=el("div","js-row"),title=el("div");title.style.maxWidth="75%";
  title.append(el("p","js-path",folder));
  if(data.missing.some(x=>x.toLowerCase()===folder.toLowerCase()))title.append(el("p","js-danger","Carpeta no disponible"));
  row.append(title,button("Desvincular",async()=>{
   if(!confirm("¿Desvincular esta carpeta de "+libraryCategory+"? No se eliminará ningún archivo:\n"+folder))return;
   await api.unlinkFolder(libraryCategory,folder);await refresh();await render();setStatus("✓ Carpeta desvinculada; archivos originales intactos");
   window.dispatchEvent(new CustomEvent("ja:settings:folders-changed",{detail:{category:libraryCategory}}));
  },"js-warn"));
  list.append(row);
 }
 body.append(list);
}
async function bible(){
 heading("Biblia y apariencia","Estos valores son los mismos que usa el motor de proyección y el editor del módulo Biblia.");
 const style=await api.bibleStyle();
 const form=card(),grid=el("div","js-grid");
 const size=textInput(style.fontSize,"number");size.min="24";size.max="100";
 const font=select(["Georgia","Arial","Verdana","Tahoma","Times New Roman"].map(x=>[x,x]),style.fontFamily);
 const color=textInput(style.textColor,"color"),reference=textInput(style.referenceColor,"color");
 const align=select([["center","Centro"],["left","Izquierda"],["right","Derecha"]],style.textAlign);
 const plate=textInput(style.plateOpacity,"number");plate.min="0";plate.max="90";
 const bgRows=[["navy","Azul JA"],["black","Negro"],["gradient","Degradado"]];
 const backgrounds=await api.library("Fondos Personalizados");
 for(const f of backgrounds.items.filter(x=>[".jpg",".jpeg",".png",".webp"].includes(x.extension)))bgRows.push(["image:"+f.path,"🖼 "+f.name]);
 const bg=select(bgRows,style.background==="image"?"image:"+style.backgroundFile:style.background);
 const show=textInput("","checkbox");show.checked=style.showReference;
 add(grid,label("Tamaño del texto (24–100)",size),label("Tipografía",font),label("Color del texto",color),label("Color de referencia",reference),
 label("Alineación",align),label("Opacidad de placa (0–90)",plate),label("Fondo y fotografía",bg),label("Mostrar referencia",show));
 form.append(grid);
 form.append(btnrow(button("Guardar estilo bíblico",async()=>{
  const target=bg.value.startsWith("image:")?"image":"";
  const updated=await api.saveBibleStyle({fontSize:Number(size.value),fontFamily:font.value,textColor:color.value,
   referenceColor:reference.value,textAlign:align.value,plateOpacity:Number(plate.value),
   background:target||bg.value,backgroundFile:target?bg.value.slice(6):"",showReference:show.checked});
  current=await api.config();window.dispatchEvent(new Event("ja:settings:bible-changed"));
  await render();setStatus("✓ Estilo bíblico guardado y aplicado al motor");
 },"js-primary"),button("+ Vincular fondos",async()=>{
  const result=await api.selectFolder("Fondos Personalizados");if(!result.cancelled){await refresh();await render();setStatus("✓ Fondos vinculados");}
 })));
 body.append(form);
 const transition=await api.bibleTransition();
 const transCard=card();
 transCard.append(el("h3","","Transición al cambiar versículo en pantallas activas"));
 const transMode=select([["fade","Fundido suave"],["cut","Corte inmediato"]],transition.type);
 const transDuration=textInput(transition.durationMs||320,"number");transDuration.min="120";transDuration.max="1200";transDuration.step="40";
 const applyState=()=>{transDuration.disabled=transMode.value==="cut";};
 transMode.addEventListener("change",applyState);applyState();
 transCard.append(add(el("div","js-grid"),label("Efecto",transMode),label("Duración del fundido (ms)",transDuration)));
 transCard.append(btnrow(button("Guardar transición",async()=>{
  const chosen={type:transMode.value,durationMs:transMode.value==="cut"?0:Number(transDuration.value)};
  await api.saveBibleTransition(chosen);
  await refresh();await render();window.dispatchEvent(new Event("ja:settings:transition-changed"));
  setStatus("✓ Transición bíblica guardada para las salidas activas");
 },"js-primary")));
 body.append(transCard);
 info("El Fundido cambia solamente texto/referencia y conserva fondo, música y sesiones de otras pantallas. La transición de video e imágenes se habilitará tras las pruebas del módulo L1.");
}
async function general(){
 heading("General","Información auténtica de la aplicación y su almacenamiento.");
 const c=card();add(c,el("h3","","Versión instalada"),el("p","",current.version),
  el("h3","","Directorio de datos del usuario"),el("p","js-path",current.root),
  el("p","","JA no borra ni mueve los archivos multimedia que vinculas."));
 body.append(c);
 info("Idioma, perfiles de servicio y apertura automática de proyectos pertenecen a la fase P1. Ningún proyecto se proyecta al iniciar.");
}
async function future(){
 const audio=tab==="audio";
 heading(audio?"Audio y dispositivos":"Red y NDI",audio?"Gestión de rutas, dispositivos de salida y monitorización.":"Emisión de video a destinos de red como OBS mediante NDI.");
 const c=card();
 c.append(el("h3","",audio?"Etapa A1 — pendiente":"Etapa N1 — pendiente"));
 c.append(el("p","",audio?
 "Hoy existe volumen por salida y silencio predeterminado en auxiliares, pero aún no hay selección fiable del dispositivo físico, medidor real ni modos Solo video/Solo audio. No aparecerán controles falsos.":
 "NDI no se considera una pantalla HDMI. El emisor, configuración de red, resolución, FPS y diagnósticos requieren un adaptador real y pruebas con receptor."));
 body.append(c);
}
async function diagnostics(){
 heading("Diagnóstico y recuperación","Estado real de Windows y del archivo de preferencias; no se inventan métricas de audio.");
 const c=card(),health=current.health,statusName=health.status==="ok"?"Correcta":health.status==="new"?"Sin archivo previo":"Dañada";
 add(c,el("h3","","Preferencias locales"),el("p","",statusName),
  el("p","js-muted","Copia anterior disponible: "+(health.backupAvailable?"Sí":"No")),
  el("h3","","Pantallas Windows"),el("p","",current.screens.displays.length+" detectadas · "+current.sessions.length+" ventana(s) de proyección creada(s)"),
  el("h3","","Configuración"),el("p","","Versión del esquema: "+current.settings.configVersion+" · revisión "+current.settings.revision));
 if(health.status==="corrupt"&&health.backupAvailable)c.append(button("Restaurar copia anterior",async()=>{
  if(!confirm("Se conservará el archivo dañado y se restaurará el último respaldo válido. ¿Continuar?"))return;
  await api.recoverConfig();await refresh();await render();setStatus("✓ Respaldo restaurado; comprueba pantallas y bibliotecas");
 },"js-warn"));
 body.append(c);
 const sessions=card();sessions.append(el("h3","","Sesiones de proyección"));
 if(!current.sessions.length)sessions.append(el("p","js-muted","No hay ventanas de proyección abiertas."));
 for(const s of current.sessions)sessions.append(el("p","",s.displayId+" · "+s.kind+" · "+s.state+" · "+s.title));
 body.append(sessions);
}
window.jaSettingsCenter=Object.freeze({open,close});
})();