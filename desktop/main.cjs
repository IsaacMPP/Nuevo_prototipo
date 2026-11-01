"use strict";
const {app,BrowserWindow,dialog,ipcMain,screen,shell} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const {pathToFileURL} = require("node:url");
const store = require("./core.cjs");

let mainWindow=null;
let root="";
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
    const file=path.join(__dirname,"..","build","index.html");
    if(!fs.existsSync(file)){
        dialog.showErrorBox("Falta compilar interfaz", "Ejecuta npm run build:ui antes de iniciar el escritorio");
        app.quit();return;
    }
    mainWindow=new BrowserWindow({
        width:1600,height:960,minWidth:1024,minHeight:650,
        title:"JA Nuevo Prototipo · Escritorio experimental",
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
    ipcMain.handle("ja:info",()=>({root,version:app.getVersion(),mode:"desktop-experimental",projectionEngineReady:false}));
    ipcMain.handle("ja:displays",()=>currentDisplays());
    ipcMain.handle("ja:set-operator",(_event,id)=>{
        ensureDisplay(id);
        const settings=store.loadSettings(root);
        if(settings.mainDisplayId===String(id)) throw Error("La pantalla de control no puede ser al mismo tiempo Principal JA");
        settings.operatorDisplayId=String(id);store.saveSettings(root,settings);return currentDisplays();
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
app.whenReady().then(()=>{
    root=store.ensureStructure(store.dataRoot(app.getPath("documents")));
    registerIpc();createWindow();
    const notify=()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send("ja:displays-changed",currentDisplays());};
    screen.on("display-added",notify);
    screen.on("display-removed",notify);
    screen.on("display-metrics-changed",notify);
    app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
}).catch(err=>{dialog.showErrorBox("No se pudo iniciar JA",String(err));app.quit();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
