"use strict";
(() => {
const frame=document.querySelector("#frame"),black=document.querySelector("#black");
let media=null,session=0,blacked=false,scripture=null;
let lastState="empty",stateBeforeBlack="empty",lastTimeSent=0;
const verseTransitions=window.jaTransitions.createController();
function status(detail){
  const payload={session,...detail};
  if(media&&media.tagName!=="IMG"){payload.position=Number.isFinite(media.currentTime)?media.currentTime:0;payload.duration=Number.isFinite(media.duration)?media.duration:0;payload.volume=Math.round(media.volume*100);}
  window.jaOutput.status(payload);
}
function reset(){
  verseTransitions.cancel();
  if(media){media.pause?.();media.removeAttribute("src");media.load?.();media.remove();media=null;}
  if(scripture){scripture.remove();scripture=null;}
  frame.querySelector("#scripture")?.remove();
}
function setBlack(value){blacked=!!value;black.style.display=blacked?"block":"none";}
function applyBibleStyle(style={}){
 if(!scripture)return;
 const verse=scripture.querySelector("#verse"),ref=scripture.querySelector("#reference"),panel=scripture.querySelector("#readingPlate");
 const font=style.fontFamily||"Georgia";
 scripture.style.background=style.background==="black"?"#000":style.background==="gradient"?"linear-gradient(135deg,#071a4c,#13466a 60%,#754b46)":"#071a4c";
 scripture.style.backgroundImage=style.background==="image"&&style.backgroundUrl?"url("+JSON.stringify(style.backgroundUrl)+")":scripture.style.backgroundImage="none";
 scripture.style.backgroundSize="cover";scripture.style.backgroundPosition="center";
 scripture.style.textAlign=style.textAlign||"center";
 verse.style.fontFamily=font+", serif";
 verse.style.fontSize="clamp(24px,"+(Number(style.fontSize)||56)/10+"vw,140px)";
 verse.style.color=style.textColor||"#ffffff";
 verse.style.textAlign=style.textAlign||"center";
 ref.style.fontFamily=font+", serif";
 ref.style.color=style.referenceColor||"#ffe6a0";
 ref.style.display=style.showReference===false?"none":"";
 panel.style.background="rgba(0,0,0,"+(Number(style.plateOpacity)||0)/100+")";
}
function timeupdate(){
 const now=Date.now();
 if(now-lastTimeSent>1000){lastTimeSent=now;status({state:lastState});}
}
window.jaOutput.receive(async command=>{
 if(!command||typeof command!=="object")return;
 if(command.action==="style"){applyBibleStyle(command.style);return;}
 if(command.action==="verse"){
   if(!scripture||command.session!==session)return;
   const content=command.content;
   if(!content||content.kind!=="verse")return;
   const verse=scripture.querySelector("#verse"),reference=scripture.querySelector("#reference");
   if(!verse||!reference)return;
   if(content.style)applyBibleStyle(content.style);
   if(command.reveal)setBlack(false);
   // Preserve the projection window, background, plate, audio and blackout.
   // Only the scripture text/reference are animated; a rapid sequence cancels
   // older animations and the latest requested verse wins.
   stateBeforeBlack="verse";
   lastState=blacked?"black":"verse";
   status({state:lastState});
   void verseTransitions.swap([verse,reference],()=>{
     verse.textContent=content.text;
     reference.textContent=content.reference;
     verse.style.visibility="visible";
     reference.style.visibility="visible";
   },content.transition).catch(error=>status({state:"error",message:String(error)}));
   return;
 }
 if(command.action==="black"){if(blacked){setBlack(false);lastState=stateBeforeBlack;}else{stateBeforeBlack=lastState;setBlack(true);lastState="black";}status({state:lastState});return;}
 if(command.action==="clear"){reset();setBlack(false);lastState="empty";status({state:"empty"});return;}
 if(command.action==="clear-text"){if(scripture){verseTransitions.cancel();scripture.querySelector("#verse").style.visibility="hidden";scripture.querySelector("#reference").style.visibility="hidden";stateBeforeBlack="background";lastState=blacked?"black":"background";status({state:lastState});}return;}
 if(command.action==="volume"){if(media&&media.tagName!=="IMG"){media.volume=Math.max(0,Math.min(100,Number(command.volume)))/100;status({state:lastState});}return;}
 if(command.action==="seek"){if(media&&Number.isFinite(media.duration)){media.currentTime=Math.max(0,Math.min(media.duration,Number(command.position)));status({state:lastState});}return;}
 if(command.action==="pause"){media?.pause?.();lastState=media?"paused":lastState;status({state:lastState});return;}
 if(command.action==="play"){
   setBlack(false);
   if(media){try{await media.play();lastState="playing";status({state:lastState});}catch(err){lastState="error";status({state:"error",message:String(err.message||err)});}}
   else {lastState=stateBeforeBlack==="black"?"verse":stateBeforeBlack;status({state:lastState});}
   return;
 }
 if(command.action==="restart"){if(media){media.currentTime=0;try{await media.play();lastState="playing";status({state:lastState});}catch(err){lastState="error";status({state:"error",message:String(err.message||err)});}}return;}
 if(command.action!=="show")return;
 session=command.session;
 reset();setBlack(false);lastTimeSent=0;
 if(command.content.kind==="verse"){
   scripture=document.createElement("div");scripture.id="scripture";
   const panel=document.createElement("div");panel.id="readingPlate";
   const text=document.createElement("div");text.id="verse";text.textContent=command.content.text;
   const ref=document.createElement("div");ref.id="reference";ref.textContent=command.content.reference;
   scripture.append(panel,text,ref);frame.insertBefore(scripture,black);
   applyBibleStyle(command.content.style);
   lastState="verse";status({state:lastState});return;
 }
 const kind=command.content.kind;
 if(!["video","audio","image"].includes(kind)){status({state:"error",message:"Tipo de medio no compatible"});return;}
 media=document.createElement(kind==="image"?"img":kind==="video"?"video":"audio");
 if(kind==="audio"){
   const note=document.createElement("div");note.id="scripture";
   note.textContent="♫ Reproduciendo audio";frame.insertBefore(note,black);
 }
 media.src=command.content.url;
 if(kind!=="image"){
   media.autoplay=true;media.loop=false;media.muted=!!command.content.muted;media.volume=1;
   media.addEventListener("ended",()=>{lastState="ended";status({state:lastState});});
   media.addEventListener("timeupdate",timeupdate);
   media.addEventListener("loadedmetadata",()=>status({state:lastState}));
   media.addEventListener("error",()=>{lastState="error";status({state:"error",message:"No se pudo decodificar este archivo. Usa MP4 H.264/AAC o WebM."});});
 }else media.addEventListener("error",()=>{lastState="error";status({state:"error",message:"No se pudo abrir la imagen"});});
 frame.insertBefore(media,black);
 if(kind!=="image"){
   try{await media.play();lastState="playing";status({state:lastState});}
   catch(err){lastState="error";status({state:"error",message:String(err.message||err)});}
 }else {lastState="image";status({state:lastState});}
});
})();