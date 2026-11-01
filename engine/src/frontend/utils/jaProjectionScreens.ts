import type { Outputs } from "../../types/Output"

// Conservative classification: only real, assigned, active Windows-display outputs.
export function getJAProjectionOutputs(outputs: Outputs, displays: Array<{ id: number | string; internal?: boolean; primary?: boolean }>, operatorScreenId: string) {
    const known = new Set(displays.filter((d) => !d.internal && String(d.id) !== operatorScreenId).map((d) => String(d.id)))
    return Object.entries(outputs).filter(([, out]) =>
        out.enabled && out.active && !out.stageOutput && !out.ndi && !out.omt && !out.rtmp &&
        !out.webrtc && !out.blackmagic && !!out.screen && known.has(String(out.screen))
    ).map(([id, out]) => ({ id, name: out.name || id, screen: String(out.screen) }))
}
export function getJAAdvancedOutputCount(outputs: Outputs, displays: Array<{ id: number | string; internal?: boolean; primary?: boolean }>, operatorScreenId: string) {
    return getJAProjectionOutputs(outputs, displays, operatorScreenId).length
}
