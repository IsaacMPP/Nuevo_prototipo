"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("jaOutput",{
  receive: callback => {
    if(typeof callback!=="function")return;
    ipcRenderer.on("ja:output:render",(_event,payload)=>callback(payload));
  },
  status: status => ipcRenderer.send("ja:output:status",status)
});
