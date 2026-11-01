"use strict";
const {app,BrowserWindow,dialog,ipcMain,screen,shell} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const {pathToFileURL} = require("node:url");
const store = require("./core.cjs");
const bible = require("./bible.cjs");
const policy = require("./projection-policy.cjs");

let mainWindow=null;
let root="";
const sessions=new Map();
let sessionCounter=0;
function projectionState(){
    return [...sessions.entries()].map(([id,value])=>({displayId:id,kind:value.kind||"empty",title:value.title||"",state:value.state||"empty",message:value.message||"",muted:value.muted!==false}));
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
    data.muted=content.muted!==false;data.message="";
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
    return {displays:displays(),operatorDisplayId:settings.operatorDisplayId || String(screen.getPrimaryDisplay().id),mainDisplayId:settings.mainDisplayId};
}
function createWindow() {
    const file=path.join(__dirname,"console.html");
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
    mainWindow.on("closed",()=>{mainWindow=null;});
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
    ipcMain.handle("ja:projection:state",()=>projectionState());
    ipcMain.handle("ja:projection:media",async(_event,file,displayId)=>{
        const allowed=store.findAllowedFile(root,file),kind=policy.mediaKind(allowed);
        const muted=String(displayId)!==store.loadSettings(root).mainDisplayId;
        return sendContent(displayId,{kind,url:pathToFileURL(allowed).href,muted},path.basename(allowed),kind);
    });
    ipcMain.handle("ja:projection:verse",async(_event,file,book,chapter,verse,displayId)=>{
        const parsed=bible.parseBible(allowedBible(file)),current=bible.chapter(parsed,book,chapter);
        const v=current.verses[Number(verse)];
        if(!v)throw Error("Selecciona un versículo válido");
        const content=policy.safeVerse({text:v.text,reference:current.reference+":"+v.number});
        return sendContent(displayId,{kind:"verse",...content,muted:true},content.reference,"verse");
    });
    ipcMain.handle("ja:projection:command",async(_event,displayId,action)=>{
        const command=policy.validateCommand(action);
        policy.chooseDisplay(displays(),operatorId(),displayId);
        if(command==="black"&&!sessions.has(String(displayId)))await destination(displayId);
        const output=sessions.get(String(displayId));
        if(!output||output.window.isDestroyed())throw Error("La pantalla aún no tiene una sesión activa");
        output.window.webContents.send("ja:output:render",{action:command});
        if(command==="black")output.state="black";
        if(command==="clear"){output.state="empty";output.kind="empty";output.title="";}
        if(command==="pause")output.state="paused";
        notifyProjection();return projectionState();
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
app.on("before-quit",()=>{for(const output of sessions.values())if(!output.window.isDestroyed())output.window.close();sessions.clear();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
