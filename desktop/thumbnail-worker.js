"use strict";
// On-demand thumbnail extraction: at most two decoders in flight and only
// cards inside the scroll viewport. Preview never starts playback or audio.
(() => {
 const api=window.jaDesktop;
 if(!api)return;
 const queue=[];let active=0;const MAX_CONCURRENT=2;
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(entry.isIntersecting){
    observer.unobserve(entry.target);
    const job=entry.target.__jaThumbnailJob;
    if(job){queue.push(job);drain();}
   }
  }
 },{rootMargin:"180px"});
 function drain(){
  while(active<MAX_CONCURRENT&&queue.length){
   const job=queue.shift();
   if(!job.slot.isConnected)continue;
   active++;
   void load(job).finally(()=>{active--;drain();});
  }
 }
 async function capture(url){
  return new Promise((resolve,reject)=>{
   const video=document.createElement("video");
   let done=false;
   const timer=setTimeout(()=>finish(null),5200);
   function finish(data){
    if(done)return;done=true;clearTimeout(timer);
    video.pause();video.removeAttribute("src");video.load();
    if(data)resolve(data);else reject(Error("No se pudo extraer fotograma"));
   }
   function grab(){
    try{
     if(video.readyState<2||!video.videoWidth)return;
     const w=240,h=135,canvas=document.createElement("canvas");
     canvas.width=w;canvas.height=h;
     const context=canvas.getContext("2d",{alpha:false});
     context.fillStyle="#071a4c";context.fillRect(0,0,w,h);
     const ratio=Math.min(w/video.videoWidth,h/video.videoHeight);
     const width=video.videoWidth*ratio,height=video.videoHeight*ratio;
     context.drawImage(video,(w-width)/2,(h-height)/2,width,height);
     finish(canvas.toDataURL("image/jpeg",0.67));
    }catch{finish(null);}
   }
   video.muted=true;video.playsInline=true;video.preload="auto";
   video.addEventListener("error",()=>finish(null),{once:true});
   video.addEventListener("loadeddata",()=>{
    if(done)return;
    if(Number.isFinite(video.duration)&&video.duration>0.3){
     video.currentTime=Math.min(1,video.duration*0.15);
    }else grab();
   },{once:true});
   video.addEventListener("seeked",grab,{once:true});
   video.src=url;video.load();
  });
 }
 async function load({file,slot}){
  try{
   let data=await api.thumbnailRead(file.path);
   if(!data){
    const url=await api.mediaUrl(file.path);
    data=await capture(url);
    await api.thumbnailWrite(file.path,data);
   }
   if(!slot.isConnected)return;
   const image=document.createElement("img");image.className="ja-thumb";
   image.loading="lazy";image.alt="Miniatura de "+file.name;image.src=data;
   slot.replaceChildren(image);
  }catch{
   // Unsupported codecs remain represented by the playback icon. Never
   // claim an AVI/MKV thumbnail is ready or block the library scroll.
  }
 }
 function observe(slot,file){
  slot.__jaThumbnailJob={slot,file};
  observer.observe(slot);
 }
 window.jaThumbs=Object.freeze({observe});
})();
