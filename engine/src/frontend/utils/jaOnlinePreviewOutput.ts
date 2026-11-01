// The middle online-video preview follows the screen being controlled, but
// never routes to an unrelated screen when the same clip is playing elsewhere.
export function resolveJAOnlinePreviewOutput(
    sessionOutputIds: string[],
    controlledId: string,
    mainId: string,
    fallbackId: string
): string {
    const playing = new Set(sessionOutputIds.filter(Boolean))
    if (controlledId && playing.has(controlledId)) return controlledId
    if (mainId && playing.has(mainId)) return mainId
    return sessionOutputIds.find(Boolean) || mainId || fallbackId || ""
}
