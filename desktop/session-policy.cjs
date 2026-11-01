"use strict";
function canAdvanceVerse(output,source){
 if(!output||!output.window||output.window.isDestroyed?.())return {allowed:false,reason:"La salida no tiene sesión bíblica activa"};
 if(output.kind!=="verse")return {allowed:false,reason:"La salida no está mostrando una Biblia"};
 if(output.sourceBible!==source)return {allowed:false,reason:"Esta salida muestra otra versión de la Biblia"};
 return {allowed:true};
}
module.exports={canAdvanceVerse};
