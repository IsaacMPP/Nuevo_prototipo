"use strict";
// Native adapter for the approved Gemini layout. The original sample JS is
// deliberately absent from the compiled page: no fictional live status or media.
(() => {
const api=window.jaDesktop;
if(!api)return;
const $=id=>document.getElementById(id);
const state={displays:[],operator:"",main:"",targets:new Set(),sessions:[],module:"biblia",type:"Videos",
 files:[],selected:null,prepared:null,live:new Map(),bibles:[],bible:null,structure:null,chapter:null,book:0,chapterIndex:0,verse:0,view:"grid",bibleStyle:{fontSize:56,fontFamily:"Georgia",textColor:"#ffffff",referenceColor:"#ffe6a0",background:"navy",backgroundFile:"",plateOpacity:20,textAlign:"center",showReference:true},backgroundUrl:""};
const safe=s=>String(s??"");
const node=(tag,classes="",text)=>{const n=document.createElement(tag);n.className=classes;n.textContent=text===undefined?"":safe(text);return n;};
const button=(label,classes,click)=>{const b=node("button",classes,label);b.type="button";b.addEventListener("click",()=>run(click));return b;};
const announce=(message)=>{const el=$("jaToast"),span=$("jaToastText");if(!el||!span)return;span.textContent=safe(message);el.classList.remove("hidden");clearTimeout(announce.timeout);announce.timeout=setTimeout(()=>el.classList.add("hidden"),3600);};
const run=async fn=>{try{return await fn();}catch(err){announce("Error: "+safe(err?.message||err));return null;}};
function placeholder(container,label){container.replaceChildren(node("div","w-full h-full min-h-28 flex flex-col items-center justify-center text-center text-xs text-slate-400 p-6",label));}
function drawVerse(container,text,reference){
 const st=state.bibleStyle;
 const base=node("div","w-full h-full flex flex-col justify-center gap-2 p-5 text-center relative overflow-hidden");
 base.style.background=st.background==="black"?"#000":st.background==="gradient"?"linear-gradient(135deg,#071a4c,#144c65 60%,#905e4d)":"#071a4c";
 if(st.background==="image"&&state.backgroundUrl){base.style.backgroundImage="url("+JSON.stringify(state.backgroundUrl)+")";base.style.backgroundSize="cover";base.style.backgroundPosition="center";}
 const plate=node("div","absolute inset-2 rounded-lg pointer-events-none");plate.style.background="rgba(0,0,0,"+st.plateOpacity/100+")";base.append(plate);
 const ref=node("div","relative z-10 font-semibold text-xs sm:text-sm",reference);ref.style.color=st.referenceColor;ref.style.fontFamily=st.fontFamily;ref.style.display=st.showReference?"":"none";
 const verse=node("div","relative z-10 font-bold whitespace-pre-line leading-snug",text);
 verse.style.fontSize="clamp(15px,"+st.fontSize/26+"vw,65px)";
 verse.style.color=st.textColor;verse.style.textAlign=st.textAlign;verse.style.fontFamily=st.fontFamily;
 base.append(ref,verse);container.replaceChildren(base);
}
function formatTitle(display){return safe(display.name||"Pantalla "+display.id)+" · "+display.size.width+"×"+display.size.height;}
function targets(){const external=state.displays.filter(d=>d.id!==state.operator);return external.filter(d=>state.targets.has(d.id)).map(d=>d.id);}
function setTop(){
 const strong=[...document.querySelectorAll("header strong")].find(el=>el.parentElement?.textContent?.includes("Pantallas conectadas:"));
 if(strong)strong.textContent=state.displays.length+" detectadas";
 const header= [...document.querySelectorAll("header strong")].find(el=>el.parentElement?.textContent?.includes("Estado:"));
 if(header)header.textContent=state.sessions.length?"Salida activa":"Sin proyección";
 const project=$("activeProjectLabel");if(project)project.textContent="Modo: Operación manual";
 const save=$("autosaveStatusText");if(save)save.textContent="Proyectos sin abrir";
 const dot=$("autosaveDot");if(dot)dot.className="w-2 h-2 rounded-full bg-slate-500";
 const meter=$("audioMeterBars");
 if(meter){meter.replaceChildren();for(let i=0;i<11;i++)meter.append(node("span","flex-1 h-full bg-[#1e3a5f] rounded-[1px]"));}
}
function renderTargets(){
 const el=$("quickTargetButtons");if(!el)return;el.replaceChildren();
 const external=state.displays.filter(d=>d.id!==state.operator);
 if(!external.length)el.append(node("span","text-amber-200 text-xs","Conecta una pantalla externa (Windows → Extender)"));
 for(const d of external){
   const on=state.targets.has(d.id),title=d.id===state.main?"Principal":d.name;
   el.append(button("🖥 "+title+(on?" ✓":""),"px-3.5 py-1.5 rounded-lg border text-xs "+(on?"pill-amber-target":"bg-[#0d2046] border-[#23437a] text-slate-200"),()=>{
    if(on)state.targets.delete(d.id);else state.targets.add(d.id);
    renderTargets();renderDisplays();
   }));
 }
}
function renderDisplays(){
 const el=$("multiscreenCardsList");if(!el)return;
 el.replaceChildren();
 const external=state.displays.filter(d=>d.id!==state.operator);
 if(!external.length){el.append(node("p","text-center text-xs text-slate-300 p-4","Sin proyectores conectados. Abre ⚙ Configuración."));return;}
 for(const d of external){
  const session=state.sessions.find(s=>s.displayId===d.id);
  const title=d.id===state.main?"Pantalla principal":d.name;
  const active=state.targets.has(d.id);
  const card=node("div","rounded-xl border p-1.5 flex items-center gap-2 cursor-pointer "+(active?"border-emerald-500 bg-[#0b2239]":"border-[#1c3a6e] bg-[#0a1938]"));
  card.append(node("div","w-20 aspect-video rounded-lg bg-black border border-[#27476f] flex items-center justify-center text-slate-400","🖥"));
  const details=node("div","min-w-0 flex-1");details.append(node("div","font-bold text-xs truncate",title));
  details.append(node("div","text-[10px] text-slate-300 mt-1 truncate",session?session.title+" · "+session.state:formatTitle(d)));
  card.append(details,node("span","text-[10px] rounded-full px-2 py-0.5 border "+(session?"text-emerald-200 border-emerald-600":"text-slate-300 border-slate-600"),session?"Salida":"Lista"));
  card.addEventListener("click",()=>{state.targets=new Set([d.id]);renderTargets();renderDisplays();renderProgram();});
  el.append(card);
 }
}
function renderPreview(){
 const target=$("previewCanvasContent");if(!target)return;
 const c=state.prepared;
 if(!c){placeholder(target,"Vista previa · Selecciona un himno, archivo o versículo");$("previewTimeCounter").textContent="Sin archivo";return;}
 if(c.kind==="verse"){drawVerse(target,c.text,c.reference);$("previewTimeCounter").textContent=c.reference;return;}
 if(c.kind==="image"){const img=node("img","w-full h-full object-contain");img.src=c.url;img.alt=c.title;target.replaceChildren(img);}
 else {const elem=node(c.kind==="video"?"video":"audio","w-full h-full object-contain");elem.src=c.url;elem.controls=true;elem.muted=true;elem.preload="metadata";target.replaceChildren(elem);}
 $("previewTimeCounter").textContent=c.title;
}
function renderProgram(){
 const el=$("programCanvasContent");if(!el)return;
 const t=targets()[0]||state.main,s=state.sessions.find(x=>x.displayId===t),known=state.live.get(t);
 const badge=$("programBadgeText"),label=$("programStateLabel");
 if(badge)badge.textContent=s?"Programa · "+s.state:"Programa · Sin emisión";
 if(label)label.textContent=s? s.state+" · "+s.title:"Sin proyección";
 $("programTimeCounter").textContent="—";
 if(!s){placeholder(el,"Programa sin señal · No hay contenido proyectándose");return;}
 if(s.state==="black"){placeholder(el,"Salida en negro");return;}
 if(known?.kind==="verse"){drawVerse(el,known.text,known.reference);return;}
 if(known?.kind==="image"&&known.url){const img=node("img","w-full h-full object-contain");img.src=known.url;el.replaceChildren(img);return;}
 // A display state is not a decoded video frame: label accordingly.
 placeholder(el,s.title+" · "+s.state+" (estado de la salida, no monitorización del fotograma)");
}
async function refreshScreens(){
 const data=await api.displays(),external=data.displays.filter(d=>d.id!==data.operatorDisplayId);
 state.displays=data.displays;state.operator=data.operatorDisplayId;state.main=data.mainDisplayId;
 state.targets=new Set([...state.targets].filter(id=>external.some(d=>d.id===id)));
 if(!state.targets.size&&external.some(d=>d.id===state.main))state.targets.add(state.main);
 state.sessions=await api.projectionState();
 setTop();renderTargets();renderDisplays();renderProgram();
}
function chooseDestination(){const chosen=targets();if(!chosen.length)throw Error("Selecciona un proyector real en la barra de destinos");return chosen;}
async function project(ids){
 if(!state.prepared)throw Error("Selecciona un himno, archivo o versículo para Vista previa");
 for(const id of ids){
  const c=state.prepared;
  if(c.kind==="verse")await api.sendVerse(c.bible,c.book,c.chapter,c.verse,id);
  else await api.sendMedia(c.file,id);
  state.live.set(id,{...c});
 }
 await refreshScreens();announce("Enviado a "+ids.length+" pantalla(s) real(es).");
}
async function command(action){
 for(const id of chooseDestination())await api.projectionCommand(id,action);
 await refreshScreens();
}
async function prepareFile(file){
 if(![".mp4",".webm",".mp3",".wav",".ogg",".m4a",".jpg",".jpeg",".png",".webp",".gif"].includes(file.extension)){announce("Formato no reproducible todavía. Convierte a MP4 H.264 o WebM.");return;}
 const url=await api.mediaUrl(file.path);
 const kind=[".mp4",".webm"].includes(file.extension)?"video":[".jpg",".jpeg",".png",".webp",".gif"].includes(file.extension)?"image":"audio";
 state.prepared={kind,file:file.path,url,title:file.name};
 renderPreview();announce(file.name+" preparado (sin proyectar).");
}
function fileCard(file){
 const item=button("","bg-[#0a1938] border border-[#1a3768] hover:border-cyan-400 rounded-xl p-2 text-left flex flex-col gap-1 min-w-0",()=>prepareFile(file));
 item.append(node("div","rounded-lg bg-[#06132a] border border-[#203a69] aspect-video flex justify-center items-center text-xl text-sky-400",file.extension===".mp4"||file.extension===".webm"?"▶":file.extension===".mp3"?"♫":"▣"));
 item.append(node("div","font-semibold text-xs truncate",file.name));
 item.append(node("div","text-[10px] text-slate-400",file.extension+" · "+Math.round(file.size/1024)+" KB"));
 return item;
}
function renderFiles(){
 const q=state.module==="himnario"||state.module==="juveniles"?$("hymnModuleSearch")?.value||"":$("multimediaSearchInput")?.value||"";
 const list=state.files.filter(f=>f.name.toLocaleLowerCase("es").includes(q.trim().toLocaleLowerCase("es")));
 const el=state.module==="himnario"||state.module==="juveniles"?$("hymnModuleGrid"):$("multimediaCardsGrid");
 if(!el)return;el.replaceChildren();
 if(!list.length)el.append(node("div","col-span-full rounded-xl border border-[#284674] p-6 text-slate-300 text-xs","No hay archivos aquí. Pulsa «Vincular carpeta» para utilizar tu biblioteca real."));
 for(const f of list.slice(0,220))el.append(fileCard(f));
}
function category(){return state.module==="himnario"?"Himnario Adventista":state.module==="juveniles"?"Cantos Juveniles":state.type;}
async function loadFiles(){
 const group=category(),data=await api.library(group);
 state.files=data.items;renderFiles();
 const info=$("librarySourceInfo");if(info)info.textContent=group+" · "+data.items.length+" archivo(s)"+(data.missing.length?" · "+data.missing.length+" carpeta(s) sin conectar":"");
}
function disable(id,message){const x=$(id);if(!x)return;x.setAttribute("title",message);x.setAttribute("aria-disabled","true");x.classList.add("opacity-50");x.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();announce(message);},true);}
function switchModule(id){
 state.module=id;
 const mapping={biblia:"moduleView_biblia",himnario:"moduleView_himnario",juveniles:"moduleView_himnario",multimedia:"moduleView_multimedia"};
 const visible=mapping[id]||"moduleView_other";
 for(const key of ["moduleView_biblia","moduleView_himnario","moduleView_multimedia","moduleView_other"]){
  const el=$(key);if(el){el.classList.toggle("hidden",key!==visible);el.classList.toggle("flex",key===visible);}
 }
 for(const b of document.querySelectorAll("#leftModuleSidebar button"))b.classList.toggle("sidebar-active",b.dataset.moduleId===id);
 if(id==="himnario"||id==="juveniles"){
  const h=$("moduleView_himnario")?.querySelector("h2");if(h)h.textContent=id==="juveniles"?"♪ Cantos juveniles":"♫ Himnario Adventista";
  void run(loadFiles);
 }else if(id==="multimedia")void run(loadFiles);
 else if(id==="biblia")void run(loadBibles);
 else {
  const holder=$("otherModuleContainer");
  if(holder)holder.replaceChildren(node("p","text-slate-300 text-sm","El módulo "+id+" está previsto, pero todavía no dispone de motor funcional en esta versión."));
 }
}
function sidebar(){
 const nav=$("leftModuleSidebar");nav.replaceChildren();
 const defs=[["biblia","📖","Biblia"],["himnario","🎵","Himnario"],["juveniles","♪","Cantos juveniles"],["multimedia","▶","Multimedia"],["youtube","▶","YouTube"],["presentaciones","▣","Presentaciones"],["fondos","▧","Fondos"],["listas","☰","Listas"]];
 for(const [id,icon,label] of defs){
  const b=button(icon+"   "+label,"ui-label w-full px-3 py-2 rounded-lg text-xs text-left text-slate-300 hover:bg-[#0d2046] transition",()=>switchModule(id));
  b.dataset.moduleId=id;nav.append(b);
 }
}
function setBibleView(view){
 state.view=view;
 $("fsBibleSubViewGrid")?.classList.toggle("hidden",view!=="grid");
 $("fsBibleSubViewList")?.classList.toggle("hidden",view!=="list");
 for(const [id,active] of [["btnFsViewGrid",view==="grid"],["btnFsViewList",view==="list"]]){
  const btn=$(id);if(!btn)continue;
  btn.classList.remove("text-slate-950","text-slate-300","bg-amber-500");
  btn.style.color=active?"#07152b":"#eef5ff";
  btn.style.backgroundColor=active?"#f59e0b":"#15284b";
  btn.style.opacity="1";
 }
}
function bookColor(index){return index<5?"#8d3445":index<17?"#6a452f":index<22?"#456348":index<39?"#394a78":index<43?"#346d42":index<53?"#544875":"#65522f";}
function bookAbbr(name,index){
 const aliases=["GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL","MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"];
 return state.structure?.books.length===66?aliases[index]||name.slice(0,3).toUpperCase():name.slice(0,3).toUpperCase();
}
function fillSelector(id,items){
 const select=$(id);if(!select)return;select.replaceChildren();
 for(const [value,label] of items){const o=node("option","",label);o.value=safe(value);select.append(o);}
}
function currentBibleRef(){const b=state.structure?.books[state.book],v=state.chapter?.verses[state.verse];return b&&v?b.name+" "+(state.chapterIndex+1)+":"+v.number:""; }
function prepareVerse(){
 const v=state.chapter?.verses[state.verse];
 if(!v||!state.bible)return;
 const reference=currentBibleRef();
 state.prepared={kind:"verse",bible:state.bible.path,book:state.book,chapter:state.chapterIndex,verse:state.verse,reference,text:v.text,title:reference};
 renderPreview();
 const pill=$("fsFloatingRefPill");if(pill)pill.textContent=state.bible.name+": "+reference;
}
async function loadBibles(){
 state.bibles=await api.bibles();
 const select=$("jaBibleTranslation"),prior=state.bible?.path;
 if(!select)return;
 select.replaceChildren();
 for(const b of state.bibles){const o=node("option","",b.name);o.value=b.path;select.append(o);}
 if(prior&&state.bibles.some(b=>b.path===prior))select.value=prior;
 if(!state.bibles.length){
  state.bible=null;state.structure=null;state.chapter=null;
  for(const id of ["fsBooksRow1","fsBooksRow2","fsBooksRow3","fsGridChapters","fsGridVerses","fsListBooksCol","fsListChaptersCol","fsListVersesCol"]){$(id)?.replaceChildren();}
  $("fsGridChapters").append(node("p","col-span-full text-amber-300 p-3 text-xs","No hay una Biblia cargada. Importa un archivo FSB/JSON."));
  return;
 }
 await selectBible();
}
async function selectBible(){
 state.bible=state.bibles.find(b=>b.path===$("jaBibleTranslation")?.value)||null;
 if(!state.bible)return;
 state.structure=await api.bibleStructure(state.bible.path);
 state.book=0;state.chapterIndex=0;state.verse=0;
 await loadChapter();
}
async function loadChapter(){
 if(!state.bible)return;
 state.chapter=await api.bibleChapter(state.bible.path,state.book,state.chapterIndex);
 state.verse=Math.max(0,Math.min(state.verse,(state.chapter.verses.length||1)-1));
 renderBible();prepareVerse();
}
function renderBible(){
 if(!state.structure||!state.chapter)return;
 const books=state.structure.books;
 const groups=[books.slice(0,25),books.slice(25,50),books.slice(50)];
 ["fsBooksRow1","fsBooksRow2","fsBooksRow3"].forEach((id,gi)=>{
  const el=$(id);el.replaceChildren();
  for(const book of groups[gi]){
   const b=button(bookAbbr(book.name,book.index),"h-8 border border-[#061126] text-[10px] font-bold "+(book.index===state.book?"ring-2 ring-amber-400":""),async()=>{state.book=book.index;state.chapterIndex=0;state.verse=0;await loadChapter();});
   b.title=book.name;b.style.background=bookColor(book.index);b.style.color="#fff";b.style.textShadow="0 1px 2px #000";el.append(b);
  }
 });
 const ch=$("fsGridChapters"),vs=$("fsGridVerses");ch.replaceChildren();vs.replaceChildren();
 const chapters=books[state.book]?.chapters||0;
 for(let i=0;i<chapters;i++)ch.append(button(String(i+1),"h-7 text-white text-[11px] font-semibold "+(i===state.chapterIndex?"bg-[#364962] ring-1 ring-amber-400":"text-slate-100 hover:bg-[#203254]"),async()=>{state.chapterIndex=i;state.verse=0;await loadChapter();}));
 for(let i=0;i<state.chapter.verses.length;i++)vs.append(button(String(state.chapter.verses[i].number),"h-7 text-amber-300 text-[11px] font-semibold "+(i===state.verse?"ring-1 ring-amber-400 bg-[#393528]":"text-amber-400 hover:bg-[#203254]"),()=>{state.verse=i;renderBible();prepareVerse();}));
 const bookList=$("fsListBooksCol"),chapterList=$("fsListChaptersCol"),verseList=$("fsListVersesCol");
 bookList.replaceChildren();chapterList.replaceChildren();verseList.replaceChildren();
 for(const book of books)bookList.append(button(book.name,"w-full px-2 py-2 border-b border-[#1b2945] text-xs text-left "+(book.index===state.book?"bg-[#24436b]":"hover:bg-[#203154]"),async()=>{state.book=book.index;state.chapterIndex=0;state.verse=0;await loadChapter();}));
 for(let i=0;i<chapters;i++)chapterList.append(button(String(i+1),"w-full py-2 text-xs "+(i===state.chapterIndex?"text-amber-400 bg-[#243751]":""),async()=>{state.chapterIndex=i;state.verse=0;await loadChapter();}));
 for(let i=0;i<state.chapter.verses.length;i++){
  const verse=state.chapter.verses[i],b=button("","w-full text-left py-2 px-3 text-xs border-b border-[#1b2945] "+(state.verse===i?"bg-[#24436b]":""),()=>{state.verse=i;renderBible();prepareVerse();});
  b.append(node("strong","text-amber-400 mr-2",verse.number),node("span","text-slate-100",verse.text));verseList.append(b);
 }
 const pill=$("fsFloatingRefPill");if(pill)pill.textContent=state.bible.name+": "+currentBibleRef();
}
async function stepVerse(step){
 if(!state.chapter)return;
 const next=state.verse+step;
 if(next<0||next>=state.chapter.verses.length)return;
 state.verse=next;renderBible();prepareVerse();
}
function openModal(title,content){
 $("modalTitle").textContent=title;
 const body=$("modalBody");body.replaceChildren();body.append(content);
 $("modalOverlay").classList.remove("hidden");$("modalOverlay").classList.add("flex");
}
function closeModal(){$("modalOverlay").classList.add("hidden");$("modalOverlay").classList.remove("flex");}
function screensModal(){
 const wrap=node("div","flex flex-col gap-3");
 wrap.append(node("p","text-slate-300","Pantallas detectadas por Windows: "+state.displays.length+". Configura el operador y la pantalla principal. No se proyecta automáticamente."));
 const selection=(label,options,id)=>{
  wrap.append(node("label","font-semibold text-slate-200",label));
  const sel=node("select","w-full bg-[#050e24] p-2 border border-[#264b80] rounded-lg text-white");
  sel.id=id;
  for(const [value,title] of options){const opt=node("option","",title);opt.value=value;sel.append(opt);}
  wrap.append(sel);return sel;
 };
 const optionList=state.displays.map(d=>[d.id,formatTitle(d)]);
 const op=selection("Monitor del operador",optionList,"realOperator");
 op.value=state.operator;
 const makeMain=()=>{
  const existing=$("realMain"),old=existing?.value||state.main;
  if(existing)existing.remove();
  const sel=node("select","w-full bg-[#050e24] p-2 border border-[#264b80] rounded-lg text-white");sel.id="realMain";
  for(const [value,label] of [["","— Sin asignar —"],...optionList.filter(x=>x[0]!==op.value)]){
   const o=node("option","",label);o.value=value;sel.append(o);
  }
  sel.value=old===op.value?"":old;wrap.insertBefore(sel,footer);
 };
 wrap.append(node("label","font-semibold text-slate-200","Pantalla principal HDMI/DisplayPort"));
 const footer=node("div","flex justify-end gap-2 mt-2");
 footer.append(button("Cancelar","px-3 py-2 rounded-lg border border-[#345b88]",closeModal));
 footer.append(button("Guardar asignación","px-3 py-2 rounded-lg pill-cyan-active",async()=>{
  const chosenOperator=op.value,main=$("realMain").value;
  if(chosenOperator===main&&main)throw Error("Operador y salida principal no pueden coincidir");
  if(main===state.operator&&chosenOperator!==state.operator)await api.setMain("");
  if(chosenOperator!==state.operator)await api.setOperator(chosenOperator);
  await api.setMain(main);closeModal();await refreshScreens();announce("Configuración de pantallas guardada.");
 }));
 wrap.append(footer);op.addEventListener("change",makeMain);makeMain();
 openModal("Pantallas y salidas de proyección JA",wrap);
}
async function linkFolder(){
 const group=category(),response=await api.selectFolder(group);
 if(!response.cancelled){await loadFiles();announce("Carpeta vinculada: "+group);}
}
function currentStyledPreview(){
 if(state.prepared?.kind==="verse")renderPreview();
 const id=targets()[0]||state.main,live=state.live.get(id);
 if(live?.kind==="verse")renderProgram();
}
async function refreshBackgrounds(){
 const bg=$("scriptureBgSelect");if(!bg)return;
 const current=state.bibleStyle;
 const data=await api.library("Fondos Personalizados");
 bg.replaceChildren();
 const add=(value,label)=>{const opt=node("option","",label);opt.value=value;bg.append(opt);};
 add("navy","Azul JA #071a4c");add("black","Negro");add("gradient","Degradado azul y atardecer");
 for(const file of data.items.filter(f=>[".jpg",".jpeg",".png",".webp"].includes(f.extension)).slice(0,150))add("image:"+file.path,"🖼 "+file.name);
 const target=current.background==="image"?"image:"+current.backgroundFile:current.background;
 bg.value=[...bg.options].some(o=>o.value===target)?target:"navy";
}
function styleValue(){
 const st={...state.bibleStyle};
 const size=$("jaFontSize"),font=$("jaFontFamily"),color=$("jaFontColor"),ref=$("jaRefColor"),align=$("jaTextAlign");
 if(size)st.fontSize=Number(size.value);
 if(font)st.fontFamily=font.value;
 if(color)st.textColor=color.value;
 if(ref)st.referenceColor=ref.value;
 if(align)st.textAlign=align.value;
 const bg=$("scriptureBgSelect")?.value||"navy";
 if(bg.startsWith("image:")){st.background="image";st.backgroundFile=bg.slice(6);}
 else{st.background=bg;st.backgroundFile="";}
 st.plateOpacity=$("readingPlateToggle")?.checked?Number($("readingPlateOpacity")?.value||0):0;
 st.showReference=$("jaShowReference")?.checked!==false;
 return st;
}
let styleSaveTimer=null;
async function applyBibleStyle(){
 const chosen=styleValue();state.bibleStyle=chosen;
 state.backgroundUrl=chosen.background==="image"&&chosen.backgroundFile?await api.mediaUrl(chosen.backgroundFile):"";
 currentStyledPreview();
 state.bibleStyle=await api.saveBibleStyle(chosen);
 $("jaStyleSaveStatus").textContent="✓ Estilo guardado y aplicado a las salidas bíblicas";
}
function scheduleStyle(){
 const result=styleValue();state.bibleStyle=result;
 if(result.background!=="image")state.backgroundUrl="";
 currentStyledPreview();
 clearTimeout(styleSaveTimer);
 $("jaStyleSaveStatus").textContent="Guardando cambios…";
 styleSaveTimer=setTimeout(()=>run(applyBibleStyle),250);
}
async function loadBibleStyle(){
 state.bibleStyle=await api.bibleStyle();
 if(state.bibleStyle.background==="image"&&state.bibleStyle.backgroundFile){
  try{state.backgroundUrl=await api.mediaUrl(state.bibleStyle.backgroundFile);}catch{state.backgroundUrl="";}
 }
 await refreshBackgrounds();
 $("jaFontSize").value=String(state.bibleStyle.fontSize);
 $("jaFontFamily").value=state.bibleStyle.fontFamily;
 $("jaFontColor").value=state.bibleStyle.textColor;
 $("jaRefColor").value=state.bibleStyle.referenceColor;
 $("jaTextAlign").value=state.bibleStyle.textAlign;
 $("readingPlateToggle").checked=state.bibleStyle.plateOpacity>0;
 $("readingPlateOpacity").value=String(state.bibleStyle.plateOpacity);
 $("jaShowReference").checked=state.bibleStyle.showReference;
 currentStyledPreview();
}
function createStyleControls(){
 const inspector=$("fsBibleSearchAndInspector");if(!inspector)return;
 const panel=node("div","grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 p-2 bg-[#0a1d39] border border-[#26436b] rounded-lg");
 const control=(id,label,type,options)=>{
  const holder=node("label","flex flex-col gap-1 text-[11px] text-slate-200",label);
  const input=node(type==="select"?"select":"input","w-full min-w-0 rounded bg-[#050e24] border border-[#385784] text-white p-1.5 text-xs");
  input.id=id;
  if(type==="select")for(const [value,caption] of options){const opt=node("option","",caption);opt.value=value;input.append(opt);}
  else if(type==="range"){input.type="range";input.min="24";input.max="100";input.step="1";}
  else input.type=type;
  holder.append(input);panel.append(holder);input.addEventListener(type==="range"?"input":"change",scheduleStyle);
 };
 control("jaFontSize","Tamaño de letra (24–100)","range");
 control("jaFontFamily","Tipografía","select",[["Georgia","Georgia"],["Arial","Arial"],["Verdana","Verdana"],["Tahoma","Tahoma"],["Times New Roman","Times"]]);
 control("jaFontColor","Color del texto","color");
 control("jaRefColor","Color de referencia","color");
 control("jaTextAlign","Alineación","select",[["center","Centro"],["left","Izquierda"],["right","Derecha"]]);
 const label=node("label","flex items-center gap-2 text-[11px] text-slate-200","Mostrar referencia");
 const tick=node("input");tick.type="checkbox";tick.id="jaShowReference";tick.checked=true;tick.addEventListener("change",scheduleStyle);label.prepend(tick);panel.append(label);
 const load=button("📂 Vincular fondos","text-xs text-white bg-[#19436a] border border-[#406e96] rounded-lg p-2",async()=>{
  const r=await api.selectFolder("Fondos Personalizados");if(!r.cancelled){await refreshBackgrounds();announce("Carpeta de fondos vinculada");}
 });
 panel.append(load);
 const status=node("p","text-[11px] text-emerald-300 self-center","Estilos guardados localmente");status.id="jaStyleSaveStatus";panel.append(status);
 inspector.append(panel);
 for(const x of ["readingPlateToggle","readingPlateOpacity","scriptureBgSelect"]){
  const input=$(x);input.disabled=false;input.addEventListener(x==="readingPlateOpacity"?"input":"change",scheduleStyle);
 }
 $("btnRestoreScriptureBg").disabled=false;
 $("btnRestoreScriptureBg").addEventListener("click",()=>run(async()=>{$("scriptureBgSelect").value="navy";await applyBibleStyle();}));
 $("btnRestoreReadingPlate").disabled=false;
 $("btnRestoreReadingPlate").addEventListener("click",()=>run(async()=>{$("readingPlateToggle").checked=true;$("readingPlateOpacity").value="20";await applyBibleStyle();}));
}

