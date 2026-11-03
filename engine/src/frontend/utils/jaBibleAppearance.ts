// JA Gemini: per-output Bible appearance. No global FreeShow template mutation.
// Appearance is serialized into every temporary Bible slide so the preview and
// actual FreeShow output renderer consume exactly the same settings.
import { get, writable } from "svelte/store"
import type { Item } from "../../types/Show"

export const JA_BIBLE_APPEARANCE_KEY = "ja-gemini-bible-appearances-v1"
export const JA_BIBLE_FONT_FAMILIES = ["Arial", "Aptos", "Verdana", "Tahoma", "Georgia", "Times New Roman"] as const
export type JABibleAppearance = {
    enabledFields: string[] // only explicitly edited properties override the native template
    fontFamily: string
    fontSize: number
    fontWeight: "normal" | "bold"
    textColor: string
    textAlign: "left" | "center" | "right"
    verticalAlign: "top" | "center" | "bottom"
    shadow: boolean
    lineBackgroundOpacity: number // 0 transparent, 100 opaque; background only, never text
    backgroundMode: "color" | "image"
    backgroundColor: string
    backgroundPath: string
}
export const DEFAULT_JA_BIBLE_APPEARANCE: JABibleAppearance = {
    enabledFields:[],fontFamily:"Arial",fontSize:72,fontWeight:"normal",textColor:"#FFFFFF",
    textAlign:"center",verticalAlign:"center",shadow:true,lineBackgroundOpacity:65,
    backgroundMode:"color",backgroundColor:"#10182A",backgroundPath:""
}
export const jaBibleAppearances = writable<Record<string,JABibleAppearance>>({})

const EDITABLE_FIELDS=["fontFamily","fontSize","fontWeight","textColor","textAlign","verticalAlign","shadow","lineBackgroundOpacity","backgroundMode","backgroundColor","backgroundPath"] as const
const isEditableField=(key:string):boolean=>(EDITABLE_FIELDS as readonly string[]).includes(key)
export const hasJABibleBackgroundOverride=(style:JABibleAppearance|undefined):boolean=>
    !!style?.enabledFields?.some(key=>["backgroundMode","backgroundColor","backgroundPath"].includes(key))
const safeColor=(value:unknown,defaultValue:string):string=>
    typeof value==="string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : defaultValue
