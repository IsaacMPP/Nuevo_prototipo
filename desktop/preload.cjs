"use strict";
const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld("jaDesktop", Object.freeze({
    info: () => invoke("ja:info"),
    config: () => invoke("ja:config:get"),
    saveScreens: value => invoke("ja:config:screens:save",value),
    unlinkFolder: (category,folder) => invoke("ja:config:folder:unlink",category,folder),
    recoverConfig: () => invoke("ja:config:recover"),
    displays: () => invoke("ja:displays"),
    setOperator: id => invoke("ja:set-operator", id),
    setMain: id => invoke("ja:set-main", id),
    folderInfo: () => invoke("ja:folders"),
    selectFolder: category => invoke("ja:folder:select", category),
    library: category => invoke("ja:library", category),
    openMedia: file => invoke("ja:media:open", file),
    mediaUrl: file => invoke("ja:media:url", file),
    projects: () => invoke("ja:project:list"),
    createProject: name => invoke("ja:project:create", name),
    saveProject: project => invoke("ja:project:save", project),
    bibles: () => invoke("ja:bible:list"),
    importBible: () => invoke("ja:bible:import"),
    bibleStructure: file => invoke("ja:bible:structure",file),
    bibleChapter: (file,book,chapter) => invoke("ja:bible:chapter",file,book,chapter),
    bibleStyle: () => invoke("ja:bible:style:get"),
    saveBibleStyle: style => invoke("ja:bible:style:save",style),
    setOutputTransport: (display,command,value) => invoke("ja:projection:transport",display,command,value),

    projectionState: () => invoke("ja:projection:state"),
    sendMedia: (file,display) => invoke("ja:projection:media",file,display),
    sendVerse: (file,book,chapter,verse,display) => invoke("ja:projection:verse",file,book,chapter,verse,display),
    projectionCommand: (display,action) => invoke("ja:projection:command",display,action),
    onProjectionChanged: cb => {
        if(typeof cb!=="function")return () => {};
        const handler=(_event,value)=>cb(value);
        ipcRenderer.on("ja:projection:changed",handler);
        return () => ipcRenderer.removeListener("ja:projection:changed",handler);
    },
    onDisplaysChanged: cb => {
        if (typeof cb !== "function") return () => {};
        const handler = (_event, value) => cb(value);
        ipcRenderer.on("ja:displays-changed",handler);
        return () => ipcRenderer.removeListener("ja:displays-changed",handler);
    }
}));
