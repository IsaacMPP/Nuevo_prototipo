/**
 * Choose the existing JA output for one physical Windows display.
 * This function is deliberately side-effect free. The caller claims each
 * chosen output for the entire reconciliation pass, preserving one-to-one
 * display/output assignment and never stealing a connected output.
 */
export type JADisplayAssignment = { id: number; label?: string }
export type JAOutputAssignment = { enabled?: boolean; stageOutput?: boolean; screen?: string | number }
export function selectJAOutputForDisplay(
    display: JADisplayAssignment,
    outputs: Record<string, JAOutputAssignment>,
    profiles: Record<string, string>,
    connectedDisplayIds: ReadonlySet<string>,
    claimedOutputIds: ReadonlySet<string>
): string {
    const displayId = String(display.id)
    const fingerprint = displayId + "|" + (display.label || "").trim().toLowerCase()
    const canClaim = (id: string): boolean => {
        const output = outputs[id]
        if (!id || !output || output.stageOutput || claimedOutputIds.has(id)) return false
        const previousScreen = String(output.screen || "")
        return !previousScreen || previousScreen === displayId || !connectedDisplayIds.has(previousScreen)
    }
    // A surviving exact screen association takes precedence over stale profiles.
    const exact = Object.entries(outputs).find(([id, out]) =>
        out.enabled && String(out.screen || "") === displayId && canClaim(id))?.[0]
    if (exact) return exact

    const remembered = profiles[fingerprint] || ""
    if (remembered && canClaim(remembered)) return remembered

    // An unused, truly unassigned output may be attached safely. Do not
    // silently repurpose a disconnected screen's output without its profile.
    return Object.entries(outputs).find(([id, out]) =>
        out.enabled && !out.screen && canClaim(id))?.[0] || ""
}
