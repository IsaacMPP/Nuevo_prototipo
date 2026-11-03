// Shared, side-effect-free policy for the Gemini library.
// Paths come from native READ_FOLDER or the JA hymnal scanner, never from mock data.
import { audioExtensions, imageExtensions, videoExtensions } from "../values/extensions"
import { isJAExclusiveHymnPath, normalizeJAContentPath } from "./jaHymnPaths"

export type GeminiMediaType = "video" | "image" | "audio"
export type GeminiFile = { path: string; name: string; kind: GeminiMediaType }
export type DiskEntry = { path: string; name: string; isFolder?: boolean }
const video = new Set(videoExtensions)
const image = new Set(imageExtensions)
const audio = new Set(audioExtensions)

export function geminiFileType(path: string): GeminiMediaType | null {
    if (!path || /^(?:https?:|data:|blob:|freeshow-protected:)/i.test(path)) return null
    const extension = path.split(/[\/\\]/).pop()?.split(".").pop()?.toLowerCase() || ""
    if (video.has(extension)) return "video"
    if (image.has(extension)) return "image"
    if (audio.has(extension)) return "audio"
    return null
}
export function geminiLocalFiles(entries: DiskEntry[], hymnRoots: string[] = []): GeminiFile[] {
    const found = new Map<string, GeminiFile>()
    for (const entry of entries) {
        if (!entry?.path || entry.isFolder || isJAExclusiveHymnPath(entry.path, hymnRoots)) continue
        const kind = geminiFileType(entry.path)
        if (!kind) continue
        const key = normalizeJAContentPath(entry.path)
        if (!found.has(key)) found.set(key, { path: entry.path, name: entry.name || entry.path.split(/[\/\\]/).pop() || "", kind })
    }
    return [...found.values()].sort((a,b)=>a.name.localeCompare(b.name, "es", {numeric:true}))
}
export function geminiCounts(items: GeminiFile[]) {
    return { video: items.filter(x=>x.kind==="video").length, image: items.filter(x=>x.kind==="image").length, audio: items.filter(x=>x.kind==="audio").length, all: items.length }
}
export function geminiSearch(items: GeminiFile[], query: string, type: GeminiMediaType | "all" = "all") {
    const normalized = (query||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim()
    return items.filter(item => (type==="all" || item.kind===type) && (!normalized || item.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").includes(normalized)))
}

/** Use filenames as supplied by the real scanner. The number and title are
 * separate presentation data; no file is renamed, copied or changed. */
export function geminiHymnLabel(filename:string):{number:string;title:string}{
    const base=(filename||"").replace(/\.[^.]+$/,"").trim()
    const match=base.match(/^#?\s*(\d{1,4})\s*[-._)]?\s+(.+)$/)
    return match ? {number:match[1],title:match[2].trim()} : {number:"",title:base}
}
/** Progressive search over all scanned hymn videos, never only visible cards.
 * "00" finds 001/002/003/100; "003" prioritizes its exact hymn.
 * Partial titles and multiple words are accent- and case-insensitive. */
export function geminiHymnSearch(items:GeminiFile[],query:string):GeminiFile[]{
    const normalize=(value:string):string=>value.normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim()
    const needle=normalize((query||"").trim().replace(/^#\s*(?=\d)/,""))
    const videos=items.filter(item=>item.kind==="video")
    if(!needle)return videos
    const numeric=/^\d+$/.test(needle)
    const terms=numeric?[]:needle.split(/\s+/).filter(Boolean)
    const ranked:{file:GeminiFile;score:number;index:number}[]=[]
    videos.forEach((file,index)=>{
        const base=file.name.replace(/\.[^.]+$/,"")
        const filename=normalize(base)
        // Handles 003 Title, 003-Title, 003.Title and videos named only 003.mp4.
        const number=base.match(/^#?\s*(\d{1,4})(?=\D|$)/)?.[1]||""
        const title=normalize(geminiHymnLabel(file.name).title)
        let score=-1
        if(numeric){
            if(number===needle)score=0
            else if(number && Number(needle)>0 && Number(number)===Number(needle))score=1
            else if(number.startsWith(needle))score=2
            else if(number.includes(needle))score=3
            else if(filename.includes(needle))score=4
        }else{
            if(title===needle)score=0
            else if(title.startsWith(needle))score=1
            else if(terms.every(term=>title.includes(term)))score=2
            else if(filename.includes(needle))score=3
            else if(terms.every(term=>filename.includes(term)))score=4
        }
        if(score>=0)ranked.push({file,score,index})
    })
    return ranked.sort((a,b)=>a.score-b.score||a.index-b.index).map(entry=>entry.file)
}
