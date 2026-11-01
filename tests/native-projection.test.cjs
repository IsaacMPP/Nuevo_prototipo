"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const bible=require("../desktop/bible.cjs"),policy=require("../desktop/projection-policy.cjs");
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ja-native-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const fixture=["rv-test",{name:"Prueba RV",books:[{name:"Génesis",chapters:[{number:1,verses:[{number:1,text:"En el principio."},{number:2,text:"Y la tierra."}]}]},{name:"Salmos",chapters:[{number:1,verses:[{number:1,text:"Bienaventurado."}]}]}]}];
test("FSB/JSON interpreta libros capítulos y versículos sin evaluación",()=>{
 const b=bible.normalizeBible(fixture);
 assert.equal(b.books.length,2);
 assert.deepEqual(bible.structure(b).books.map(x=>x.name),["Génesis","Salmos"]);
 assert.equal(bible.chapter(b,0,0).verses[1].text,"Y la tierra.");
 assert.throws(()=>bible.chapter(b,6,0),/fuera de rango/);
});
test("FSB incorrecto se rechaza y no se copia",t=>{
 const root=temp(t),source=path.join(root,"mal.fsb");
 fs.writeFileSync(source,JSON.stringify({books:"mal"}));
 assert.throws(()=>bible.importBible(root,source),/no reconocida/);
 assert.equal(fs.existsSync(path.join(root,"Biblias","mal.fsb")),false);
});
test("Una Biblia válida se importa sin modificar origen ni sobrescribir anteriores",t=>{
 const root=temp(t),source=path.join(root,"original.fsb"),content=JSON.stringify(fixture);
 fs.writeFileSync(source,content);
 const first=bible.importBible(root,source),second=bible.importBible(root,source);
 assert.notEqual(first,second);assert.equal(fs.readFileSync(source,"utf8"),content);
 assert.equal(bible.parseBible(first).books[0].name,"Génesis");
 assert.equal(bible.parseBible(second).books[0].name,"Génesis");
});
test("No acepta versículos o textos maliciosos demasiado grandes",()=>{
 assert.throws(()=>bible.normalizeBible({books:[{chapters:[{verses:[{text:"x".repeat(6001)}]}]}]}),/inválido/);
 assert.throws(()=>policy.safeVerse({text:"x".repeat(6001)}),/inválido/);
});
test("Solo un monitor físico distinto al operador puede proyectar",()=>{
 const screens=[{id:"1",bounds:{width:1920,height:1080}},{id:"2",bounds:{width:1280,height:720}}];
 assert.equal(policy.chooseDisplay(screens,"1","2").id,"2");
 assert.throws(()=>policy.chooseDisplay(screens,"1","1"),/operador/);
 assert.throws(()=>policy.chooseDisplay(screens,"1","3"),/no está conectada/);
 assert.throws(()=>policy.chooseDisplay(screens,"1",""),/Configura/);
});
test("Comandos de proyección están restringidos",()=>{
 for(const a of ["pause","play","restart","black","clear"])assert.equal(policy.validateCommand(a),a);
 assert.throws(()=>policy.validateCommand("executeJavaScript"),/no autorizado/);
});
test("Solo formatos compatibles se envían al reproductor Chromium",()=>{
 assert.equal(policy.mediaKind("Himno 125.mp4"),"video");
 assert.equal(policy.mediaKind("fondo.png"),"image");
 assert.equal(policy.mediaKind("audio.wav"),"audio");
 assert.throws(()=>policy.mediaKind("himno.avi"),/no compatible/);
 assert.throws(()=>policy.mediaKind("objeto.exe"),/no compatible/);
});
test("Documento bíblico demasiado grande se rechaza",t=>{
 const root=temp(t),file=path.join(root,"huge.fsb");
 fs.writeFileSync(file,"0".repeat(25*1024*1024+1));
 assert.throws(()=>bible.parseBible(file),/demasiado grande/);
});