function setup(){
 sidebar();
 // Hide all mock-only controls until their real service exists.
 for(const [id,msg] of Object.entries({
  btnBridgeFade:"Transición de fundido pendiente del motor de transiciones",
  btnBridgeLogo:"Superposición del logo pendiente",
  btnBridgeClearText:"Limpieza de superposición independiente pendiente",
  btnOpenDiagModal:"Diagnóstico avanzado pendiente",
  btnPreviewFullscreen:"Ampliación de Vista previa pendiente",
  btnProgramFullscreen:"Vista Programa de pantalla completa pendiente",
  btnFsViewList:"",btnFsViewGrid:"",
  btnSaveVersion:"Versionado manual todavía no disponible",
  btnDuplicateProject:"Duplicación de proyectos todavía no disponible"
 }))if(msg)disable(id,msg);
 const link=button("+ Vincular carpeta real","px-3 py-1.5 rounded-lg pill-cyan-active text-xs font-semibold",linkFolder);
 $("moduleView_himnario")?.querySelector(".border-b")?.append(link);
 const info=node("div","text-xs text-slate-300 pb-2");info.id="librarySourceInfo";$("hymnModuleGrid")?.before(info);
 $("hymnEndBehavior").disabled=true;$("hymnEndBehavior").title="Comportamiento al terminar pendiente";
 $("btnAddMultimedia").addEventListener("click",()=>run(linkFolder));
 $("hymnModuleSearch").addEventListener("input",renderFiles);
 $("multimediaSearchInput").addEventListener("input",renderFiles);
 for(const item of document.querySelectorAll("[data-media-subtab]"))item.addEventListener("click",()=>run(async()=>{
  state.type=item.dataset.mediaSubtab==="image"?"Imagenes":item.dataset.mediaSubtab==="audio"?"Audio":"Videos";await loadFiles();
 }));
 for(const [id,click] of [
  ["btnBridgeQuickPlay",()=>project(chooseDestination())],["btnBridgeCut",()=>project(chooseDestination())],
  ["btnProjectSelectedVerse",()=>project(chooseDestination())],["fsPillPlayBtn",()=>project(chooseDestination())],
  ["btnBridgeBlack",()=>command("black")],["btnProgramPause",()=>command(state.sessions.some(s=>targets().includes(s.displayId)&&s.state==="paused")?"play":"pause")],
  ["btnPreviewToAll",()=>project(state.displays.filter(d=>d.id!==state.operator).map(d=>d.id))],
  ["btnProgramToAll",async()=>{const main=state.live.get(state.main);if(!main)throw Error("La salida principal no tiene contenido conocido para repetir");const previous=state.prepared;state.prepared=main;try{await project(state.displays.filter(d=>d.id!==state.operator).map(d=>d.id));}finally{state.prepared=previous;}}],
  ["btnResetTargets",()=>{state.targets=new Set(state.main?[state.main]:[]);renderTargets();renderDisplays();renderProgram();}],
  ["btnBiblePrevVerse",()=>stepVerse(-1)],["btnBibleNextVerse",()=>stepVerse(1)],
  ["btnFsViewGrid",()=>setBibleView("grid")],["btnFsViewList",()=>setBibleView("list")],
  ["fsPillViewToggleBtn",()=>setBibleView(state.view==="grid"?"list":"grid")],
  ["btnFsPillSearchBtn",()=>{}],
  ["btnOpenSettingsModal",screensModal],["btnMultiScreenMenu",screensModal],
  ["btnCloseModal",closeModal],["btnImportBibleModal",async()=>{const r=await api.importBible();if(!r.cancelled){await loadBibles();announce("Biblia importada.");}}],
  ["btnPreviewPlay",async()=>{const el=$("previewCanvasContent").querySelector("video,audio");if(!el)throw Error("No hay un video o audio en Vista previa");if(el.paused)await el.play();else el.pause();}],
  ["btnPreviewMute",()=>{const el=$("previewCanvasContent").querySelector("video,audio");if(el){el.muted=!el.muted;announce(el.muted?"Vista previa silenciada":"Monitoreo de Vista previa activo");}}],
  ["btnFsPillVersionBtn",()=>{$("jaBibleTranslation")?.focus();}],
  ["btnToggleBibleInspector",()=>{$("fsBibleSearchAndInspector")?.classList.toggle("hidden");}],
  ["fsPillSearchBtn",()=>{$("fsBibleSearchAndInspector")?.classList.toggle("hidden");}],
  ["btnOpenSettingsModal",screensModal]
 ]){const element=$(id);if(element)element.addEventListener("click",()=>run(click));}
 $("jaBibleTranslation")?.addEventListener("change",()=>run(selectBible));
 $("btnLargeTextToggle")?.addEventListener("click",()=>document.body.classList.toggle("large-text-mode"));
 for(const id of ["btnProjectDropdown","btnProgramFullscreen","btnPreviewFullscreen"]){
  if(id==="btnProjectDropdown")disable(id,"Gestión de proyectos en integración. La proyección manual está disponible.");
 }
 $("btnBridgeFade")?.classList.add("opacity-50");
 $("programVolumeSlider").disabled=true;$("programVolumeSlider").title="Volumen independiente pendiente";
 $("previewSeekSlider").disabled=true;$("previewSeekSlider").title="Utiliza el control nativo del video en Vista previa";
 createStyleControls();
 void run(loadBibleStyle);
 $("btnResetTargets")?.setAttribute("title","Solo restaura selección; no interrumpe otras pantallas.");
 // The prototype's placeholder NVI/RVR1960 options are removed by loadBibles().
 $("btnProjectSelectedVerse")?.setAttribute("title","Proyecta el contenido preparado en Vista previa.");
 $("btnFsViewGrid")?.setAttribute("title","Vista real de libros y versículos.");
 document.addEventListener("keydown",e=>{
  if(e.target?.matches?.("input,textarea,select"))return;
  if(state.module!=="biblia")return;
  if(e.key==="ArrowRight"){e.preventDefault();run(()=>stepVerse(1));}
  if(e.key==="ArrowLeft"){e.preventDefault();run(()=>stepVerse(-1));}
 });
 api.onDisplaysChanged(()=>run(refreshScreens));
 api.onProjectionChanged(s=>{state.sessions=s;setTop();renderDisplays();renderProgram();});
 setBibleView("grid");switchModule("biblia");
 void run(refreshScreens);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();
