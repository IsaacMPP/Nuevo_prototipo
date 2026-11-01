"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const thumb=require("../desktop/thumbnail-cache.cjs");
const at=name=>fs.readFileSync(path.join(__dirname,"../desktop",name),"utf8");
test("Cierre del operador termina todas las salidas físicas y no depende de que las ventanas hijas sigan abiertas",()=>{
 const source=at("main.cjs");
 assert.ok(source.includes('mainWindow.on("closed",()=>{'));
 assert.ok(source.includes('if(!quitting){quitting=true;closeAllOutputs();app.quit();}'));
 assert.ok(source.includes('app.on("before-quit",()=>{quitting=true;closeAllOutputs();});'));
 assert.ok(source.includes('data.window.destroy()'));
});
test("Limpiar invalida generación anterior y no permite que un video viejo reaparezca",()=>{
 const backend=at("main.cjs"),output=at("output.js");
 assert.ok(backend.includes("output.session=++sessionCounter"));
 assert.ok(backend.includes('action:"clear",session:output.session'));
 assert.ok(backend.includes('output.verse=null'));
 assert.ok(output.includes("++generation"));
 assert.ok(output.includes("showGeneration!==generation"));
 assert.ok(output.includes('command.session'));
});
test("Programa muestra la Biblia real de la salida y el texto se ajusta al monitor",()=>{
 const bridge=at("bridge.js"),backend=at("main.cjs"),css=at("layout-fixes.css");
 assert.ok(backend.includes('verse:value.kind==="verse"?value.verse:null'));
 assert.ok(bridge.includes('s.kind==="verse"&&s.verse'));
 assert.ok(bridge.includes("base.clientWidth"));
 assert.ok(bridge.includes("verse.scrollHeight"));
 assert.ok(css.includes("#previewCanvasContent,#programCanvasContent{container-type:inline-size"));
 assert.ok(!bridge.includes("elem.controls=true"));
});
test("el fondo degradado proyectado no se reemplaza con imagen none",()=>{
 const output=at("output.js");
 assert.ok(output.includes('style.background==="gradient"'));
 assert.ok(!output.includes('scripture.style.backgroundImage="none"'));
});
test("cache de miniaturas se invalida por cambios de tamaño y mtime",t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ja-thumb-"));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,"himno.mp4");fs.writeFileSync(file,"abc");
 const target=thumb.cachePath(dir,file);
 assert.equal(thumb.read(dir,file),null);
 const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(75,0x47),Buffer.from([0xff,0xd9])]);
 const image="data:image/jpeg;base64,"+jpeg.toString("base64");
 assert.equal(thumb.write(dir,file,image),true);
 assert.equal(thumb.read(dir,file),image);
 fs.appendFileSync(file,"x");
 assert.notEqual(target,thumb.cachePath(dir,file));
 assert.equal(thumb.read(dir,file),null);
 assert.throws(()=>thumb.cachePath(dir,path.join(dir,"other.exe")),/miniatura/i);
 assert.throws(()=>thumb.write(dir,file,"data:image/png;base64,abc"),/formato/i);
});
test("UI queda fija; Himnario desplaza tarjetas, limita decodificadores y no muestra botones de ventana falsos",()=>{
 const css=at("layout-fixes.css"),bridge=at("bridge.js"),worker=at("thumbnail-worker.js");
 assert.ok(css.includes("#multiscreenCardsList{justify-content:flex-start!important"));
 assert.ok(css.includes("#hymnModuleGrid,#multimediaCardsGrid{flex:1 1 auto"));
 assert.ok(bridge.includes('visible+96'));
 assert.ok(bridge.includes('window.jaThumbs?.observe'));
 assert.ok(worker.includes('MAX_CONCURRENT=2'));
 const html=fs.readFileSync(path.join(__dirname,"../build/index.html"),"utf8");
 assert.ok(html.includes('desktop/layout-fixes.css'));
 assert.ok(html.includes('desktop/thumbnail-worker.js'));
 assert.ok(!html.includes('class="hidden sm:flex items-center gap-2.5 pl-2 ml-1 border-l border-[#1e3a6d]'));
});
