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
/** Match #371, 371 and 0371 by the filename's leading hymn number,
 * searching the entire catalog rather than only rendered cards. */
export function geminiHymnSearch(items:GeminiFile[],query:string):GeminiFile[]{
    const exact=(query||"").trim().match(/^#?\s*0*(\d{1,4})\s*$/)
    if(exact){
        const number=Number(exact[1])
        return items.filter(item=>item.kind==="video" &&
            Number(geminiHymnLabel(item.name).number)===number &&
            !!geminiHymnLabel(item.name).number)
    }
    return geminiSearch(items,(query||"").trim().replace(/^#(?=\d)/,""),"video")
}
