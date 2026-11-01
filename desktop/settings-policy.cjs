"use strict";
// Pure policy: Windows displays are physical; JA's main destination is explicit.
function validateScreens(input,available,previous,activeCount=0){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Configuración de pantallas inválida");
 const operator=String(input.operatorDisplayId??"");
 const main=String(input.mainDisplayId??"");
 const valid=new Set(available.map(x=>String(x.id)));
 if(!valid.has(operator))throw Error("Selecciona una pantalla del operador conectada");
 if(main&&!valid.has(main))throw Error("El proyector principal no está conectado; no se reasignará automáticamente");
 if(main===operator)throw Error("Operador y proyector principal no pueden ser el mismo monitor");
 const changed=operator!==String(previous.operatorDisplayId||"")||main!==String(previous.mainDisplayId||"");
 if(changed&&activeCount>0)throw Error("Hay salidas de proyección abiertas. Limpia y cierra las salidas antes de reasignar monitores.");
 if(!Number.isSafeInteger(input.revision)||input.revision<0)throw Error("Versión de configuración inválida");
 if(input.revision!==previous.revision)throw Error("La configuración fue modificada en otra sección. Actualiza Configuración antes de guardar.");
 return {operatorDisplayId:operator,mainDisplayId:main,changed};
}
module.exports={validateScreens};
