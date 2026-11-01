import { writable } from "svelte/store"

export type JAPresentationNavigation = { showId: string; outputIds: string[] } | null

// Scoped to the last explicitly chosen destinations for this presentation.
export const jaPresentationNavigation = writable<JAPresentationNavigation>(null)

export function resolveJAPresentationNavigationOutputs(
    activeIds: string[],
    primaryId: string,
    controlledId: string,
    activeShowId: string,
    selection: JAPresentationNavigation,
    slideShows: Record<string, string>,
    isScripture: boolean
): string[] {
    const fallback = primaryId ? activeIds.filter((id) => id === primaryId) : activeIds
    // Keep the Bible's independent keyboard route unchanged.
    if (isScripture || !activeShowId) return fallback
    if (controlledId && activeIds.includes(controlledId)) return [controlledId]
    if (!selection || selection.showId !== activeShowId) return fallback
    const targets = [...new Set(selection.outputIds)].filter((id) => activeIds.includes(id) && slideShows[id] === activeShowId)
    return targets.length ? targets : fallback
}
