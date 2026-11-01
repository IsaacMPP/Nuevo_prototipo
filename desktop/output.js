"use strict";
(() => {
const frame=document.querySelector("#frame"),black=document.querySelector("#black");
let media=null,session=0,blacked=false;
function status(detail){window.jaOutput.status({session,...detail});}
function reset(){
  if(media){media.pause?.();media.removeAttribute("src");media.load?.();media.remove();media=null;}
  frame.querySelector("#scripture")?.remove();
}
function setBlack(value){blacked=!!value;black.style.display=blacked?"block":"none";}
window.jaOutput.receive(async command=>{
  if(!command||typeof command!=="object")return;
  if(command.action==="black"){setBlack(true);status({state:"black"});return;}
  if(command.action==="clear"){reset();setBlack(false);status({state:"empty"});return;}
  if(command.action==="pause"){media?.pause?.();status({state:"paused"});return;}
  if(command.action==="play"){if(media){try{await media.play();status({state:"playing"});}catch(err){status({state:"error",message:String(err.message||err)});}}return;}
  if(command.action==="restart"){if(media){media.currentTime=0;try{await media.play();status({state:"playing"});}catch(err){status({state:"error",message:String(err.message||err)});}}return;}
  if(command.action!=="show")return;
  session=command.session;
  reset();setBlack(false);
  if(command.content.kind==="verse"){
    const wrap=document.createElement("div");wrap.id="scripture";
    const text=document.createElement("div");text.id="verse";text.textContent=command.content.text;
    const ref=document.createElement("div");ref.id="reference";ref.textContent=command.content.reference;
    wrap.append(text,ref);frame.insertBefore(wrap,black);status({state:"verse"});return;
  }
  const kind=command.content.kind;
  if(!["video","audio","image"].includes(kind)){status({state:"error",message:"Tipo de medio no compatible"});return;}
  media=document.createElement(kind==="image"?"img":kind==="video"?"video":"audio");
  if(kind==="audio"){media.controls=false;const note=document.createElement("div");note.id="scripture";note.textContent="Reproduciendo audio";frame.insertBefore(note,black);}
  media.src=command.content.url;
  if(kind!=="image"){media.autoplay=true;media.loop=false;media.muted=!!command.content.muted;media.addEventListener("ended",()=>status({state:"ended"}));media.addEventListener("error",()=>status({state:"error",message:"No se pudo decodificar este archivo. Usa MP4 H.264/AAC o WebM."}));}
  else media.addEventListener("error",()=>status({state:"error",message:"No se pudo abrir la imagen"}));
  frame.insertBefore(media,black);
  if(kind!=="image"){try{await media.play();status({state:"playing"});}catch(err){status({state:"error",message:String(err.message||err)});}}
  else status({state:"image"});
});
})();