const clampPercent=(value:unknown,fallback:number):number=>{
    const n=Number(value)
    return value===undefined || value===null || !Number.isFinite(n) ? fallback : Math.max(0,Math.min(100,Math.round(n)))
}
const clampSize=(value:unknown):number=> {
    const numeric=Number(value)
    return Number.isFinite(numeric) ? Math.max(24,Math.min(180,Math.round(numeric))) : 72
}
export function normalizeJABibleAppearance(value:Partial<JABibleAppearance>|null|undefined):JABibleAppearance {
    const v=value||{}
    return {
        enabledFields:[...new Set((Array.isArray(v.enabledFields) ? v.enabledFields : Object.keys(v)).filter(key=>typeof key==="string"&&isEditableField(key)))],
        fontFamily:JA_BIBLE_FONT_FAMILIES.includes(v.fontFamily as typeof JA_BIBLE_FONT_FAMILIES[number])
            ? v.fontFamily! : DEFAULT_JA_BIBLE_APPEARANCE.fontFamily,
        fontSize:clampSize(v.fontSize),
        fontWeight:v.fontWeight==="bold"?"bold":"normal",
        textColor:safeColor(v.textColor,DEFAULT_JA_BIBLE_APPEARANCE.textColor),
        textAlign:v.textAlign==="left"||v.textAlign==="right"?v.textAlign:"center",
        verticalAlign:v.verticalAlign==="top"||v.verticalAlign==="bottom"?v.verticalAlign:"center",
        shadow:v.shadow!==false,
        lineBackgroundOpacity:clampPercent(v.lineBackgroundOpacity,DEFAULT_JA_BIBLE_APPEARANCE.lineBackgroundOpacity),
        backgroundMode:v.backgroundMode==="image"?"image":"color",
        backgroundColor:safeColor(v.backgroundColor,DEFAULT_JA_BIBLE_APPEARANCE.backgroundColor),
        backgroundPath:typeof v.backgroundPath==="string" && v.backgroundPath.length<4096 &&
            /\.(png|jpe?g|webp)$/i.test(v.backgroundPath) ? v.backgroundPath : ""
    }
}
export function getJABibleAppearance(outputId:string):JABibleAppearance|undefined {
    const stored=get(jaBibleAppearances)[outputId]
    return stored ? normalizeJABibleAppearance(stored) : undefined
}
export function loadJABibleAppearances():void {
    try {
        const parsed=JSON.parse(localStorage.getItem(JA_BIBLE_APPEARANCE_KEY)||"{}")
        if(!parsed || typeof parsed!=="object" || Array.isArray(parsed))return
        const filtered:Record<string,JABibleAppearance>={}
        for(const [id,appearance] of Object.entries(parsed).slice(0,48))
            if(id && id.length<128 && appearance && typeof appearance==="object" && !Array.isArray(appearance))
                filtered[id]=normalizeJABibleAppearance(appearance as Partial<JABibleAppearance>)
        jaBibleAppearances.set(filtered)
    }catch(error){console.warn("[JA Biblia] No se pudieron cargar estilos guardados",error)}
}
function persist():void {
    try {localStorage.setItem(JA_BIBLE_APPEARANCE_KEY,JSON.stringify(get(jaBibleAppearances)))}
    catch(error){console.warn("[JA Biblia] No se pudieron guardar estilos",error)}
}
export function setJABibleAppearance(id:string,patch:Partial<JABibleAppearance>):void {
    if(!id)return
    jaBibleAppearances.update(current=>{
        const previous=current[id]
        const enabledFields=[...new Set([...(previous?.enabledFields||[]),...Object.keys(patch).filter(isEditableField)])]
        return {...current,[id]:normalizeJABibleAppearance({...previous,...patch,enabledFields})}
    })
    persist()
}
export function resetJABibleAppearance(id:string):void {
    if(!id)return
    jaBibleAppearances.update(current=>{const next={...current};delete next[id];return next})
    persist()
}
// Synchronization explicitly adopts the configured primary appearance,
// including its lack of an override. Other unselected outputs are untouched.
export function copyJABibleAppearanceToTargets(sourceId:string,targets:string[]):void {
    const source=getJABibleAppearance(sourceId)
    const current=get(jaBibleAppearances)
    const next={...current}
    let changed=false
    for(const id of targets)if(id!==sourceId){
        if(source && JSON.stringify(next[id]||null)!==JSON.stringify(source)){
            next[id]={...source}
            changed=true
        } else if(!source && next[id]){
            delete next[id]
            changed=true
        }
    }
    if(changed){jaBibleAppearances.set(next);persist()}
}
// Change only the paint behind Scripture, never the opacity of the entire
// item or span (which would make the letters transparent too). Extract the
// original solid RGB whenever possible, preserving black and tinted backdrops.
function bibleBackdropColor(base:string|undefined,percent:number):string {
    const alpha=(clampPercent(percent,65)/100).toFixed(2)
    const source=(base||"").trim()
    const hex=source.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i)
    if(hex){
        let digits=hex[1]
        if(digits.length===3||digits.length===4)digits=digits.slice(0,3).split("").map(x=>x+x).join("")
        const rgb=[0,2,4].map(start=>parseInt(digits.slice(start,start+2),16))
        return `rgba(${rgb.join(",")},${alpha})`
    }
    const rgb=source.match(/^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)/i)
    if(rgb){
        const channels=rgb.slice(1,4).map(value=>Math.min(255,Math.max(0,Math.round(Number(value)||0))))
        return `rgba(${channels.join(",")},${alpha})`
    }
    const named:Record<string,string>={black:"#000000",white:"#ffffff",transparent:"#000000"}
    return source.toLowerCase() in named ? bibleBackdropColor(named[source.toLowerCase()],percent)
        : `rgba(0,0,0,${alpha})`
}
function solidBackgroundInCss(style:string):string|undefined {
    const statements=style.match(/(?:^|;)\s*(?:background-color|background)\s*:\s*[^;]+/gi)||[]
    for(const statement of statements.reverse()){
        const candidate=statement.slice(statement.indexOf(":")+1).trim().replace(/\s*!important\s*$/i,"")
        if(/^(?:#[0-9a-f]{3,8}|rgba?\(|black$|white$|transparent$)/i.test(candidate))return candidate
    }
    return undefined
}
function changeCssBackdrop(style:string,percent:number):string|undefined {
    const existing=solidBackgroundInCss(style)
    // Append the last color declaration without removing other decoration.
    return existing===undefined ? undefined : `${style};background-color:${bibleBackdropColor(existing,percent)};`
}
// Respect the actual backdrop source: FreeShow templates can paint it at
// lineBg, item style, line alignment, or directly on a text span.
function withVerseBackdropOpacity(item:Item,percent:number,verseKey:(key:string|undefined)=>boolean,hasVerseKeys:boolean):Item {
    const isVerseLine=(line:NonNullable<Item["lines"]>[number])=>
        !hasVerseKeys || line.text?.some(part=>verseKey(part.sourceDynamicKey))
    const existingLineBg=item.specialStyle?.lineBg as string|undefined
    if(existingLineBg && existingLineBg.trim())return {
        ...item,specialStyle:{...item.specialStyle,lineBg:bibleBackdropColor(existingLineBg,percent)}
    }
    const boxStyle=changeCssBackdrop(item.style||"",percent)
    if(boxStyle!==undefined)return {...item,style:boxStyle}
    let found=false
    const lines=item.lines?.map(line=>{
        if(!isVerseLine(line))return line
        const aligned=changeCssBackdrop(line.align||"",percent)
        if(aligned!==undefined){found=true;return {...line,align:aligned}}
        let painted=false
        const segments=line.text.map(part=>{
            if(hasVerseKeys && !verseKey(part.sourceDynamicKey))return part
            const textStyle=changeCssBackdrop(part.style||"",percent)
            if(textStyle===undefined)return part
            painted=true
            return {...part,style:textStyle}
        })
        if(painted){found=true;return {...line,text:segments}}
        return line
    })
    if(found)return {...item,lines}
    // Template without a background: create one on verse lines only, not on
    // references or the entire output image. Zero percent is fully transparent.
    return {...item,lines:lines?.map(line=>isVerseLine(line)
        ? {...line,align:`${line.align||""};background-color:${bibleBackdropColor("#000000",percent)};`}
        : line)}
}

export function applyJABibleAppearanceToItems(items:Item[],raw:JABibleAppearance):Item[]{
    const a=normalizeJABibleAppearance(raw)
    const enabled=new Set(a.enabledFields)
    const vert=a.verticalAlign==="top"?"flex-start":a.verticalAlign==="bottom"?"flex-end":"center"
    const css=[
        enabled.has("fontFamily") ? `font-family:"${a.fontFamily}";` : "",
        enabled.has("fontSize") ? `font-size:${a.fontSize}px;` : "",
        enabled.has("fontWeight") ? `font-weight:${a.fontWeight};` : "",
        enabled.has("textColor") ? `color:${a.textColor};` : "",
        enabled.has("shadow") ? `text-shadow:${a.shadow?"2px 2px 5px rgba(0,0,0,.9)":"none"};` : ""
    ].join("")
    // Modern Scripture emits sourceDynamicKey for verse body runs. Keep
    // reference, translation title, attribution and their original smaller sizes.
    // Legacy templates without these markers use the complete text frame.
    const verseKey=(key:string|undefined)=>/^scripture(?:[1-4])?_text(?::|$)/.test(key||"")
    const hasVerseKeys=items.some(item=>item?.lines?.some(line=>
        line.text?.some(segment=>verseKey(segment.sourceDynamicKey))))
    return items.map(item=>{
        if(!item?.lines?.length || (item.type && item.type!=="text"))return item
        const hasVerses=item.lines.some(line=>line.text?.some(segment=>verseKey(segment.sourceDynamicKey)))
        if(hasVerseKeys && !hasVerses)return item
        const styled:Item={
            ...item,
            textFit:enabled.has("fontSize")?"none" as Item["textFit"]:item.textFit,
            align:enabled.has("verticalAlign")?`${item.align||""};align-items:${vert};`:item.align,
            lines:item.lines.map(line=>{
                const targetLine=!hasVerseKeys || line.text?.some(segment=>verseKey(segment.sourceDynamicKey))
                return {
                    ...line,
                    align:targetLine&&enabled.has("textAlign")?`${line.align||""};text-align:${a.textAlign};`:line.align,
                    text:line.text.map(segment=>({
                        ...segment,
                        style:targetLine && (!hasVerseKeys||verseKey(segment.sourceDynamicKey))
                            ? `${segment.style||""};${css}` : segment.style
                    }))
                }
            })
        }
        return enabled.has("lineBackgroundOpacity")
            ? withVerseBackdropOpacity(styled,a.lineBackgroundOpacity,verseKey,hasVerseKeys) : styled
    })
}
