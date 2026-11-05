import { app, globalShortcut } from "electron"
import { ToMain } from "../../types/IPC/ToMain"
import { sendToMain } from "../IPC/main"

// This receiver is OFF by default and only captures common presenter keys
// when explicitly armed. Do not register bare arrows: they break other apps.
let active=false
const KEYMAP:[string,"next"|"previous"][]=[
    ["PageDown","next"],["PageUp","previous"]
]
const registered:string[]=[]
export function configureJAPresentationRemote(enable:boolean){
    if(!enable){
        for(const key of registered)globalShortcut.unregister(key)
        registered.length=0
        active=false
        return {enabled:false,keys:[],error:""}
    }
    if(!app.isReady())return {enabled:false,keys:[],error:"Electron todavía no está listo."}
    if(active)return {enabled:true,keys:[...registered],error:""}
    const claimed:string[]=[]
    for(const [key,action] of KEYMAP){
        if(!globalShortcut.register(key,()=>sendToMain(ToMain.JA_PRESENTATION_REMOTE,{action}))){
            for(const item of claimed)globalShortcut.unregister(item)
            return {enabled:false,keys:[],error:"Windows u otra aplicación ya utiliza "+key+"; control remoto no activado."}
        }
        claimed.push(key)
    }
    registered.push(...claimed)
    active=true
    return {enabled:true,keys:[...registered],error:""}
}
export function stopJAPresentationRemote(){configureJAPresentationRemote(false)}
