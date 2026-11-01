#!/usr/bin/env node
"use strict";
// Instalador experimental separado: jamás comparte appId con JA2 ni con 0.6.1.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../engine");
const run=Number(process.env.GITHUB_RUN_NUMBER||0);
const attempt=Number(process.env.GITHUB_RUN_ATTEMPT||1);
if(!Number.isSafeInteger(run)||run<1||!Number.isSafeInteger(attempt)||attempt<1)
  throw Error("Solo generar artefacto trazable desde GitHub Actions");
const version="0.7."+String(run*100+attempt);
const pkgFile=path.join(root,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgFile,"utf8"));
pkg.name="ja-gemini-freeshow-experimental";
pkg.productName="JA Gemini FreeShow Experimental";
pkg.version=version;
fs.writeFileSync(pkgFile,JSON.stringify(pkg,null,4)+"\n");
let yaml=fs.readFileSync(path.join(root,"config/building/electron-builder.yaml"),"utf8");
yaml=yaml.replace(/^appId:.*$/m,"appId: mx.ja.gemini.freeshow.experimental")
         .replace(/^productName:.*$/m,"productName: JA Gemini FreeShow Experimental")
         .replace(/^artifactName:.*$/m,"artifactName: JA-Gemini-FreeShow-Experimental-\${version}-\${arch}.\${ext}")
         .replace(/^    icon: build\/public\/icon.png$/m,"    icon: build/public/ja-icon.ico");
yaml=yaml.replace(/^    azureSignOptions:\s*\n(?:        [^\n]*\n)+/m,"");
yaml+="\nnsis:\n    installerSidebar: build/public/ja-installer-sidebar.bmp\n    installerHeader: build/public/ja-installer-header.bmp\n";
const dest=path.join(root,"config/building/ja-gemini-experimental.generated.yaml");
fs.writeFileSync(dest,yaml);
fs.writeFileSync(path.join(root,"ja-gemini-build-info.json"),JSON.stringify({version,runId:process.env.GITHUB_RUN_ID,commit:process.env.GITHUB_SHA,branch:process.env.GITHUB_REF},null,2)+"\n");
console.log("Preparada instalación AISLADA Gemini experimental",version);
