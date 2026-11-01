import { jaYouthPlayerVideos, legacyDemoPlayerVideos } from "./defaults"

// One-time, idempotent replacement of the original FreeShow demo entries.
// An unchanged sample is distinguished from an edited sample by its exact
// name/type/id and lack of additional user metadata.
export function getMigratedJAYouthPlayers(current: Record<string, any> | null | undefined): Record<string, any> | null {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null
    const updated = { ...current }
    let foundLegacy = false

    for (const [key, original] of Object.entries(legacyDemoPlayerVideos)) {
        const saved = updated[key]
        if (!saved || typeof saved !== "object" || Object.keys(saved).length !== 3) continue
        if (saved.name !== original.name || saved.type !== original.type || saved.id !== original.id) continue
        delete updated[key]
        foundLegacy = true
    }

    // A user who already removed all samples should not get new ones re-added.
    if (!foundLegacy) return null

    for (const [key, sample] of Object.entries(jaYouthPlayerVideos)) {
        if (Object.prototype.hasOwnProperty.call(updated, key)) continue
        if (Object.values(updated).some((saved: any) => saved?.type === "youtube" && saved?.id === sample.id)) continue
        updated[key] = { ...sample }
    }
    return updated
}
