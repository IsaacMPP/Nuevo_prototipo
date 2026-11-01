"use strict";
const {app,BrowserWindow,Menu,dialog,ipcMain,screen,shell} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const {pathToFileURL} = require("node:url");
const store = require("./core.cjs");
const bible = require("./bible.cjs");
const policy = require("./projection-policy.cjs");
const scriptureStyle=require("./bible-style.cjs");
const settingsPolicy=require("./settings-policy.cjs");
const transitions=require("./transition-engine.cjs");
const sessionPolicy=require("./session-policy.cjs");

let mainWindow=null;
let root="";
const sessions=new Map();
let quitting=false;
function closeAllOutputs(){
  for(const [id,data] of [...sessions.entries()]){
    sessions.delete(id);
    if(!data.window.isDestroyed())data.window.destroy();
  }
  notifyProjection();
}
let sessionCounter=0;
function projectionState(){
    return [...sessions.entries()].map(([id,value])=>({displayId:id,kind:value.kind||"empty",title:value.title||"",state:value.state||"empty",message:value.message||"",muted:value.muted!==false,position:value.position||0,duration:value.duration||0,volume:value.volume??100,verse:value.kind==="verse"?value.verse:null}));
}
function notifyProjection(){
    if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send("ja:projection:changed",projectionState());
}
function operatorId(){
    const preferred=store.loadSettings(root).operatorDisplayId;
    return displays().some(d=>d.id===preferred)?preferred:String(screen.getPrimaryDisplay().id);
}
async function destination(id){
    const display=policy.chooseDisplay(displays(),operatorId(),id);
    const key=String(display.id);
    let data=sessions.get(key);
    if(data&&!data.window.isDestroyed())return data;
    const win=new BrowserWindow({
        x:display.bounds.x,y:display.bounds.y,width:display.bounds.width,height:display.bounds.height,
        frame:false,fullscreen:true,show:false,backgroundColor:"#000000",skipTaskbar:true,
        title:"JA Proyecciones · Salida "+key,
        webPreferences:{preload:path.join(__dirname,"output-preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
    });
    data={window:win,state:"empty",kind:"empty",title:"",session:0,muted:true};
    sessions.set(key,data);
    win.on("closed",()=>{if(sessions.get(key)===data)sessions.delete(key);notifyProjection();});
    win.webContents.on("will-navigate",event=>event.preventDefault());
    win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
    await win.loadFile(path.join(__dirname,"output.html"));
    win.showInactive();
    notifyProjection();
    return data;
}
function removeLostOutputs(){
    const ids=new Set(displays().map(d=>d.id));
    for(const [key,s] of sessions) {
        if(!ids.has(key)||key===operatorId()){
            sessions.delete(key);
            if(!s.window.isDestroyed())s.window.close();
        }
    }
    notifyProjection();
}
function allowedBible(file){
    const bundled=path.join(__dirname,"assets","rv1909.fsb");
    if(file==="builtin:rv1909"&&fs.existsSync(bundled))return bundled;
    const allowed=store.findAllowedFile(root,file);
    if(![".fsb",".json"].includes(path.extname(allowed).toLowerCase()))throw Error("Se requiere FSB/JSON");
    return allowed;
}
async function sendContent(target,content,title,kind){
    const data=await destination(target);
    const session=++sessionCounter;
    data.session=session;
    data.state="loading";data.kind=kind;data.title=title;
    data.muted=content.muted!==false;data.message="";data.position=0;data.duration=0;data.volume=100;
    data.sourceBible=kind==="verse"?content.sourceBible:null;
    data.verse=kind==="verse"?{text:content.text,reference:content.reference,style:content.style}:null;
    data.window.webContents.send("ja:output:render",{action:"show",session,content});
    notifyProjection();
    return projectionState();
}

function displays() {
    const primary=screen.getPrimaryDisplay();
    return screen.getAllDisplays().map(d=>({
        id:String(d.id),
        name:String(d.label||"Monitor sin nombre"),
        primary:primary.id===d.id,
        bounds:{x:d.bounds.x,y:d.bounds.y,width:d.bounds.width,height:d.bounds.height},
        size:{width:d.size.width,height:d.size.height},
        scaleFactor:d.scaleFactor
    }));
}
function currentDisplays() {
    const settings=store.loadSettings(root);
    const monitorIds=new Set(displays().map(d=>d.id));
    const effectiveOperator=monitorIds.has(settings.operatorDisplayId)?settings.operatorDisplayId:String(screen.getPrimaryDisplay().id);
    return {displays:displays(),operatorDisplayId:effectiveOperator,
        storedOperatorDisplayId:settings.operatorDisplayId,operatorNeedsReview:!!settings.operatorDisplayId&&!monitorIds.has(settings.operatorDisplayId),
        mainDisplayId:settings.mainDisplayId};
}
function createWindow() {
    Menu.setApplicationMenu(null); // the approved UI has no default File/Edit/View toolbar
    const file=path.join(__dirname,"..","build","index.html");
    if(!fs.existsSync(file)){
        dialog.showErrorBox("Falta compilar interfaz", "Ejecuta npm run build:ui antes de iniciar el escritorio");
        app.quit();return;
    }
    mainWindow=new BrowserWindow({
        width:1600,height:960,minWidth:1024,minHeight:650,
        title:"JA Proyecciones · Motor propio",
        backgroundColor:"#050e24",
        webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:false,webSecurity:true}
    });
    mainWindow.loadFile(file);
    mainWindow.webContents.setWindowOpenHandler(({url})=>{
        try {const u=new URL(url);if(u.protocol==="https:"||u.protocol==="http:"){void shell.openExternal(url);}} catch{}
        return {action:"deny"};
    });
    mainWindow.webContents.on("will-navigate",(event,url)=>{
        if(url!==pathToFileURL(file).href){event.preventDefault();}
    });
    mainWindow.on("closed",()=>{
        mainWindow=null;
        // Projection windows must never keep the app alive after the operator closes JA.
        if(!quitting){quitting=true;closeAllOutputs();app.quit();}
    });
}
function ensureDisplay(id) {
    const matched=displays().find(d=>d.id===String(id));
    if(!matched)throw Error("Pantalla no conectada");
    return matched;
}
function registerIpc() {
    ipcMain.handle("ja:info",()=>({root,version:app.getVersion(),mode:"native-functional-v1",projectionEngineReady:true}));
    ipcMain.handle("ja:bible:list",()=>{
        const entries=store.listLibrary(root,"Biblias").items.filter(x=>[".fsb",".json"].includes(x.extension));
        if(fs.existsSync(path.join(__dirname,"assets","rv1909.fsb")))
            entries.unshift({name:"Reina-Valera 1909 (incluida)",path:"builtin:rv1909",extension:".fsb",category:"Biblias"});
        return entries;
    });
    ipcMain.handle("ja:bible:import",async()=>{
        const pick=await dialog.showOpenDialog(mainWindow,{title:"Importar Biblia FSB/JSON",properties:["openFile"],filters:[{name:"Biblia FSB o JSON",extensions:["fsb","json"]}]});
        if(pick.canceled)return {cancelled:true};
        const file=bible.importBible(root,pick.filePaths[0]);
        return {cancelled:false,file};
    });
    ipcMain.handle("ja:bible:structure",(_event,file)=>bible.structure(bible.parseBible(allowedBible(file))));
    ipcMain.handle("ja:bible:chapter",(_event,file,b,c)=>bible.chapter(bible.parseBible(allowedBible(file)),b,c));
    ipcMain.handle("ja:bible:style:get",()=>store.loadSettings(root).bibleStyle);
    ipcMain.handle("ja:bible:style:save",(_event,raw)=>{
        const style=scriptureStyle.normalize(raw);
        if(style.background==="image"){
            if(!style.backgroundFile)throw Error("Selecciona un fondo de imagen");
            const images=store.listLibrary(root,"Fondos Personalizados").items;
            const file=store.findAllowedFile(root,style.backgroundFile);
            if(!images.some(x=>x.path===file))throw Error("El fondo debe estar en Fondos Personalizados");
            if(![".png",".jpg",".jpeg",".webp"].includes(path.extname(file).toLowerCase()))throw Error("Usa JPG, PNG o WebP para fondos bíblicos");
            style.backgroundFile=file;
        }
        const settings=store.loadSettings(root);settings.bibleStyle=style;store.saveSettings(root,settings);
        for(const [id,output] of sessions){
            if(output.kind==="verse"&&!output.window.isDestroyed()){
                const applied={...style,backgroundUrl:style.background==="image"?pathToFileURL(style.backgroundFile).href:""};
                if(output.verse)output.verse.style=applied;
                output.window.webContents.send("ja:output:render",{action:"style",style:applied});
            }
        }
        return style;
    });
    ipcMain.handle("ja:bible:transition:get",()=>store.loadSettings(root).verseTransition);
    ipcMain.handle("ja:bible:transition:save",(_event,value)=>{
        const chosen=transitions.validate(value);
        const current=store.loadSettings(root);
        store.saveSettings(root,{...current,verseTransition:chosen});
        return chosen;
    });
    ipcMain.handle("ja:projection:state",()=>projectionState());
    ipcMain.handle("ja:projection:media",async(_event,file,displayId)=>{
        const allowed=store.findAllowedFile(root,file),kind=policy.mediaKind(allowed);
        const muted=String(displayId)!==store.loadSettings(root).mainDisplayId;
        return sendContent(displayId,{kind,url:pathToFileURL(allowed).href,muted},path.basename(allowed),kind);
    });
    function resolveVerse(file,book,chapter,verse,transitionOverride){
        if(typeof file!=="string"||!file)throw Error("Biblia no seleccionada");
        for(const index of [book,chapter,verse])if(!Number.isSafeInteger(index)||index<0)throw Error("Índice bíblico inválido");
        const parsed=bible.parseBible(allowedBible(file)),current=bible.chapter(parsed,book,chapter);
        const v=current.verses[verse];
        if(!v)throw Error("Selecciona un versículo válido");
        const text=policy.safeVerse({text:v.text,reference:current.reference+":"+v.number});
        const settings=store.loadSettings(root),style=settings.bibleStyle;
        const backgroundUrl=style.background==="image"&&style.backgroundFile?pathToFileURL(store.findAllowedFile(root,style.backgroundFile)).href:"";
        return {kind:"verse",...text,style:{...style,backgroundUrl},transition:transitions.choose(settings.verseTransition,transitionOverride),sourceBible:file,muted:true};
    }
    // In-place update: only affects an already-projecting Bible session, never
    // a video/audio/fondos session and never another output selected elsewhere.
    function updateVerseIfActive(file,book,chapter,verse,displayId,transitionOverride,reveal=false){
        policy.chooseDisplay(displays(),operatorId(),displayId);
        const output=sessions.get(String(displayId));
        const permission=sessionPolicy.canAdvanceVerse(output,file);
        if(!permission.allowed)return {updated:false,reason:permission.reason};
        const content=resolveVerse(file,book,chapter,verse,transitionOverride);
        output.title=content.reference;
        output.verse={text:content.text,reference:content.reference,style:content.style};
        output.state=output.state==="black"&&!reveal?"black":"verse";
        output.message="";
        output.window.webContents.send("ja:output:render",{action:"verse",session:output.session,content,reveal});
        notifyProjection();
        return {updated:true,displayId:String(displayId),reference:content.reference,transition:content.transition};
    }
    ipcMain.handle("ja:projection:verse:update",(_event,file,book,chapter,verse,displayId,transitionOverride)=>
        updateVerseIfActive(file,book,chapter,verse,displayId,transitionOverride));
    ipcMain.handle("ja:projection:verse",async(_event,file,book,chapter,verse,displayId,transitionOverride)=>{
        policy.chooseDisplay(displays(),operatorId(),displayId);
        const existing=sessions.get(String(displayId));
        if(existing&&!existing.window.isDestroyed()&&existing.kind==="verse"&&existing.sourceBible===file){
            const result=updateVerseIfActive(file,book,chapter,verse,displayId,transitionOverride,true);
            return result;
        }
        const content=resolveVerse(file,book,chapter,verse,transitionOverride);
        return sendContent(displayId,content,content.reference,"verse");
    });
    ipcMain.handle("ja:projection:transport",(_event,displayId,command,value)=>{
        policy.chooseDisplay(displays(),operatorId(),displayId);
        const output=sessions.get(String(displayId));
        if(!output||output.window.isDestroyed())throw Error("Salida no activa");
        if(!["volume","seek"].includes(command))throw Error("Control no permitido");
        const number=Number(value);
        if(!Number.isFinite(number))throw Error("Valor no válido");
        if(command==="volume"){
            const volume=Math.max(0,Math.min(100,Math.round(number)));
            output.volume=volume;
            output.window.webContents.send("ja:output:render",{action:"volume",volume});
        }else{
            if(number<0||number>86400)throw Error("Posición fuera de rango");
            output.window.webContents.send("ja:output:render",{action:"seek",position:number});
        }
        notifyProjection();return projectionState();
    });
    ipcMain.handle("ja:projection:command",async(_event,displayId,action)=>{
        const command=policy.validateCommand(action);
        policy.chooseDisplay(displays(),operatorId(),displayId);
        if(command==="black"&&!sessions.has(String(displayId)))await destination(displayId);
        const output=sessions.get(String(displayId));
        if(!output||output.window.isDestroyed())throw Error("La pantalla aún no tiene una sesión activa");
        if(command!=="clear")output.window.webContents.send("ja:output:render",{action:command});
        if(command==="black"){
            if(output.state==="black"){output.state=output.stateBeforeBlack||"empty";}
            else {output.stateBeforeBlack=output.state;output.state="black";}
        }
        if(command==="clear"){
            // Advance the generation so late autoplay/timeupdate from the previous
            // video can never resurrect a cleared session in Program.
            output.session=++sessionCounter;
            output.window.webContents.send("ja:output:render",{action:"clear",session:output.session});
            output.state="empty";output.kind="empty";output.title="";output.sourceBible=null;output.verse=null;
            output.position=0;output.duration=0;output.message="";
        }
        if(command==="clear-text"&&output.kind==="verse"){output.state=output.state==="black"?"black":"background";}
        if(command==="pause"&&(output.kind==="video"||output.kind==="audio"))output.state="paused";
        notifyProjection();return projectionState();
    });
    ipcMain.handle("ja:config:get",()=>{
        const settings=store.loadSettings(root);
        return {settings,health:store.settingsHealth(root),screens:currentDisplays(),
            root,version:app.getVersion(),sessions:projectionState(),
            categories:store.FOLDERS.filter(store.validCategory)};
    });
    ipcMain.handle("ja:config:screens:closeOutputs",()=>{
        // Deliberate operator action only. Never close on mere Settings opening.
        closeAllOutputs();
        return {closed:true};
    });
    ipcMain.handle("ja:config:screens:save",(_event,input)=>{
        const current=store.loadSettings(root);
        const validated=settingsPolicy.validateScreens(input,displays(),current,sessions.size);
        const updated=store.saveSettings(root,{...current,
            operatorDisplayId:validated.operatorDisplayId,mainDisplayId:validated.mainDisplayId});
        if(validated.changed){
            const snapshot=currentDisplays();
            if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send("ja:displays-changed",snapshot);
        }
        return {screens:currentDisplays(),revision:updated.revision};
    });
    ipcMain.handle("ja:config:folder:unlink",(_event,category,folder)=>{
        return store.unlinkFolder(root,category,folder);
    });
    ipcMain.handle("ja:config:recover",()=>{
        if(sessions.size)throw Error("Detén las salidas antes de restaurar ajustes");
        const result=store.recoverSettings(root);
        if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send("ja:displays-changed",currentDisplays());
        return result;
    });
    ipcMain.handle("ja:displays",()=>currentDisplays());
    ipcMain.handle("ja:set-operator",(_event,id)=>{
        ensureDisplay(id);
        const settings=store.loadSettings(root);
        if(settings.mainDisplayId===String(id)) throw Error("La pantalla de control no puede ser al mismo tiempo Principal JA");
        settings.operatorDisplayId=String(id);store.saveSettings(root,settings);removeLostOutputs();return currentDisplays();
    });
    ipcMain.handle("ja:set-main",(_event,id)=>{
        const settings=store.loadSettings(root);
        if(id!==null&&id!==""){
            ensureDisplay(id);
            if(String(id)===(settings.operatorDisplayId||String(screen.getPrimaryDisplay().id)))throw Error("No se puede proyectar sobre el monitor del operador");
        }
        settings.mainDisplayId=String(id||"");store.saveSettings(root,settings);return currentDisplays();
    });
    ipcMain.handle("ja:folders",()=>{
        const settings=store.loadSettings(root);
        return {root,categories:store.FOLDERS.filter(store.validCategory),linkedFolders:settings.linkedFolders};
    });
    ipcMain.handle("ja:folder:select",async(_event,category)=>{
        if(!store.validCategory(category))throw Error("Categoría inválida");
        const result=await dialog.showOpenDialog(mainWindow,{title:"Vincular carpeta de "+category,properties:["openDirectory","multiSelections"]});
        if(result.canceled)return {cancelled:true};
        for(const folder of result.filePaths)store.linkFolder(root,category,folder);
        return {cancelled:false,linked:store.loadSettings(root).linkedFolders[category]};
    });
    ipcMain.handle("ja:library",(_event,category)=>store.listLibrary(root,category));
    ipcMain.handle("ja:media:url",(_event,file)=>pathToFileURL(store.findAllowedFile(root,file)).href);
    ipcMain.handle("ja:media:open",async(_event,file)=>shell.openPath(store.findAllowedFile(root,file)));
    ipcMain.handle("ja:project:list",()=>store.listProjects(root));
    ipcMain.handle("ja:project:create",(_event,name)=>store.createProject(root,name));
    ipcMain.handle("ja:project:save",(_event,data)=>store.saveProject(root,data));
}
app.commandLine.appendSwitch("autoplay-policy","no-user-gesture-required");
app.whenReady().then(()=>{
    root=store.ensureStructure(store.dataRoot(app.getPath("documents")));

    registerIpc();
    ipcMain.on("ja:output:status",(event,message)=>{
        for(const data of sessions.values()){
            if(data.window.webContents===event.sender&&message?.session===data.session){
                data.state=String(message.state||data.state).slice(0,40);
                data.message=String(message.message||"").slice(0,240);
                if(Number.isFinite(message.position))data.position=message.position;
                if(Number.isFinite(message.duration))data.duration=message.duration;
                if(Number.isFinite(message.volume))data.volume=message.volume;
                notifyProjection();break;
            }
        }
    });
    createWindow();
    const notify=()=>{removeLostOutputs();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send("ja:displays-changed",currentDisplays());};
    screen.on("display-added",notify);
    screen.on("display-removed",notify);
    screen.on("display-metrics-changed",notify);
    app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
}).catch(err=>{dialog.showErrorBox("No se pudo iniciar JA",String(err));app.quit();});
app.on("before-quit",()=>{quitting=true;closeAllOutputs();});
app.on("window-all-closed",()=>app.quit());
