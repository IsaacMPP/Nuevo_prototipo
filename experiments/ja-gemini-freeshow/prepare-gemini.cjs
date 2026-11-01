"use strict";
// Compila el DOM original aprobado. No copia el controlador ficticio de Gemini.
// Requiere npm run build:ui en la raíz antes del build del frontend FreeShow.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
const source=path.join(root,"build/index.html");
if(!fs.existsSync(source))throw Error("Falta build/index.html: ejecuta npm run build:ui desde la raíz");
const html=fs.readFileSync(source,"utf8");
const body=html.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
if(!body)throw Error("No se encontró el cuerpo de Gemini original");
const cssPath=path.join(root,"build/tailwind.css");
if(!fs.existsSync(cssPath))throw Error("No se generó Tailwind local");
let fragment=body[2].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
fragment=fragment.replace(/\s+on(?:click|change|load|error|keydown|input)\s*=\s*(?:"[^"]*"|'[^']*')/gi,"");
const rawClasses=(body[1].match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||"";
const target=path.join(root,"engine/src/frontend/components/ja/gemini-fragment.generated.ts");
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,"// GENERADO: no modificar manualmente.\nexport const geminiHtml = "+JSON.stringify(fragment)+";\nexport const geminiBodyClasses = "+JSON.stringify(rawClasses)+";\n","utf8");
const headStyles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join("\n");
const style=fs.readFileSync(cssPath,"utf8")+"\n"+headStyles+"\n";
fs.writeFileSync(path.join(root,"engine/public/ja-gemini.css"),style,"utf8");
console.log("Gemini original conservado: "+fragment.length+" caracteres, sin scripts demostrativos");
