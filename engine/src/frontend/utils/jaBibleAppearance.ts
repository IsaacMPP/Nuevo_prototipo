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
    backgroundMode: "color" | "image"
    backgroundColor: string
    backgroundPath: string
}
export const DEFAULT_JA_BIBLE_APPEARANCE: JABibleAppearance = {
    enabledFields:[],fontFamily:"Arial",fontSize:72,fontWeight:"normal",textColor:"#FFFFFF",
    textAlign:"center",verticalAlign:"center",shadow:true,
    backgroundMode:"color",backgroundColor:"#10182A",backgroundPath:""
}
export const jaBibleAppearances = writable<Record<string,JABibleAppearance>>({})

const EDITABLE_FIELDS=["fontFamily","fontSize","fontWeight","textColor","textAlign","verticalAlign","shadow","backgroundMode","backgroundColor","backgroundPath"] as const
const isEditableField=(key:string):boolean=>(EDITABLE_FIELDS as readonly string[]).includes(key)
export const hasJABibleBackgroundOverride=(style:JABibleAppearance|undefined):boolean=>
    !!style?.enabledFields?.some(key=>["backgroundMode","backgroundColor","backgroundPath"].includes(key))
const safeColor=(value:unknown,defaultValue:string):string=>
    typeof value==="string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : defaultValue
const clampSize=(value:unknown):number=> {
    const numeric=Number(value)
    return Number.isFinite(numeric) ? Math.max(24,Math.min(180,Math.round(numeric))) : 72
}
export function normalizeJABibleAppearance(value:Partial<JABibleAppearance>|null|undefined):JABibleAppearance {
    const v=value||{}
    return {
        enabledFields:(Array.isArray(v.enabledFields) ? v.enabledFields : Object.keys(v)).filter(key=>typeof key==="string"&&isEditableField(key)),
        fontFamily:JA_BIBLE_FONT_FAMILIES.includes(v.fontFamily as typeof JA_BIBLE_FONT_FAMILIES[number])
            ? v.fontFamily! : DEFAULT_JA_BIBLE_APPEARANCE.fontFamily,
        fontSize:clampSize(v.fontSize),
        fontWeight:v.fontWeight==="bold"?"bold":"normal",
        textColor:safeColor(v.textColor,DEFAULT_JA_BIBLE_APPEARANCE.textColor),
        textAlign:v.textAlign==="left"||v.textAlign==="right"?v.textAlign:"center",
        verticalAlign:v.verticalAlign==="top"||v.verticalAlign==="bottom"?v.verticalAlign:"center",
        shadow:v.shadow!==false,
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
        const enabledFields=[...(previous?.enabledFields||[]),...Object.keys(patch).filter(isEditableField)]
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
    return items.map(item=>{
        if(!item?.lines?.length || (item.type && item.type!=="text"))return item
        return {
            ...item,
            textFit:enabled.has("fontSize")?"none" as Item["textFit"]:item.textFit,
            align:enabled.has("verticalAlign")?`${item.align||""};align-items:${vert};`:item.align,
            lines:item.lines.map(line=>({
                ...line,
                align:enabled.has("textAlign")?`${line.align||""};text-align:${a.textAlign};`:line.align,
                text:line.text.map(segment=>({...segment,style:`${segment.style||""};${css}`}))
            }))
        }
    })
}
