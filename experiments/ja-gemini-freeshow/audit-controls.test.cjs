"use strict";
const {test} = require("node:test"), assert=require("node:assert/strict");
const {collect,classify}=require("./audit-controls.cjs");
test("Inventario detecta botones, enlaces e inputs reales",()=>{
 const html='<body><button id="start" aria-label="Iniciar">▶</button><input id="name" type="text"><a href="/help">Ayuda</a><button id="broken">Sin cablear</button></body>';
 const items=collect(html);
 assert.equal(items.length,4);
 const classified=classify(items,'bind("start", handler); disable("name", reason)');
 assert.equal(classified.find(x=>x.id==="start").status,"con-manejador-no-validado");
 assert.equal(classified.find(x=>x.id==="name").status,"deshabilitado");
 assert.equal(classified.find(x=>x.id==="broken").status,"sin-verificar");
});
test("Inventario declara controles sin ID y detecta ID duplicados",()=>{
 const arr=classify(collect('<body><button title="A">A</button><button id="dup">B</button><button id="dup">C</button></body>'),"");
 assert.equal(arr[0].status,"sin-id-requiere-revision");
 assert.ok(arr[1].duplicateId && arr[2].duplicateId);
});
