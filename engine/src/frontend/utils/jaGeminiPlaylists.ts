// JA Gemini playlists: real local files or validated YouTube links, no mock media.
// Persistent operator configuration only. No mutations of the native FreeShow
// audio playlists or the user's physical files.
import { writable } from "svelte/store"
import { geminiFileType } from "./jaGeminiLibrary"

export type JAPlaylistSource = "multimedia" | "himnario" | "youtube"
export type JAPlaylistKind = "video" | "audio" | "youtube"
export type JAPlaybackMode = "normal" | "repeat-all" | "repeat-one" | "shuffle"
export const JA_PLAYBACK_MODES: JAPlaybackMode[] = ["normal","repeat-all","shuffle","repeat-one"]
export function jaPlaybackMode(value:unknown,legacyRepeat=false):JAPlaybackMode {
    return JA_PLAYBACK_MODES.includes(value as JAPlaybackMode)
        ? value as JAPlaybackMode : legacyRepeat ? "repeat-all" : "normal"
}
// Real Fisher-Yates queue: once per item and selected item starts the run.
export function jaShuffleOrder(length:number,startIndex:number,random:()=>number=Math.random):number[]{
    if(!Number.isInteger(length)||length<1||length>JA_MAX_ENTRIES)return []
    const start=Math.max(0,Math.min(length-1,startIndex))
    const order=Array.from({length},(_,i)=>i).filter(i=>i!==start)
    for(let i=order.length-1;i>0;i--){
        const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))))
        ;[order[i],order[j]]=[order[j],order[i]]
    }
    return [start,...order]
}
export function jaNextIndex(mode:JAPlaybackMode,length:number,current:number,manual=false,
    shuffled:number[]=[],shufflePosition=0):{index:number;position:number}{
    if(length<1)return {index:-1,position:0}
    if(!manual && mode==="repeat-one")return {index:current,position:shufflePosition}
    if(mode==="shuffle"){
        const next=shufflePosition+1
        return next<shuffled.length?{index:shuffled[next],position:next}:{index:-1,position:shufflePosition}
    }
    const next=current+1
    if(next>=length)return {index:mode==="repeat-all"?0:-1,position:0}
    return {index:next,position:0}
}
export type JAPlaylistEntry = {
    id: string
    source: JAPlaylistSource
    kind: JAPlaylistKind
    path: string
    title: string
    audioOnly: boolean
    loopVideo?: boolean // projected video loop, independent of playlist mode
}
export type JAPlaylist = {
    id: string
    name: string
    entries: JAPlaylistEntry[]
    autoNext: boolean
    autoPublish: boolean // explicit opt-in: video/youtube can replace authorized Program targets
    repeat: boolean // persisted legacy preference
    playMode: JAPlaybackMode
}
export const JA_PLAYLISTS_KEY = "ja-gemini-playlists-v1"
export const JA_MAX_PLAYLISTS = 40
export const JA_MAX_ENTRIES = 200
export const jaPlaylists = writable<JAPlaylist[]>([])
const newId=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)
const shortText=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):""
export function jaYoutubeId(value:string):string {
    const raw=(value||"").trim()
    if(/^[\w-]{11}$/.test(raw))return raw
    try {
        const url=new URL(raw)
        if(url.protocol!=="https:" && url.protocol!=="http:")return ""
        const host=url.hostname.toLowerCase().replace(/^www\./,"")
        let id=""
        if(host==="youtu.be")id=url.pathname.split("/").filter(Boolean)[0]||""
        else if(host==="youtube.com"||host==="m.youtube.com"||host==="youtube-nocookie.com"){
            if(url.pathname==="/watch")id=url.searchParams.get("v")||""
            else {
                const segments=url.pathname.split("/").filter(Boolean)
                if(["shorts","embed","live"].includes(segments[0]))id=segments[1]||""
            }
        }
        return /^[\w-]{11}$/.test(id)?id:""
    }catch{return ""}
}
export function jaNewPlaylist(name:string):JAPlaylist {
    return {id:newId(),name:shortText(name,80)||"Nueva lista",entries:[],autoNext:true,autoPublish:false,repeat:false,playMode:"normal"}
}
export function jaLocalPlaylistEntry(path:string,source:"multimedia"|"himnario"):JAPlaylistEntry|null {
    const kind=geminiFileType(path)
    if(kind!=="video"&&kind!=="audio")return null
    return {id:newId(),source,kind,path,title:path.split(/[\/\\]/).pop()||path,
        audioOnly:kind==="audio",loopVideo:false}
}
export function jaYoutubePlaylistEntry(url:string):JAPlaylistEntry|null {
    const id=jaYoutubeId(url)
    if(!id)return null
    return {id:newId(),source:"youtube",kind:"youtube",
        path:"https://www.youtube.com/watch?v="+id,title:"YouTube · "+id,audioOnly:false,loopVideo:false}
}
export function jaPlaylistEntryValid(entry:unknown):entry is JAPlaylistEntry {
    if(!entry||typeof entry!=="object")return false
    const e=entry as Partial<JAPlaylistEntry>
    if(typeof e.id!=="string"||!e.id||e.id.length>100 ||
       typeof e.path!=="string"||!e.path||e.path.length>4096 ||
       typeof e.title!=="string"||e.title.length>250 ||
       typeof e.audioOnly!=="boolean")return false
    if(e.kind==="youtube")return e.source==="youtube" && !!jaYoutubeId(e.path) && !e.audioOnly
    if(e.source!=="multimedia"&&e.source!=="himnario")return false
    return (e.kind==="video"||e.kind==="audio") && geminiFileType(e.path)===e.kind &&
        (e.kind==="audio" ? e.audioOnly : true)
}
export function jaReadPlaylists():JAPlaylist[]{
    try{
        const raw=JSON.parse(localStorage.getItem(JA_PLAYLISTS_KEY)||"[]")
        if(!Array.isArray(raw))return []
        return raw.slice(0,JA_MAX_PLAYLISTS).filter(v=>v&&typeof v==="object"&&
            typeof v.id==="string"&&v.id.length<101 && typeof v.name==="string").map(v=>({
            id:v.id,name:shortText(v.name,80)||"Lista",
            autoNext:v.autoNext!==false,autoPublish:v.autoPublish===true,repeat:v.repeat===true,
            playMode:jaPlaybackMode(v.playMode,v.repeat===true),
            entries:Array.isArray(v.entries)
                ? v.entries.slice(0,JA_MAX_ENTRIES).filter(jaPlaylistEntryValid)
                    .map((e:JAPlaylistEntry)=>({...e,loopVideo:e.kind==="video" && e.loopVideo===true})) : []
        }))
    }catch{return []}
}
export function jaWritePlaylists(value:JAPlaylist[]):boolean{
    try{
        localStorage.setItem(JA_PLAYLISTS_KEY,JSON.stringify(value.slice(0,JA_MAX_PLAYLISTS)))
        return true
    }catch{return false}
}
export function jaMoveEntry(list:JAPlaylist,index:number,offset:number):JAPlaylist{
    const next=[...list.entries]
    const to=index+offset
    if(index<0||index>=next.length||to<0||to>=next.length)return list
    const [entry]=next.splice(index,1)
    next.splice(to,0,entry)
    return {...list,entries:next}
}

/** Move an entry anywhere within a list, preserving stable IDs. */
export function jaMoveEntryTo(list:JAPlaylist,from:number,to:number):JAPlaylist{
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=list.entries.length
        ||to<0||to>list.entries.length)return list
    const entries=[...list.entries]
    const [entry]=entries.splice(from,1)
    entries.splice(Math.min(to,entries.length),0,entry)
    return {...list,entries}
}
