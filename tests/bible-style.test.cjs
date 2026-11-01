"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const core=require("../desktop/core.cjs");
const styles=require("../desktop/bible-style.cjs");
function root(t){const folder=fs.mkdtempSync(path.join(os.tmpdir(),"ja-style-"));t.after(()=>fs.rmSync(folder,{force:true,recursive:true}));return core.ensureStructure(core.dataRoot(folder));}
test("los estilos bíblicos validan tamaño, colores, fuentes, transparencia y alineación",()=>{
 const st=styles.normalize({fontSize:900,fontFamily:"<script>",textColor:"bad",referenceColor:"#abc123",background:"image",backgroundFile:"C:/fondo.png",plateOpacity:200,textAlign:"left",showReference:false});
 assert.equal(st.fontSize,100);assert.equal(st.fontFamily,"Georgia");assert.equal(st.textColor,"#ffffff");assert.equal(st.referenceColor,"#abc123");assert.equal(st.plateOpacity,90);assert.equal(st.textAlign,"left");assert.equal(st.showReference,false);
});
test("guardado bíblico mantiene carpetas, operador y pantalla principal",t=>{
 const dir=root(t);
 core.saveSettings(dir,{linkedFolders:{"Himnario Adventista":["C:\\himnos"]},operatorDisplayId:"101",mainDisplayId:"202",bibleStyle:{fontSize:78,fontFamily:"Verdana",textColor:"#ffff00",background:"gradient",plateOpacity:40}});
 let settings=core.loadSettings(dir);
 assert.equal(settings.bibleStyle.fontSize,78);assert.equal(settings.bibleStyle.fontFamily,"Verdana");assert.equal(settings.bibleStyle.background,"gradient");
 assert.equal(settings.mainDisplayId,"202");assert.equal(settings.operatorDisplayId,"101");assert.deepEqual(settings.linkedFolders["Himnario Adventista"],["C:\\himnos"]);
 settings.mainDisplayId="303";core.saveSettings(dir,settings);
 assert.equal(core.loadSettings(dir).bibleStyle.fontSize,78);
});
test("un proyecto no puede ser fondo ejecutable y los fondos externos se validan",t=>{
 const dir=root(t);
 const file=path.join(dir,"Fondos Personalizados","paisaje.jpg");
 fs.writeFileSync(file,"imagen-prueba");
 assert.equal(core.findAllowedFile(dir,file),fs.realpathSync(file));
 const invalid=path.join(dir,"Fondos Personalizados","ejecutable.exe");
 fs.writeFileSync(invalid,"MZ");
 assert.throws(()=>core.findAllowedFile(dir,invalid),/no autorizado/i);
});

test("el motor incluye la orden segura para limpiar solamente el texto",()=>{
 const policy=require("../desktop/projection-policy.cjs");
 assert.equal(policy.validateCommand("clear-text"),"clear-text");
 assert.throws(()=>policy.validateCommand("delete-all-projects"),/no autorizado/);
});
test("el diseño ofrece controles visuales editables y alto contraste",()=>{
 const code=fs.readFileSync(path.join(__dirname,"../desktop/bridge.js"),"utf8");
 assert.ok(code.includes("btn.style.color=active?"),"El modo inactivo debe usar texto claro");
 for(const id of ["jaFontSize","jaFontFamily","jaFontColor","jaRefColor","jaTextAlign","jaStyleSaveStatus"])assert.ok(code.includes(id),id);
 assert.ok(code.includes('api.saveBibleStyle('),"Deben guardarse cambios mediante IPC");
});
