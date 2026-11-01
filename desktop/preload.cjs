"use strict";
const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld("jaDesktop", Object.freeze({
    info: () => invoke("ja:info"),
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
    onDisplaysChanged: cb => {
        if (typeof cb !== "function") return () => {};
        const handler = (_event, value) => cb(value);
        ipcRenderer.on("ja:displays-changed",handler);
        return () => ipcRenderer.removeListener("ja:displays-changed",handler);
    }
}));
