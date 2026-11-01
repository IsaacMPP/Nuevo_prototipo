"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const htmlPath=path.join(__dirname,"../build/index.html");
test("la interfaz instalada conserva los 4 paneles del diseño Gemini aprobado",()=>{
 assert.ok(fs.existsSync(htmlPath),"npm run build:ui debe ejecutarse antes de las pruebas");
 const html=fs.readFileSync(htmlPath,"utf8");
 for(const id of ["previewMonitorFrame","programMonitorFrame","multiscreenCardsList","quickTargetButtons","leftModuleSidebar","moduleView_biblia","fsBooksRow1","fsBooksRow2","fsBooksRow3","hymnModuleGrid","multimediaCardsGrid"]){
  assert.ok(html.includes('id="'+id+'"'),"Falta el módulo visual aprobado: "+id);
 }
});
test("el HTML compilado no incluye la simulación de salidas, eventos o tiempos del original",()=>{
 const html=fs.readFileSync(htmlPath,"utf8");
 assert.ok(!html.includes("function sendPreviewToSpecificOutputs("),"No debe existir la proyección simulada");
 assert.ok(!html.includes('elapsedSec: 207'),"No deben quedar tiempos ficticios");
 assert.ok(!html.includes('const state = {'),"No deben quedar estados ficticios");
 assert.ok(!html.includes("MON_PROGRAM_BIENV"),"Las miniaturas demostrativas no deben fingir emisión");
});
test("el diseño incorpora solo el controlador nativo JA y el CSS empaquetado",()=>{
 const html=fs.readFileSync(htmlPath,"utf8");
 assert.ok(html.includes('<script src="../desktop/bridge.js"></script>'));
 assert.ok(html.includes('<link rel="stylesheet" href="tailwind.css">'));
 assert.ok(!html.includes('<script src="https://cdn.tailwindcss.com/3.4.17"></script>'));
 assert.ok(html.includes('Content-Security-Policy'));
});

test("el instalador incluye el Centro de Configuración C1 real",()=>{
 const html=fs.readFileSync(htmlPath,"utf8");
 assert.ok(html.includes('<script src="../desktop/settings-center.js"></script>'));
 assert.ok(html.includes('<link rel="stylesheet" href="../desktop/settings-center.css">'));
 const bridge=fs.readFileSync(path.join(__dirname,"../desktop/bridge.js"),"utf8");
 assert.ok(bridge.includes('jaSettingsCenter.open("pantallas")'));
 assert.equal(bridge.includes("function screensModal()"),false);
});
