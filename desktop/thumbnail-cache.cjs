"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const FORMATS=new Set([".mp4",".webm"]);
const MAX_THUMB=110*1024;
function cachePath(root,source){
 const ext=path.extname(source).toLowerCase();
 if(!FORMATS.has(ext))throw Error("Miniatura disponible solo para MP4/WebM");
 const stat=fs.statSync(source);
 if(!stat.isFile())throw Error("Archivo de video inválido");
 const key=crypto.createHash("sha256").update(source+"|"+stat.size+"|"+stat.mtimeMs).digest("hex");
 return path.join(root,"Configuracion","miniaturas",key+".jpg");
}
function read(root,source){
 const file=cachePath(root,source);
 if(!fs.existsSync(file))return null;
 if(fs.statSync(file).size>MAX_THUMB)return null;
 return "data:image/jpeg;base64,"+fs.readFileSync(file).toString("base64");
}
function write(root,source,image){
 const target=cachePath(root,source);
 if(typeof image!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error("Formato de miniatura inválido");
 const buffer=Buffer.from(image.split(",")[1],"base64");
 if(buffer.length<64||buffer.length>MAX_THUMB||buffer[0]!==0xff||buffer[1]!==0xd8||buffer[2]!==0xff)
  throw Error("Miniatura inválida o demasiado grande");
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const temp=target+".tmp-"+crypto.randomUUID();
 try{fs.writeFileSync(temp,buffer);fs.renameSync(temp,target);}
 finally{if(fs.existsSync(temp))fs.rmSync(temp,{force:true});}
 return true;
}
module.exports={cachePath,read,write};
