"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const core=require("../desktop/core.cjs"),rules=require("../desktop/settings-policy.cjs");
function setup(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),"ja-config-c1-"));
 t.after(()=>fs.rmSync(base,{force:true,recursive:true}));
 return core.ensureStructure(core.dataRoot(base));
}
const screens=[{id:"101",size:{width:1920,height:1080}},{id:"202",size:{width:1280,height:720}}];
test("configuración de pantallas se valida como UNA operación",()=>{
 const prev={operatorDisplayId:"101",mainDisplayId:"",revision:2};
 assert.deepEqual(rules.validateScreens({operatorDisplayId:"101",mainDisplayId:"202",revision:2},screens,prev,0),
  {operatorDisplayId:"101",mainDisplayId:"202",changed:true});
 assert.throws(()=>rules.validateScreens({operatorDisplayId:"101",mainDisplayId:"101",revision:2},screens,prev),/mismo monitor/);
 assert.throws(()=>rules.validateScreens({operatorDisplayId:"101",mainDisplayId:"303",revision:2},screens,prev),/no está conectado/);
 assert.throws(()=>rules.validateScreens({operatorDisplayId:"303",mainDisplayId:"202",revision:2},screens,prev),/operador conectada/);
 assert.throws(()=>rules.validateScreens({operatorDisplayId:"101",mainDisplayId:"202",revision:1},screens,prev),/modificada/);
 assert.throws(()=>rules.validateScreens({operatorDisplayId:"101",mainDisplayId:"202",revision:2},screens,prev,1),/proyección abiertas/);
});
test("esquema versionado conserva bibliotecas y Biblia al guardar destinos",t=>{
 const root=setup(t),external=fs.mkdtempSync(path.join(os.tmpdir(),"ja-ext-"));
 t.after(()=>fs.rmSync(external,{recursive:true,force:true}));
 core.linkFolder(root,"Himnario Adventista",external);
 let cfg=core.loadSettings(root);
 cfg.bibleStyle.fontSize=70;cfg.operatorDisplayId="101";cfg.mainDisplayId="202";
 const saved=core.saveSettings(root,cfg);
 assert.equal(saved.revision,2);assert.equal(saved.configVersion,1);
 const current=core.loadSettings(root);
 assert.equal(current.operatorDisplayId,"101");assert.equal(current.mainDisplayId,"202");
 assert.equal(current.bibleStyle.fontSize,70);
 assert.deepEqual(current.linkedFolders["Himnario Adventista"],[external]);
 const previous=JSON.parse(fs.readFileSync(path.join(root,"Configuracion","ajustes.backup.json"),"utf8"));
 assert.deepEqual(previous.linkedFolders["Himnario Adventista"],[external]);
});
test("desvincular carpeta no elimina archivos y mantiene los ajustes",t=>{
 const root=setup(t),external=fs.mkdtempSync(path.join(os.tmpdir(),"ja-ext-"));
 t.after(()=>fs.rmSync(external,{recursive:true,force:true}));
 const video=path.join(external,"Himno 5.mp4");fs.writeFileSync(video,"contenido original");
 core.linkFolder(root,"Himnario Adventista",external);
 const config=core.loadSettings(root);config.mainDisplayId="202";core.saveSettings(root,config);
 core.unlinkFolder(root,"Himnario Adventista",external);
 assert.equal(fs.readFileSync(video,"utf8"),"contenido original");
 assert.deepEqual(core.loadSettings(root).linkedFolders["Himnario Adventista"],[]);
 assert.equal(core.loadSettings(root).mainDisplayId,"202");
 assert.throws(()=>core.unlinkFolder(root,"Himnario Adventista",external),/no está vinculada/);
});
test("no se desvincula el fondo de Biblia que todavía está en uso",t=>{
 const root=setup(t),external=fs.mkdtempSync(path.join(os.tmpdir(),"ja-ext-"));
 t.after(()=>fs.rmSync(external,{recursive:true,force:true}));
 const bg=path.join(external,"atardecer.jpg");fs.writeFileSync(bg,"imagen");
 core.linkFolder(root,"Fondos Personalizados",external);
 const settings=core.loadSettings(root);settings.bibleStyle.background="image";settings.bibleStyle.backgroundFile=bg;core.saveSettings(root,settings);
 assert.throws(()=>core.unlinkFolder(root,"Fondos Personalizados",external),/fondo bíblico en uso/);
 assert.equal(fs.existsSync(bg),true);
});
test("archivo de ajustes corrupto se bloquea y se recupera explícitamente sin pérdida de archivo dañado",t=>{
 const root=setup(t),configPath=path.join(root,"Configuracion","ajustes.json");
 core.saveSettings(root,core.loadSettings(root));
 let old=core.loadSettings(root);old.operatorDisplayId="101";core.saveSettings(root,old);
 fs.writeFileSync(configPath,"{mal json","utf8");
 assert.equal(core.settingsHealth(root).status,"corrupt");
 assert.equal(core.loadSettings(root).configVersion,1);
 assert.throws(()=>core.saveSettings(root,core.loadSettings(root)),/dañado/);
 const result=core.recoverSettings(root);
 assert.equal(fs.readFileSync(result.damagedFile,"utf8"),"{mal json");
 assert.equal(core.settingsHealth(root).status,"ok");
 assert.equal(core.loadSettings(root).operatorDisplayId,"");
});
test("sin copia previa, una recuperación no inventa ni destruye ajustes",t=>{
 const root=setup(t),file=path.join(root,"Configuracion","ajustes.json");
 fs.writeFileSync(file,"{mal json");
 assert.throws(()=>core.recoverSettings(root),/No existe una copia válida/);
 assert.equal(fs.readFileSync(file,"utf8"),"{mal json");
});
test("UI C1 publica configuración real y no usa un selector ficticio",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../desktop/settings-center.js"),"utf8");
 const bridge=fs.readFileSync(path.join(__dirname,"../desktop/bridge.js"),"utf8");
 for(const method of ["api.config()","api.saveScreens(","api.selectFolder(","api.unlinkFolder(","api.saveBibleStyle(","api.recoverConfig()"])assert.ok(source.includes(method),method);
 assert.ok(!bridge.includes("function screensModal()"),"No pueden coexistir dos gestores de pantallas");
 assert.ok(bridge.includes('window.jaSettingsCenter.open("pantallas")'));
});
