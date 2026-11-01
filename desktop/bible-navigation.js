"use strict";
// Pure scripture navigation independent of Electron, DOM, Bible translations.
(function(root){
 function move(books,cursor,direction){
  if(!Array.isArray(books)||![1,-1].includes(direction)||!cursor||!Number.isSafeInteger(cursor.book)||
    !Number.isSafeInteger(cursor.chapter)||!Number.isSafeInteger(cursor.verse)||!Number.isSafeInteger(cursor.verses))throw Error("Navegación bíblica inválida");
  const {book,chapter,verse,verses}=cursor;
  if(book<0||book>=books.length||chapter<0||chapter>=books[book].chapters||verse<0||verse>=verses)
   throw Error("Posición bíblica fuera de rango");
  const next=verse+direction;
  if(next>=0&&next<verses)return {book,chapter,verse:next,needsFetch:false};
  if(direction===1){
   if(chapter+1<books[book].chapters)return {book,chapter:chapter+1,verse:0,needsFetch:true};
   if(book+1<books.length)return {book:book+1,chapter:0,verse:0,needsFetch:true};
  }else{
   if(chapter>0)return {book,chapter:chapter-1,verse:-1,needsFetch:true};
   if(book>0)return {book:book-1,chapter:books[book-1].chapters-1,verse:-1,needsFetch:true};
  }
  return null;
 }
 const api=Object.freeze({move});
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.jaBibleNavigation=api;
})(typeof window!=="undefined"?window:null);
