"use strict";
// Desktop adapter: the source HTML is a visual prototype. Never translate its
// simulated transport commands into "successful" projection operations.
(() => {
    const api = window.jaDesktop;
    if (!api) return;

    const stateNative = { displays:[], operatorId:"", mainId:"", selected:new Set(), category:"Videos", projects:[], activeProject:null, files:[] };
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const CATEGORIES = ["Videos","Imagenes","Audio","Himnario Adventista","Cantos Juveniles","Biblias","Presentaciones","Fondos Personalizados","Importaciones"];
    function toast(message) {
        const el=document.getElementById("jaToast");
        const msg=document.getElementById("jaToastText");
        if(!el||!msg){window.alert(message);return;}
        msg.textContent=message;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),3800);
    }
    function newButton(title,cb) {
        const btn=document.createElement("button");btn.type="button";btn.textContent=title;
        btn.style.cssText="padding:6px 11px;color:white;font-size:12px;border:1px solid #315389;border-radius:8px;background:#102652;cursor:pointer;";
        btn.addEventListener("click",cb);return btn;
    }
    function createModal() {
        const back=document.createElement("div");back.id="jaNativeModal";
        back.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;";
        back.innerHTML='<section style="width:min(950px,98vw);max-height:87vh;display:flex;flex-direction:column;background:#071731;border:1px solid #315389;border-radius:14px;color:#eaf2ff;box-shadow:0 20px 90px #0009;"><div style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #25467a;"><strong id="jaNativeTitle">Herramientas de escritorio</strong><button type="button" id="jaNativeClose" style="padding:6px 12px;background:#173560;color:white;border-radius:6px;">Cerrar ✕</button></div><div id="jaNativeBody" style="padding:18px;overflow-y:auto;user-select:text;font-size:13px;"></div></section>';
        document.body.append(back);
        back.querySelector("#jaNativeClose").onclick=()=>back.style.display="none";
        back.addEventListener("click",event=>{if(event.target===back)back.style.display="none";});
        return back;
    }
    const modal=createModal();
    const content=()=>document.getElementById("jaNativeBody");
    function showModal(title) {document.getElementById("jaNativeTitle").textContent=title;modal.style.display="flex";}
    function blockDemoActions() {
        const blocked = new Set(["btnBridgeQuickPlay","btnBridgeCut","btnBridgeFade","btnBridgeBlack","btnBridgeLogo",
            "btnBridgeClearText","btnProgramToAll","btnPreviewToAll","btnProjectSelectedVerse","fsPillPlayBtn",
            "btnProgramPause","btnPreviewPlay","btnProgramFullscreen"]);
        document.addEventListener("click",event=>{
            const target=event.target.closest("button");
            if(!target)return;
            if(blocked.has(target.id)){
                event.preventDefault();event.stopImmediatePropagation();
                toast("Proyección real pendiente de conectar al motor FreeShow/JA; no se ha enviado contenido.");
                return;
            }
            const views={"btnAddMultimedia":"library","btnOpenSettingsModal":"screens","btnMultiScreenMenu":"screens","btnProjectDropdown":"projects"};
            if(views[target.id]){
                event.preventDefault();event.stopImmediatePropagation();
                if(views[target.id]==="library")void openLibrary();
                if(views[target.id]==="screens")void openScreens();
                if(views[target.id]==="projects")void openProjects();
            }
            if(target.id==="btnResetTargets"){
                event.preventDefault();event.stopImmediatePropagation();
                stateNative.selected=new Set(stateNative.mainId?[stateNative.mainId]:[]);
                renderDisplayViews();
                toast("Se restableció la selección de destinos. No se modificó ninguna salida.");
            }
        },true);
    }
    function renderDisplayViews() {
        const targets=document.getElementById("quickTargetButtons");
        const cards=document.getElementById("multiscreenCardsList");
        if(!targets||!cards)return;
        if(!stateNative.displays.length){
            targets.innerHTML='<span style="color:#cbd5e1;font-size:12px;">Sin monitores disponibles</span>';
            cards.innerHTML='<p style="color:#cbd5e1;font-size:12px;">Sin monitores detectados</p>';
            return;
        }
        const external=stateNative.displays.filter(d=>d.id!==stateNative.operatorId);
        targets.innerHTML="";
        if(!external.length) {
            const note=document.createElement("span");note.textContent="Conecta un monitor para crear una salida de proyección";note.style.cssText="color:#cbd5e1;font-size:11px;";
            targets.append(note);
        }
        external.forEach(d=>{
            const selected=stateNative.selected.has(d.id);
            const item=newButton((d.id===stateNative.mainId?"🖥 Principal":"🖥 "+d.name) + (selected?" ✓":""),()=>{
                if(stateNative.selected.has(d.id))stateNative.selected.delete(d.id);else stateNative.selected.add(d.id);
                renderDisplayViews();
            });
            item.style.background=selected?"#5a4018":"#102652";
            item.style.borderColor=selected?"#e6a620":"#315389";
            item.title="Destino preparado; la proyección real se conectará al motor FreeShow";
            targets.append(item);
        });
        targets.append(newButton("+ Configurar",()=>void openScreens()));
        cards.innerHTML="";
        stateNative.displays.forEach(d=>{
            const role=d.id===stateNative.operatorId?"OPERADOR":d.id===stateNative.mainId?"PRINCIPAL JA":"SIN ASIGNAR";
            const card=document.createElement("div");
            card.style.cssText="border:1px solid #315389;background:#0a1938;border-radius:9px;padding:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;";
            const label=document.createElement("div");
            label.style.cssText="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;";
            label.textContent="🖥 "+d.name+" · "+d.size.width+"×"+d.size.height;
            const status=document.createElement("small");
            status.textContent=role;status.style.cssText="white-space:nowrap;color:#b8d5ff;font-size:10px;";
            card.append(label,status);card.onclick=()=>void openScreens();cards.append(card);
        });
        const headings=[...document.querySelectorAll("header strong")];
        for(const item of headings){if(item.textContent.trim()==="4/4")item.textContent=String(external.length)+"/"+String(stateNative.displays.length);}
        const badge=document.getElementById("programBadgeText");
        if(badge)badge.textContent="Programa · Demo visual";
        const programState=document.getElementById("programStateLabel");
        if(programState)programState.textContent="Sin motor de proyección";
    }
    async function refreshDisplays() {
        try {
            const data=await api.displays();
            stateNative.displays=data.displays;
            stateNative.operatorId=data.operatorDisplayId;
            stateNative.mainId=data.mainDisplayId;
            stateNative.selected=new Set([...stateNative.selected].filter(id=>data.displays.some(d=>d.id===id)));
            if(data.mainDisplayId && !stateNative.selected.size)stateNative.selected.add(data.mainDisplayId);
            renderDisplayViews();
        } catch(err){toast("Error al detectar pantallas: "+err.message);}
    }
    async function openScreens(){
        await refreshDisplays();
        showModal("Pantallas y salidas de escritorio");
        const holder=content();
        holder.innerHTML='<p style="color:#cbd5e1;margin-bottom:13px;">Estas son las pantallas que Windows/Electron detecta de verdad. Primero selecciona el monitor del operador, luego el principal JA. Las salidas NDI se integrarán a través del motor FreeShow; todavía no se emiten desde este prototipo.</p>';
        const select=(id,label,selected,filter)=>{
            const row=document.createElement("label");row.style.cssText="display:block;margin:12px 0;";
            const cap=document.createElement("div");cap.textContent=label;cap.style.marginBottom="6px";row.append(cap);
            const input=document.createElement("select");input.id=id;input.style.cssText="background:#06122c;border:1px solid #315389;border-radius:7px;color:white;padding:8px;width:100%;";
            const blank=document.createElement("option");blank.value="";blank.textContent="— Sin asignar —";input.append(blank);
            stateNative.displays.filter(filter).forEach(d=>{const option=document.createElement("option");option.value=d.id;option.textContent=d.name+" — "+d.size.width+"×"+d.size.height+(d.primary?" (principal de Windows)":"");input.append(option);});
            input.value=selected;row.append(input);return row;
        };
        holder.append(select("jaNativeOperator","Monitor del operador",stateNative.operatorId,()=>true));
        holder.append(select("jaNativeMain","Proyector principal JA",stateNative.mainId,d=>d.id!==stateNative.operatorId));
        const save=newButton("Guardar asignaciones",async()=>{
            try {
                const operator=document.getElementById("jaNativeOperator").value;
                const main=document.getElementById("jaNativeMain").value;
                // Clear an old main assignment before changing operator if it would conflict.
                if(operator && operator===main)throw Error("Operador y principal deben ser distintos");
                if(main && main===stateNative.operatorId && operator!==stateNative.operatorId)await api.setMain("");
                if(operator)await api.setOperator(operator);
                await api.setMain(main);
                await refreshDisplays();toast("Asignaciones guardadas (sin iniciar proyección).");void openScreens();
            }catch(error){toast(error.message);}
        });
        holder.append(save);
        const footer=document.createElement("p");footer.style.cssText="color:#f7c46e;margin-top:18px;";
        footer.textContent="Estado: detección real funcionando; creación de ventanas de salida, NDI y sincronización audiovisuales pendientes de integrar.";holder.append(footer);
    }
    async function openLibrary() {
        showModal("Bibliotecas y carpetas vinculadas");
        const holder=content();
        holder.innerHTML="";
        const info=await api.folderInfo();
        const title=document.createElement("p");
        title.style.cssText="color:#bdd4fc;margin-bottom:12px;";
        title.textContent="Carpeta independiente: "+info.root+" — las carpetas externas no se modifican.";
        holder.append(title);
        const bar=document.createElement("div");bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;";
        CATEGORIES.forEach(category=>{
            const btn=newButton(category,()=>{stateNative.category=category;void openLibrary();});
            btn.style.background=stateNative.category===category?"#145f84":"#102652";bar.append(btn);
        });
        holder.append(bar);
        const buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px;";
        buttons.append(newButton("+ Vincular carpeta externa",async()=>{
            try {const res=await api.selectFolder(stateNative.category);if(!res.cancelled){toast("Carpeta vinculada sin copiar archivos");void openLibrary();}}catch(err){toast(err.message);}
        }));
        buttons.append(newButton("Actualizar catálogo",()=>void openLibrary()));holder.append(buttons);
        let library;
        try { library=await api.library(stateNative.category); }catch(err){holder.append(document.createTextNode(err.message));return;}
        const inf=document.createElement("p");inf.style.cssText="color:#afc9ed;margin-bottom:11px;";
        inf.textContent=library.items.length+" archivo(s). "+(library.truncated?"Listado limitado por seguridad. ":"")+(library.missing.length?"Carpetas no disponibles: "+library.missing.join(", "):"");
        holder.append(inf);
        stateNative.files=library.items;
        const list=document.createElement("div");list.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px;";
        if(!library.items.length){list.textContent="No hay archivos en esta categoría. Puedes copiarlos a la carpeta JA o vincular una carpeta existente.";}
        library.items.slice(0,180).forEach((item,index)=>{
            const box=document.createElement("div");box.style.cssText="display:flex;flex-direction:column;gap:5px;padding:9px;border:1px solid #284876;border-radius:8px;background:#091c3c;";
            const filename=document.createElement("div");filename.textContent=item.name;filename.style.cssText="overflow-wrap:anywhere;font-weight:600;";
            const sub=document.createElement("small");sub.textContent=item.extension+" · "+Math.round(item.size/1024)+" KB";sub.style.color="#b9c9e9";
            const actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px;";
            actions.append(newButton("Vista previa",()=>void previewFile(index)));
            actions.append(newButton("Abrir",async()=>{const msg=await api.openMedia(item.path);if(msg)toast(msg);}));
            box.append(filename,sub,actions);list.append(box);
        });
        holder.append(list);
    }
    async function previewFile(index) {
        const item=stateNative.files[index];if(!item)return;
        try{
            const url=await api.mediaUrl(item.path);
            const box=document.getElementById("previewCanvasContent");box.replaceChildren();
            const ext=item.extension;
            let node;
            if([".jpg",".jpeg",".png",".gif",".webp",".svg"].includes(ext)){
                node=document.createElement("img");node.src=url;node.alt=item.name;
            } else if([".mp4",".webm",".mov",".mkv",".avi"].includes(ext)){
                node=document.createElement("video");node.src=url;node.controls=true;node.muted=true;node.playsInline=true;
            } else if([".mp3",".wav",".m4a",".ogg",".flac"].includes(ext)){
                node=document.createElement("audio");node.src=url;node.controls=true;node.muted=true;
            } else {await api.openMedia(item.path);toast("Abierto con aplicación externa (sin proyección).");return;}
            node.style.cssText="width:100%;height:100%;object-fit:contain;background:black;";
            box.append(node);
            modal.style.display="none";toast("Vista previa local cargada: "+item.name+" (no proyectada)");
        }catch(error){toast(error.message);}
    }
    async function openProjects(){
        showModal("Proyectos y escenarios preparados");
        const holder=content();holder.innerHTML="";
        const info=document.createElement("p");info.style.cssText="color:#bdcef1;margin-bottom:14px;";
        info.textContent="Los proyectos se guardan en disco con escritura atómica. Abrir o editar un escenario no inicia ninguna proyección.";holder.append(info);
        const create=newButton("+ Nuevo proyecto",async()=>{
            const name=window.prompt("Nombre del proyecto (ej. Culto sábado, Campaña especial):");
            if(!name)return;
            try{stateNative.activeProject=await api.createProject(name);await openProjects();toast("Proyecto creado y guardado.");}
            catch(error){toast(error.message);}
        });holder.append(create);
        const all=await api.projects();stateNative.projects=all;
        const list=document.createElement("div");list.style.cssText="display:flex;flex-direction:column;gap:9px;margin-top:14px;";
        for(const project of all){
            const row=document.createElement("div");row.style.cssText="padding:12px;background:#091e42;border:1px solid #284876;border-radius:9px;";
            const title=document.createElement("strong");title.textContent=project.name+" · "+project.scenarios.length+" escenarios";row.append(title);
            const actions=document.createElement("div");actions.style.cssText="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;";
            actions.append(newButton("Preparar proyecto",()=>{stateNative.activeProject=project;const label=document.getElementById("activeProjectLabel");if(label)label.textContent="Proyecto: "+project.name;toast("Proyecto preparado sin modificar salidas.");}));
            actions.append(newButton("+ Escenario",async()=>{
                const name=window.prompt("Nombre del escenario");if(!name)return;
                try {const updated=await api.saveProject({...project,scenarios:[...project.scenarios,{id:String(Date.now())+"-"+Math.random().toString(16).slice(2),name,items:[]}]});stateNative.activeProject=updated;void openProjects();toast("Escenario guardado.");}
                catch(error){toast(error.message);}
            }));
            row.append(actions);
            project.scenarios.forEach(sc=>{const item=document.createElement("p");item.style.cssText="color:#b4d1ee;padding:5px 0 0 7px;";item.textContent="Escenario: "+sc.name;row.append(item);});
            list.append(row);
        }
        if(!all.length)list.textContent="Todavía no hay proyectos. Crea uno para preparar escenarios.";
        holder.append(list);
    }
    function addAccess() {
        const header=document.querySelector("header");
        if(!header)return;
        const container=document.createElement("div");
        container.style.cssText="display:flex;gap:6px;align-items:center;";
        container.append(newButton("📂 Biblioteca real",()=>void openLibrary()));
        container.append(newButton("🗂 Proyectos",()=>void openProjects()));
        container.append(newButton("🖥 Pantallas",()=>void openScreens()));
        const badge=document.createElement("span");badge.textContent="BETA · salida audiovisual pendiente";
        badge.style.cssText="font-size:10px;color:#fac67c;white-space:nowrap;";container.append(badge);
        header.append(container);
    }
    // Replace renderers that would otherwise always paint four imaginary monitors.
    if(typeof window.renderQuickTargetBar==="function")window.renderQuickTargetBar=()=>renderDisplayViews();
    if(typeof window.renderMultiscreenCards==="function")window.renderMultiscreenCards=()=>renderDisplayViews();
    blockDemoActions();
    window.addEventListener("DOMContentLoaded",async()=>{
        addAccess();await refreshDisplays();
        api.onDisplaysChanged(()=>void refreshDisplays());
        try{const info=await api.info();if(info.projectionEngineReady)toast("Motor de proyección disponible");}
        catch(error){toast(error.message);}
    });
})();
