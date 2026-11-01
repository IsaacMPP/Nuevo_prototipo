"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const transition=require("../desktop/transition-engine.cjs"),runtime=require("../desktop/transition-runtime.js");
const session=require("../desktop/session-policy.cjs"),core=require("../desktop/core.cjs");
function folder(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),"ja-transition-"));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return core.ensureStructure(core.dataRoot(home));}
test("transición segura: Corte, Fundido, tiempos y rechazo de parámetros inválidos",()=>{
 assert.deepEqual(transition.DEFAULT,{type:"fade",durationMs:320});
 assert.deepEqual(transition.normalize(undefined),{type:"fade",durationMs:320});
 assert.deepEqual(transition.validate({type:"cut",durationMs:0}),{type:"cut",durationMs:0});
 assert.deepEqual(transition.validate({type:"fade",durationMs:440}),{type:"fade",durationMs:440});
 assert.deepEqual(transition.choose({type:"fade",durationMs:400},{type:"cut",durationMs:0}),{type:"cut",durationMs:0});
 assert.throws(()=>transition.validate({type:"wipe",durationMs:320}),/Tipo de transición/);
 assert.throws(()=>transition.validate({type:"fade",durationMs:99999}),/120 y 1200/);
 assert.throws(()=>transition.validate({type:"fade",durationMs:NaN}),/120 y 1200/);
});
test("transición permanece junto a estilos, monitores y carpetas al reiniciar",t=>{
 const root=folder(t),before=core.loadSettings(root);
 before.operatorDisplayId="101";before.mainDisplayId="202";
 before.bibleStyle.fontSize=74;
 before.verseTransition={type:"fade",durationMs:680};
 before.linkedFolders["Himnario Adventista"]=["C:/Musica"];core.saveSettings(root,before);
 let current=core.loadSettings(root);
 assert.deepEqual(current.verseTransition,{type:"fade",durationMs:680});
 current.operatorDisplayId="101";current.mainDisplayId="303";core.saveSettings(root,current);
 current=core.loadSettings(root);
 assert.deepEqual(current.verseTransition,{type:"fade",durationMs:680});
 assert.equal(current.bibleStyle.fontSize,74);
 assert.deepEqual(current.linkedFolders["Himnario Adventista"],["C:/Musica"]);
});
test("solo sesiones de la MISMA Biblia pueden avanzar: un video y otra versión nunca se alteran",()=>{
 const win={isDestroyed:()=>false};
 assert.equal(session.canAdvanceVerse({window:win,kind:"verse",sourceBible:"builtin:rv1909"},"builtin:rv1909").allowed,true);
 assert.equal(session.canAdvanceVerse({window:win,kind:"verse",state:"black",sourceBible:"builtin:rv1909"},"builtin:rv1909").allowed,true);
 assert.equal(session.canAdvanceVerse({window:win,kind:"video",sourceBible:null},"builtin:rv1909").allowed,false);
 assert.equal(session.canAdvanceVerse({window:win,kind:"audio"},"builtin:rv1909").allowed,false);
 assert.equal(session.canAdvanceVerse({window:win,kind:"verse",sourceBible:"otra.fsb"},"builtin:rv1909").allowed,false);
 assert.equal(session.canAdvanceVerse({window:{isDestroyed:()=>true},kind:"verse",sourceBible:"builtin:rv1909"},"builtin:rv1909").allowed,false);
 assert.equal(session.canAdvanceVerse(null,"builtin:rv1909").allowed,false);
});
test("compositor Corte pinta inmediatamente sin recrear sesiones",async()=>{
 const controller=runtime.createController();
 let text="anterior";
 const changed=await controller.swap([],()=>{text="nuevo";},{type:"cut",durationMs:0});
 assert.equal(changed,true);assert.equal(text,"nuevo");
});
test("fundido: pulsaciones rápidas cancelan órdenes anteriores y conservan el último versículo",async()=>{
 const animations=[];
 const fake={animate:(_frames,_settings)=>{
  const animation={finished:Promise.resolve(),cancel:()=>{animation.cancelled=true;},cancelled:false};
  animations.push(animation);return animation;
 }};
 const controller=runtime.createController();
 const results=[],first=controller.swap([fake],()=>results.push("versículo anterior"),{type:"fade",durationMs:320});
 const second=controller.swap([fake],()=>results.push("último versículo"),{type:"fade",durationMs:320});
 assert.deepEqual(await Promise.all([first,second]),[false,true]);
 assert.deepEqual(results,["último versículo"]);
 assert.ok(animations.some(a=>a.cancelled));
});
test("no se recargan ventanas al navegar y el controlador envía un mensaje in-place",()=>{
 const main=fs.readFileSync(path.join(__dirname,"../desktop/main.cjs"),"utf8");
 const output=fs.readFileSync(path.join(__dirname,"../desktop/output.js"),"utf8");
 const bridge=fs.readFileSync(path.join(__dirname,"../desktop/bridge.js"),"utf8");
 assert.ok(main.includes('action:"verse",session:output.session'));
 assert.ok(main.includes("sessionPolicy.canAdvanceVerse(output,file)"));
 assert.ok(output.includes('command.action==="verse"'));
 assert.ok(output.includes("verseTransitions.swap("));
 assert.ok(bridge.includes("api.updateProjectedVerse("));
 assert.ok(bridge.includes("btnBibleNextVerse"));
 assert.ok(bridge.includes("btnBiblePrevVerse"));
 const html=fs.readFileSync(path.join(__dirname,"../desktop/output.html"),"utf8");
 assert.ok(html.indexOf("transition-runtime.js")<html.indexOf("output.js"));
});

test("flechas atraviesan capítulo y libro sin perder el índice correcto",()=>{
 const nav=require("../desktop/bible-navigation.js");
 const books=[{chapters:2},{chapters:1}];
 assert.deepEqual(nav.move(books,{book:0,chapter:0,verse:0,verses:3},1),{book:0,chapter:0,verse:1,needsFetch:false});
 assert.deepEqual(nav.move(books,{book:0,chapter:0,verse:2,verses:3},1),{book:0,chapter:1,verse:0,needsFetch:true});
 assert.deepEqual(nav.move(books,{book:0,chapter:1,verse:1,verses:2},1),{book:1,chapter:0,verse:0,needsFetch:true});
 assert.deepEqual(nav.move(books,{book:1,chapter:0,verse:0,verses:3},-1),{book:0,chapter:1,verse:-1,needsFetch:true});
 assert.deepEqual(nav.move(books,{book:0,chapter:1,verse:0,verses:2},-1),{book:0,chapter:0,verse:-1,needsFetch:true});
 assert.equal(nav.move(books,{book:0,chapter:0,verse:0,verses:3},-1),null);
 assert.equal(nav.move(books,{book:1,chapter:0,verse:2,verses:3},1),null);
 assert.throws(()=>nav.move(books,{book:0,chapter:100,verse:0,verses:2},1),/fuera de rango/);
});
test("el renderer de operador carga navegación compartida antes del bridge",()=>{
 const builder=fs.readFileSync(path.join(__dirname,"../scripts/build-ui.cjs"),"utf8");
 assert.ok(builder.includes("desktop/bible-navigation.js"));
 const bridge=fs.readFileSync(path.join(__dirname,"../desktop/bridge.js"),"utf8");
 assert.ok(bridge.includes("jaBibleNavigation.move("));
 assert.ok(bridge.includes("verseNavigation=verseNavigation.catch(()=>{}).then("));
});
