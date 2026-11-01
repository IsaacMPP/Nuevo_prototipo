import type { Outputs } from "../../types/Output"

export type JADestination = { id: string; name: string; role: "primary" | "secondary" }
export type JAProjectionRequest = { type: string; data: any; outputId: string; muted: boolean }

export function getJADestinations(outputs: Outputs, primaryId: string): JADestination[] {
    return Object.entries(outputs).filter(([, o]) =>
        o.enabled && o.active && !o.stageOutput && !o.ndi && !o.omt &&
        !o.rtmp && !o.webrtc && !o.blackmagic && !!o.screen
    ).map(([id, o]) => ({ id, name: o.name || id, role: id === primaryId ? "primary" as const : "secondary" as const }))
}

export function makeJAProjectionRequest(type: string, data: any, outputId: string, primaryId: string, outputs: Outputs): JAProjectionRequest | null {
    const destination = getJADestinations(outputs, primaryId).find((d) => d.id === outputId)
    if (!destination || !primaryId || !getJADestinations(outputs, primaryId).some((d) => d.role === "primary")) return null
    // Use per-output ownership. Do not mutate the source data reused by other displays.
    const isSecondary = destination.role === "secondary"
    const payload = data && typeof data === "object" ? { ...data } : data
    // Only media containing audio need muted; no impact on scripture/slide/image payloads.
    if (isSecondary && type === "background" && payload && (payload.type === "video" || payload.type === "player")) payload.muted = true
    return { type, data: payload, outputId, muted: isSecondary }
}
