"use strict";
const path=require("node:path");
const VIDEO=new Set([".mp4",".webm"]);
const AUDIO=new Set([".mp3",".wav",".ogg",".m4a"]);
const IMAGE=new Set([".jpg",".jpeg",".png",".webp",".gif"]);
function mediaKind(file){
  const ext=path.extname(String(file||"")).toLowerCase();
  if(VIDEO.has(ext))return "video";
  if(AUDIO.has(ext))return "audio";
  if(IMAGE.has(ext))return "image";
  throw Error("Formato no compatible con el reproductor integrado: "+ext+". Convierte a MP4 H.264 o WebM.");
}
function chooseDisplay(displays,operatorId,destinationId){
  const id=String(destinationId||"");
  if(!id)throw Error("Configura primero una pantalla de proyección");
  const target=displays.find(d=>String(d.id)===id);
  if(!target)throw Error("La pantalla de destino no está conectada");
  if(id===String(operatorId))throw Error("No se puede proyectar sobre la pantalla del operador");
  if(target.bounds.width<1||target.bounds.height<1)throw Error("Geometría de pantalla inválida");
  return target;
}
function validateCommand(command){
  if(!["pause","play","restart","black","clear","clear-text"].includes(command))throw Error("Comando de proyección no autorizado");
  return command;
}
function safeVerse(verse){
  if(!verse||typeof verse.text!=="string"||verse.text.length>6000)throw Error("Versículo inválido");
  return {text:verse.text,reference:String(verse.reference||"").slice(0,160)};
}
module.exports={mediaKind,chooseDisplay,validateCommand,safeVerse};
