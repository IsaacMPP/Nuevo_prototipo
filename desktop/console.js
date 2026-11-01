"use strict";
(() => {
const api=window.jaDesktop;
const $=id=>document.getElementById(id);
const state={module:"hymns",items:[],chosen:null,bibles:[],bible:null,structure:null,chapter:null,bookIndex:0,chapterIndex:0,verseIndex:0,preview:null,displays:[],operator:"",main:"",target:"",outputs:[]};
function notice(text){
  const el=$("message");el.textContent=String(text);el.hidden=false;
  clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.hidden=true,4000);
}
async function execute(cb){try{return await cb();}catch(error){notice("Error: "+String(error?.message||error));return null;}}
function node(tag,classes,text){const n=document.createElement(tag);if(classes)n.className=classes;if(text!==undefined)n.textContent=text;return n;}
function empty(where,info){where.replaceChildren(node("div","empty",info));}
function selectedDestination(){if(!state.target)throw Error("Configura una salida HDMI en Pantallas");return state.target;}
function category(){return ({hymns:"Himnario Adventista",youth:"Cantos Juveniles",media:$("mediaType").value})[state.module];}
async function refreshDisplays(){
  const r=await api.displays();state.displays=r.displays;state.operator=r.operatorDisplayId;state.main=r.mainDisplayId;
  const external=r.displays.filter(d=>d.id!==state.operator);
  if(!external.some(d=>d.id===state.target))state.target=external.some(d=>d.id===state.main)?state.main:"";
  const label=external.length===0?"Conecta un monitor externo":external.length+" salida(s) física(s) disponible(s)";
  $("displayStatus").textContent=label;
  $("programBadge").textContent=state.target?external.find(d=>d.id===state.target)?.name||"Proyector":"Sin salida";
  await refreshProjection();
}
async function refreshProjection(){
  state.outputs=await api.projectionState();
  const output=state.outputs.find(s=>s.displayId===state.target);
  const program=$("program");
  if(!output){empty(program,"La salida está vacía. Prepara contenido y selecciona «Enviar a proyección».");return;}
  const wrapper=node("div","empty");
  wrapper.append(node("div","largeIcon",output.kind==="verse"?"▣":output.kind==="video"?"▶":"▤"));
  wrapper.append(node("div","",output.title||"Sin contenido"));
  wrapper.append(node("p","muted","Estado: "+output.state+(output.muted?" · Silenciado":" · Audio activo")));
  if(output.message)wrapper.append(node("p","muted","Error: "+output.message));
  program.replaceChildren(wrapper);
}
function previewVerse(){
  const selected=state.chapter?.verses[state.verseIndex];
  if(!selected)return;
  state.preview={kind:"verse",bible:state.bible?.path,book:state.bookIndex,chapter:state.chapterIndex,verse:state.verseIndex};
  const wrapper=node("div","verse");const q=node("blockquote","",selected.text),ref=node("small","",state.chapter.reference+":"+selected.number);
  wrapper.append(q,ref);$("preview").replaceChildren(wrapper);
}
async function chooseBible(){
  const select=$("bibleSelect");state.bible=state.bibles.find(b=>b.path===select.value)||null;
  state.structure=null;state.chapter=null;state.preview=null;
  if(!state.bible){$("bookSelect").replaceChildren();$("chapterSelect").replaceChildren();$("verseSelect").replaceChildren();empty($("preview"),"Importa una Biblia compatible para comenzar.");return;}
  const structure=await api.bibleStructure(state.bible.path);
  state.structure=structure;
  fillSelect($("bookSelect"),structure.books.map(x=>({value:x.index,label:x.name})));
  state.bookIndex=0;await chooseBook();
}
function fillSelect(select,entries){
  select.replaceChildren();
  for(const entry of entries){const opt=node("option");opt.value=String(entry.value);opt.textContent=entry.label;select.append(opt);}
}
async function chooseBook(){
  state.bookIndex=Number($("bookSelect").value)||0;const b=state.structure?.books[state.bookIndex];
  fillSelect($("chapterSelect"),Array.from({length:b?.chapters||0},(_,index)=>({value:index,label:String(index+1)})));
  state.chapterIndex=0;await chooseChapter();
}
async function chooseChapter(){
  if(!state.bible)return;
  state.chapterIndex=Number($("chapterSelect").value)||0;
  state.chapter=await api.bibleChapter(state.bible.path,state.bookIndex,state.chapterIndex);
  fillSelect($("verseSelect"),state.chapter.verses.map((x,index)=>({value:index,label:String(x.number)})));
  state.verseIndex=0;previewVerse();
}
function shiftVerse(amount){
  if(state.module!=="bible"||!state.chapter)return;
  const next=state.verseIndex+amount;
  if(next<0||next>=state.chapter.verses.length)return;
  state.verseIndex=next;$("verseSelect").value=String(next);previewVerse();
}
async function refreshBibles(){
  state.bibles=await api.bibles();
  const prior=state.bible?.path;
  fillSelect($("bibleSelect"),state.bibles.map(b=>({value:b.path,label:b.name})));
  if(prior&&state.bibles.some(x=>x.path===prior))$("bibleSelect").value=prior;
  await chooseBible();
}
function supported(file){return [".mp4",".webm",".mp3",".wav",".ogg",".m4a",".jpg",".jpeg",".png",".webp",".gif"].includes(file.extension);}
async function previewFile(item){
  state.chosen=item;
  state.preview={kind:"media",file:item.path};
  const url=await api.mediaUrl(item.path),display=$("preview");
  let element;
  if([".mp4",".webm"].includes(item.extension)){
    element=node("video");element.controls=true;element.muted=true;element.playsInline=true;element.src=url;
  } else if([".mp3",".wav",".ogg",".m4a"].includes(item.extension)){
    element=node("audio");element.controls=true;element.muted=true;element.src=url;
  } else if([".jpg",".jpeg",".png",".webp",".gif"].includes(item.extension)){
    element=node("img");element.src=url;element.alt=item.name;
  } else {state.preview=null;empty(display,"El formato necesita conversión a MP4 H.264 o WebM.");return;}
  display.replaceChildren(element);
  drawFiles();
}
function drawFiles(){
  const query=$("search").value.trim().toLocaleLowerCase("es");
  const found=state.items.filter(x=>x.name.toLocaleLowerCase("es").includes(query));
  const list=$("fileList");list.replaceChildren();
  if(!found.length)empty(list,"Sin resultados. Vincula una carpeta o copia archivos a tu biblioteca.");
  for(const item of found.slice(0,250)){
    const button=node("button","item"+(state.chosen?.path===item.path?" active":""),item.name);
    button.type="button";
    button.append(node("small","",supported(item)?"Vista previa · "+item.extension:"Requiere conversión · "+item.extension));
    button.addEventListener("click",()=>execute(()=>previewFile(item)));
    list.append(button);
  }
}
async function refreshFiles(){
  state.chosen=null;state.preview=null;
  const group=category(),library=await api.library(group);
  state.items=library.items;
  $("libraryInfo").textContent=library.items.length+" archivo(s) · "+group;
  $("libraryFootnote").textContent=(library.missing.length?"Carpetas no conectadas: "+library.missing.length+". ":"")+(library.truncated?"Se muestran los primeros archivos encontrados.":"");
  drawFiles();
  empty($("preview"),"Elige un archivo de la biblioteca para prepararlo.");
}
async function changeModule(id){
  state.module=id;state.preview=null;$("search").value="";
  for(const button of document.querySelectorAll("[data-module]"))button.classList.toggle("active",button.dataset.module===id);
  const bible=id==="bible";$("bibleSection").hidden=!bible;$("fileSection").hidden=bible;$("mediaTypeArea").hidden=id!=="media";
  $("libraryTitle").textContent=({hymns:"Himnario Adventista",youth:"Cantos juveniles",bible:"Biblias",media:"Multimedia"})[id];
  $("previousVerse").disabled=!bible;$("nextVerse").disabled=!bible;
  if(bible){$("libraryInfo").textContent="FSB y JSON compatibles";await refreshBibles();}
  else await refreshFiles();
}
async function send(){
  const display=selectedDestination();
  if(!state.preview)throw Error("Selecciona antes contenido para la vista previa");
  if(state.preview.kind==="media")await api.sendMedia(state.preview.file,display);
  else await api.sendVerse(state.preview.bible,state.preview.book,state.preview.chapter,state.preview.verse,display);
  await refreshProjection();notice("Contenido enviado a la pantalla seleccionada.");
}
async function command(action){
  await api.projectionCommand(selectedDestination(),action);
  await refreshProjection();
}
function openSettings(){
  fillSelect($("operatorSelect"),state.displays.map(d=>({value:d.id,label:d.name+" — "+d.size.width+"×"+d.size.height+(d.primary?" (principal Windows)":"")})));
  $("operatorSelect").value=state.operator;
  settingsTargets();
  $("settings").hidden=false;
}
function settingsTargets(){
  const operator=$("operatorSelect").value;
  fillSelect($("mainSelect"),[{value:"",label:"— No asignar —"},...state.displays.filter(d=>d.id!==operator).map(d=>({value:d.id,label:d.name+" — "+d.size.width+"×"+d.size.height}))]);
  $("mainSelect").value=state.main===operator?"":state.main;
}
async function saveSettings(){
  const operator=$("operatorSelect").value,main=$("mainSelect").value;
  if(operator===main&&main)throw Error("Operador y proyector no pueden ser el mismo monitor.");
  if(main&&main===state.operator&&operator!==state.operator)await api.setMain("");
  if(operator&&operator!==state.operator)await api.setOperator(operator);
  await api.setMain(main);
  state.target=main;
  $("settings").hidden=true;
  await refreshDisplays();notice("Pantallas configuradas.");
}
function bind(id,event,fn){$(id).addEventListener(event,()=>execute(fn));}
async function init(){
  for(const btn of document.querySelectorAll("[data-module]"))btn.addEventListener("click",()=>execute(()=>changeModule(btn.dataset.module)));
  bind("sendBtn","click",send);bind("playBtn","click",()=>command("play"));bind("pauseBtn","click",()=>command("pause"));bind("restartBtn","click",()=>command("restart"));bind("blackBtn","click",()=>command("black"));bind("clearBtn","click",()=>command("clear"));
  bind("previousVerse","click",()=>shiftVerse(-1));bind("nextVerse","click",()=>shiftVerse(1));
  bind("search","input",drawFiles);bind("mediaType","change",refreshFiles);
  bind("reloadLibrary","click",refreshFiles);bind("reloadBibles","click",refreshBibles);
  bind("linkBtn","click",async()=>{const result=await api.selectFolder(category());if(!result.cancelled)await refreshFiles();});
  bind("importBible","click",async()=>{const result=await api.importBible();if(!result.cancelled){await refreshBibles();notice("Biblia importada correctamente.");}});
  bind("bibleSelect","change",chooseBible);bind("bookSelect","change",chooseBook);bind("chapterSelect","change",chooseChapter);
  bind("verseSelect","change",()=>{state.verseIndex=Number($("verseSelect").value)||0;previewVerse();});
  bind("settingsBtn","click",openSettings);bind("refreshBtn","click",async()=>{await refreshDisplays();await changeModule(state.module);});
  bind("cancelSettings","click",()=>{$("settings").hidden=true;});
  bind("saveSettings","click",saveSettings);bind("operatorSelect","change",settingsTargets);
  api.onDisplaysChanged(()=>execute(refreshDisplays));
  api.onProjectionChanged(outputs=>{state.outputs=outputs;execute(refreshProjection);});
  await refreshDisplays();await changeModule("hymns");
}
document.addEventListener("keydown",event=>{
  if(state.module!=="bible"||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
  if(event.key==="ArrowRight"){event.preventDefault();shiftVerse(1);}
  if(event.key==="ArrowLeft"){event.preventDefault();shiftVerse(-1);}
});
void execute(init);
})();