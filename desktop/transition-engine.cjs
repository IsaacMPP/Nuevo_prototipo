"use strict";
// Shared transition contract. Fade is enabled for scripture surfaces in B1.
// The same contract can be applied to images/video after their own tests.
const DEFAULT=Object.freeze({type:"fade",durationMs:320});
function normalize(value){
 const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
 const type=raw.type==="cut"||raw.type==="fade"?raw.type:DEFAULT.type;
 const ms=Number.isFinite(Number(raw.durationMs))?Math.round(Number(raw.durationMs)):DEFAULT.durationMs;
 return {type,durationMs:type==="cut"?0:Math.max(120,Math.min(1200,ms))};
}
function validate(value){
 if(!value||typeof value!=="object"||Array.isArray(value)||!["fade","cut"].includes(value.type))
  throw Error("Tipo de transición no permitido");
 if(value.type==="cut")return {type:"cut",durationMs:0};
 if(!Number.isSafeInteger(value.durationMs)||value.durationMs<120||value.durationMs>1200)
  throw Error("La transición debe durar entre 120 y 1200 milisegundos");
 return {type:"fade",durationMs:value.durationMs};
}
function choose(value,override){
 return override==null?normalize(value):validate(override);
}
module.exports={DEFAULT,normalize,validate,choose};
