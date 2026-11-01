"use strict";
// Transition compositor for local projection DOM surfaces. No sound or window
// operations: animations touch only supplied scene layers, so playback remains
// independent and backgrounds do not flash during scripture navigation.
(function(root){
 function createController(){
  let generation=0,active=[];
  function stop(){
   generation++;
   for(const a of active){try{a.cancel();}catch{}}
   active=[];
  }
  function animate(nodes,start,end,duration){
   const effects=nodes.filter(Boolean).map(n=>n.animate([{opacity:start},{opacity:end}],
    {duration,fill:"forwards",easing:"ease-in-out"}));
   active=effects;
   return Promise.all(effects.map(e=>e.finished.catch(()=>undefined)));
  }
  async function swap(nodes,paint,config){
   stop();
   const ticket=generation;
   const type=config?.type==="fade"?"fade":"cut";
   const duration=Number(config?.durationMs)||0;
   if(type==="cut"||duration<120||!nodes.every(n=>!!n&&typeof n.animate==="function")){
    paint();return true;
   }
   const half=Math.round(duration/2);
   await animate(nodes,1,0,half);
   if(ticket!==generation)return false;
   for(const a of active)a.cancel();
   active=[];
   paint();
   await animate(nodes,0,1,duration-half);
   if(ticket!==generation)return false;
   for(const a of active)a.cancel();
   active=[];
   return true;
  }
  return Object.freeze({swap,cancel:stop});
 }
 const api=Object.freeze({createController});
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.jaTransitions=api;
})(typeof window!=="undefined"?window:null);
