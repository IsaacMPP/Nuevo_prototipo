"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const MAX_BYTES=25*1024*1024;
const cache=new Map();
function normalizeBible(data){
  const payload=Array.isArray(data)&&data.length===2&&typeof data[1]==="object"?data[1]:data;
  if(!payload||typeof payload!=="object"||!Array.isArray(payload.books)||payload.books.length<1||payload.books.length>80)throw Error("Biblia FSB/JSON no reconocida");
  const books=payload.books.map((book,bi)=>{
    if(!book||!Array.isArray(book.chapters)||book.chapters.length>200)throw Error("Capítulos incorrectos");
    const chapters=book.chapters.map((chapter,ci)=>{
      const input=Array.isArray(chapter)?chapter:chapter?.verses;
      if(!Array.isArray(input)||input.length>250)throw Error("Versículos incorrectos");
      const verses=input.map((verse,vi)=>{
        const txt=typeof verse==="string"?verse:verse?.text;
        if(typeof txt!=="string"||txt.length>6000)throw Error("Texto bíblico inválido");
        return {number:Number(verse?.number)||vi+1,text:txt};
      });
      return {number:Number(chapter?.number)||ci+1,verses};
    });
    return {name:String(book?.name||"Libro "+(bi+1)).slice(0,100),chapters};
  });
  return {name:String(payload.name||"Biblia importada").slice(0,120),books};
}
function parseBible(file){
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size>MAX_BYTES)throw Error("Biblia demasiado grande (máximo 25 MB)");
  const key=fs.realpathSync(file),old=cache.get(key);
  if(old&&old.mtime===stat.mtimeMs&&old.size===stat.size)return old.value;
  const parsed=normalizeBible(JSON.parse(fs.readFileSync(key,"utf8")));
  cache.set(key,{mtime:stat.mtimeMs,size:stat.size,value:parsed});
  if(cache.size>10)cache.delete(cache.keys().next().value);
  return parsed;
}
function structure(bible){return {name:bible.name,books:bible.books.map((b,index)=>({index,name:b.name,chapters:b.chapters.length}))};}
function chapter(bible,bookIndex,chapterIndex){
  const b=bible.books[Number(bookIndex)],c=b?.chapters[Number(chapterIndex)];
  if(!c)throw Error("Referencia bíblica fuera de rango");
  return {reference:b.name+" "+c.number,verses:c.verses};
}
function importBible(root,candidate){
  const ext=path.extname(candidate).toLowerCase();
  if(![".fsb",".json"].includes(ext))throw Error("Usa una Biblia FSB o JSON compatible");
  parseBible(candidate); // validate BEFORE storing
  const base=path.join(root,"Biblias");
  fs.mkdirSync(base,{recursive:true});
  const filename=path.basename(candidate).replace(/[^a-zA-Z0-9._ -]/g,"_");
  const original=path.resolve(candidate);
  if(path.dirname(original).toLowerCase()===base.toLowerCase())return original;
  let target=path.join(base,filename);
  let suffix=1;
  while(fs.existsSync(target))target=path.join(base,path.parse(filename).name+"-"+suffix++ +ext);
  if(suffix>1000)throw Error("Demasiadas biblias con el mismo nombre");
  const temp=target+"."+crypto.randomUUID()+".tmp";
  try{fs.copyFileSync(original,temp,fs.constants.COPYFILE_EXCL);fs.renameSync(temp,target);}
  finally{if(fs.existsSync(temp))fs.rmSync(temp,{force:true});}
  return target;
}
module.exports={normalizeBible,parseBible,structure,chapter,importBible};
