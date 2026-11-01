import { writable } from "svelte/store"

// Operator's inspected output; never changes the JA projection primary.
export const jaControlledOutputId = writable("")

// Switching back to Presentaciones changes the operator view only, never live output.
export function restoreJAPresentationWorkspace(): void {
    jaControlledOutputId.set("")
}
