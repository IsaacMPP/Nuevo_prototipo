"use strict";
const DEFAULT=Object.freeze({fontSize:56,fontFamily:"Georgia",textColor:"#ffffff",referenceColor:"#ffe6a0",background:"navy",backgroundFile:"",plateOpacity:20,textAlign:"center",showReference:true});
const FONTS=new Set(["Georgia","Arial","Verdana","Tahoma","Times New Roman"]);
const COLORS=/^#[\da-fA-F]{6}$/;
function normalize(input={}){
 const v=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const num=(x,lo,hi,def)=>Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Math.round(Number(x)))):def;
 return {
  fontSize:num(v.fontSize,24,100,DEFAULT.fontSize),
  fontFamily:FONTS.has(v.fontFamily)?v.fontFamily:DEFAULT.fontFamily,
  textColor:COLORS.test(v.textColor)?v.textColor:DEFAULT.textColor,
  referenceColor:COLORS.test(v.referenceColor)?v.referenceColor:DEFAULT.referenceColor,
  background:["navy","black","gradient","image"].includes(v.background)?v.background:DEFAULT.background,
  backgroundFile:typeof v.backgroundFile==="string"?v.backgroundFile.slice(0,2000):"",
  plateOpacity:num(v.plateOpacity,0,90,DEFAULT.plateOpacity),
  textAlign:["left","center","right"].includes(v.textAlign)?v.textAlign:DEFAULT.textAlign,
  showReference:v.showReference!==false
 };
}
module.exports={DEFAULT,normalize};
