"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const core = require("../desktop/core.cjs");
function fresh(t){
    const root=core.dataRoot(fs.mkdtempSync(path.join(os.tmpdir(),"ja-prototipo-")));
    t.after(()=>fs.rmSync(path.dirname(root),{recursive:true,force:true}));
    return core.ensureStructure(root);
}
test("carpetas independientes y módulos presentes",t=>{
    const root=fresh(t);
    assert.match(root,/JA Proyecciones 2 - Prototipo$/);
    for(const f of core.FOLDERS)assert.equal(fs.existsSync(path.join(root,f)),true,f);
});
test("vincular archivos externos no mueve ni borra originales",t=>{
    const root=fresh(t);
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),"ja-external-"));
    t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
    const name=path.join(folder,"Himno 001.mp4");
    fs.writeFileSync(name,"datos-de-prueba");
    core.linkFolder(root,"Himnario Adventista",folder);
    core.linkFolder(root,"Himnario Adventista",folder);
    const content=core.listLibrary(root,"Himnario Adventista");
    assert.equal(content.items.length,1);
    assert.equal(content.items[0].name,"Himno 001.mp4");
    assert.deepEqual(core.loadSettings(root).linkedFolders["Himnario Adventista"],[folder]);
    assert.equal(fs.readFileSync(name,"utf8"),"datos-de-prueba");
});
test("una categoría no mezcla contenido de otras",t=>{
    const root=fresh(t);
    fs.writeFileSync(path.join(root,"Videos","clip.mp4"),"sample");
    fs.writeFileSync(path.join(root,"Himnario Adventista","001.mp4"),"hymn");
    assert.deepEqual(core.listLibrary(root,"Videos").items.map(x=>x.name),["clip.mp4"]);
    assert.deepEqual(core.listLibrary(root,"Himnario Adventista").items.map(x=>x.name),["001.mp4"]);
});
test("proyecto: persistencia, revisión y escenarios",t=>{
    const root=fresh(t);
    let p=core.createProject(root,"Culto especial");
    assert.equal(core.listProjects(root).length,1);
    p=core.saveProject(root,{...p,scenarios:[{id:"esc1",name:"Bienvenida",items:[]}]});
    assert.equal(p.scenarios.length,1);
    assert.equal(p.revision,2);
    assert.equal(core.listProjects(root)[0].scenarios[0].name,"Bienvenida");
    assert.throws(()=>core.saveProject(root,{...p,revision:1}),/Conflicto/);
});
test("rechaza categorías o rutas no autorizadas",t=>{
    const root=fresh(t);
    assert.throws(()=>core.linkFolder(root,"../../app","/"),/Categoría inválida/);
    assert.throws(()=>core.findAllowedFile(root,path.join(root,"Configuracion","ajustes.json")),/no autorizado/i);
    assert.throws(()=>core.saveProject(root,{id:"../../escape",revision:1}),/Identificador/);
});
test("carpeta externa desconectada no se borra de la configuración",t=>{
    const root=fresh(t);
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),"ja-external-"));
    core.linkFolder(root,"Videos",folder);
    fs.rmSync(folder,{recursive:true,force:true});
    const content=core.listLibrary(root,"Videos");
    assert.deepEqual(content.missing,[folder]);
    assert.equal(core.loadSettings(root).linkedFolders.Videos.includes(folder),true);
});

test("Importaciones usa lista blanca y lectura segura de medios",t=>{
    const root=fresh(t);
    fs.writeFileSync(path.join(root,"Importaciones","recurso.pdf"),"%PDF-test");
    fs.writeFileSync(path.join(root,"Importaciones","peligro.exe"),"MZ");
    assert.equal(core.listLibrary(root,"Importaciones").items.length,1);
    assert.ok(core.findAllowedFile(root,path.join(root,"Importaciones","recurso.pdf")).endsWith("recurso.pdf"));
    assert.throws(()=>core.findAllowedFile(root,path.join(root,"Importaciones","peligro.exe")),/no autorizado/i);
});
