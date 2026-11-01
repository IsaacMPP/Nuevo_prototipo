"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const bibleStyle=require("./bible-style.cjs");

const FOLDERS = Object.freeze([
    "Biblias", "Himnario Adventista", "Cantos Juveniles",
    "Fondos Personalizados", "Audio", "Imagenes", "Videos",
    "Importaciones", "Presentaciones", "Cache", "Configuracion", "Proyectos"
]);
const ACCEPTED = Object.freeze({
    Biblias: [".fsb", ".xml", ".xmm", ".json"],
    "Himnario Adventista": [".mp4", ".webm", ".mkv", ".avi", ".mov"],
    "Cantos Juveniles": [".mp4", ".webm", ".mkv", ".avi", ".mov", ".mp3", ".wav"],
    "Fondos Personalizados": [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm"],
    Audio: [".mp3", ".wav", ".ogg", ".m4a", ".flac"],
    Imagenes: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    Videos: [".mp4", ".webm", ".mkv", ".avi", ".mov"],
    Importaciones: [".fsb", ".json", ".xml", ".xmm", ".mp4", ".webm", ".mkv", ".avi", ".mov", ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".pptx", ".ppt", ".mp3", ".wav"],
    Presentaciones: [".pdf", ".pptx", ".ppt", ".odp", ".json"]
});
function dataRoot(documents) { return path.join(documents, "JA Proyecciones 2 - Prototipo"); }
function ensureStructure(root) {
    fs.mkdirSync(root, {recursive:true});
    for (const folder of FOLDERS) fs.mkdirSync(path.join(root, folder), {recursive:true});
    return root;
}
function validCategory(value) { return FOLDERS.includes(value) && !["Cache", "Configuracion", "Proyectos"].includes(value); }
function atomicJson(file, data) {
    fs.mkdirSync(path.dirname(file), {recursive:true});
    const tmp = file + "." + crypto.randomUUID() + ".tmp";
    try {
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), {encoding:"utf8",flag:"wx"});
        fs.renameSync(tmp, file);
    } finally { if (fs.existsSync(tmp)) fs.rmSync(tmp, {force:true}); }
}
function readJson(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    try { return JSON.parse(fs.readFileSync(file,"utf8")); } catch { return fallback; }
}
function settingsFile(root) { return path.join(root, "Configuracion", "ajustes.json"); }
function backupSettingsFile(root){return path.join(root,"Configuracion","ajustes.backup.json");}
function parseSettings(file){
    if(!fs.existsSync(file))return null;
    const value=JSON.parse(fs.readFileSync(file,"utf8"));
    if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Configuración sin estructura válida");
    return value;
}
function settingsHealth(root){
    const file=settingsFile(root);
    if(!fs.existsSync(file))return {status:"new",backupAvailable:fs.existsSync(backupSettingsFile(root))};
    try{parseSettings(file);return {status:"ok",backupAvailable:fs.existsSync(backupSettingsFile(root))};}
    catch{return {status:"corrupt",backupAvailable:fs.existsSync(backupSettingsFile(root))};}
}
function loadSettings(root) {
    let obj={};
    try{obj=parseSettings(settingsFile(root))||{};}
    catch{try{obj=parseSettings(backupSettingsFile(root))||{};}catch{obj={};}}
    const folders={};
    if(obj.linkedFolders&&typeof obj.linkedFolders==="object"&&!Array.isArray(obj.linkedFolders)){
        for(const [key,paths] of Object.entries(obj.linkedFolders)){
            if(validCategory(key)&&Array.isArray(paths))folders[key]=paths.filter(p=>typeof p==="string"&&p.length>0).slice(0,100);
        }
    }
    return {configVersion:1,revision:Number.isSafeInteger(obj.revision)&&obj.revision>=0?obj.revision:0,
        linkedFolders:folders,operatorDisplayId:String(obj.operatorDisplayId||""),
        mainDisplayId:String(obj.mainDisplayId||""),bibleStyle:bibleStyle.normalize(obj.bibleStyle)};
}
function saveSettings(root,settings){
    if(settingsHealth(root).status==="corrupt")throw Error("El archivo de ajustes está dañado. Abre Configuración > Diagnóstico para recuperar el respaldo antes de guardar.");
    const normalized={
        configVersion:1,
        revision:loadSettings(root).revision+1,
        linkedFolders:settings.linkedFolders,
        operatorDisplayId:String(settings.operatorDisplayId||""),
        mainDisplayId:String(settings.mainDisplayId||""),
        bibleStyle:bibleStyle.normalize(settings.bibleStyle)
    };
    const file=settingsFile(root);
    if(fs.existsSync(file))fs.copyFileSync(file,backupSettingsFile(root));
    atomicJson(file,normalized);
    return normalized;
}
function recoverSettings(root){
    if(settingsHealth(root).status!=="corrupt")throw Error("No se requiere reparación");
    let backup;
    try{backup=parseSettings(backupSettingsFile(root));}
    catch{throw Error("No existe una copia válida. No se reemplazará la configuración dañada.");}
    if(!backup)throw Error("No existe una copia válida");
    const file=settingsFile(root);
    const damaged=file+".corrupt-"+crypto.randomUUID()+".json";
    fs.copyFileSync(file,damaged);
    atomicJson(file,backup);
    return {recovered:true,damagedFile:damaged};
}
function unlinkFolder(root,category,folder){
    if(!validCategory(category))throw Error("Categoría inválida");
    if(typeof folder!=="string"||!folder)throw Error("Carpeta externa inválida");
    const settings=loadSettings(root);
    const original=Array.isArray(settings.linkedFolders[category])?settings.linkedFolders[category]:[];
    const target=path.normalize(path.resolve(folder)).toLowerCase();
    const filtered=original.filter(p=>path.normalize(path.resolve(p)).toLowerCase()!==target);
    if(filtered.length===original.length)throw Error("La carpeta no está vinculada en esa categoría");
    settings.linkedFolders[category]=filtered;
    saveSettings(root,settings);
    return filtered;
}
function linkFolder(root, category, folder) {
    if (!validCategory(category)) throw Error("Categoría inválida");
    const full=path.resolve(folder);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw Error("La carpeta no existe");
    const settings=loadSettings(root);
    const list=Array.isArray(settings.linkedFolders[category]) ? settings.linkedFolders[category] : [];
    if (!list.some(item => path.normalize(item).toLowerCase() === full.toLowerCase())) list.push(full);
    settings.linkedFolders[category]=list;
    saveSettings(root,settings);
    return list;
}
function listLibrary(root, category, max=3000) {
    if (!validCategory(category)) throw Error("Categoría inválida");
    const s=loadSettings(root);
    const roots=[path.join(root,category),...(Array.isArray(s.linkedFolders[category])?s.linkedFolders[category]:[])];
    const result=[], missing=[], visited=new Set();
    for (const dir of roots) {
        const full=path.resolve(dir);
        if (!fs.existsSync(full)) { missing.push(full); continue; }
        const queue=[{folder:full,depth:0}];
        while (queue.length && result.length<max) {
            const item=queue.shift();
            if (!item) break;
            let entries=[];
            try {entries=fs.readdirSync(item.folder,{withFileTypes:true});} catch { missing.push(item.folder);continue; }
            for (const entry of entries) {
                if (entry.isSymbolicLink()) continue;
                const file=path.join(item.folder,entry.name);
                if (entry.isDirectory() && item.depth<3) {queue.push({folder:file,depth:item.depth+1});continue;}
                if (!entry.isFile()) continue;
                const ext=path.extname(entry.name).toLowerCase();
                if (!ACCEPTED[category].includes(ext)) continue;
                const norm=path.normalize(file).toLowerCase();
                if (visited.has(norm)) continue;
                visited.add(norm);
                let stat;try{stat=fs.statSync(file);}catch{continue;}
                result.push({name:entry.name,path:file,extension:ext,size:stat.size,modified:stat.mtimeMs,category});
                if(result.length>=max)break;
            }
        }
    }
    result.sort((a,b)=>a.name.localeCompare(b.name,"es",{numeric:true,sensitivity:"base"}));
    return {items:result,missing,truncated:result.length>=max,folders:roots};
}
function projectFile(root,id) {
    if(!/^[a-f\d-]{36}$/.test(String(id)))throw Error("Identificador de proyecto inválido");
    return path.join(root,"Proyectos",id+".json");
}
function sanitizeProject(value) {
    const name=String(value?.name||"Nuevo proyecto").trim().slice(0,120);
    if(!name)throw Error("El nombre no puede quedar vacío");
    const scenarios=Array.isArray(value?.scenarios)?value.scenarios.slice(0,200):[];
    return {name,scenarios, items:Array.isArray(value?.items)?value.items.slice(0,1000):[],lastOpenedAt:new Date().toISOString()};
}
function createProject(root,name) {
    const id=crypto.randomUUID();
    const data={id,...sanitizeProject({name}),createdAt:new Date().toISOString(),revision:1};
    atomicJson(projectFile(root,id),data);
    return data;
}
function saveProject(root,input) {
    const file=projectFile(root,input?.id);
    const previous=readJson(file,null);
    if(!previous)throw Error("Proyecto no encontrado");
    if(input.revision !== previous.revision)throw Error("Conflicto: versión distinta; vuelve a cargar");
    const data={...previous,...sanitizeProject(input),revision:previous.revision+1};
    atomicJson(file,data);
    return data;
}
function listProjects(root) {
    const dir=path.join(root,"Proyectos");
    if(!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(n=>/^[a-f\d-]{36}\.json$/.test(n)).map(n=>readJson(path.join(dir,n),null)).filter(Boolean).sort((a,b)=>String(b.lastOpenedAt||"").localeCompare(String(a.lastOpenedAt||"")));
}
function findAllowedFile(root,candidate) {
    const target=path.resolve(candidate);
    if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw Error("Archivo no autorizado");
    const realTarget=fs.realpathSync(target);
    const s=loadSettings(root);
    const allowed=FOLDERS.filter(validCategory).some(cat=>{
        const dirs=[path.join(root,cat),...(Array.isArray(s.linkedFolders[cat])?s.linkedFolders[cat]:[])];
        return dirs.some(dir=>{
            try {
                const realRoot=fs.realpathSync(dir);
                const rel=path.relative(realRoot,realTarget);
                return !!rel && rel!==".." && !rel.startsWith(".."+path.sep) && !path.isAbsolute(rel) &&
                    !!ACCEPTED[cat]?.includes(path.extname(realTarget).toLowerCase());
            } catch {return false;}
        });
    });
    if(!allowed)throw Error("Archivo no autorizado");
    return realTarget;
}
module.exports={FOLDERS,ACCEPTED,dataRoot,ensureStructure,validCategory,atomicJson,readJson,loadSettings,saveSettings,settingsHealth,recoverSettings,unlinkFolder,linkFolder,listLibrary,createProject,saveProject,listProjects,findAllowedFile};
