import { writable } from "svelte/store"

// A single global destination dialog avoids clipping by virtual lists and previews.
export type JADestinationDialog = {
    title: string
    onSend: (ids: string[]) => void
} | null
export const jaDestinationDialog = writable<JADestinationDialog>(null)
export function openJADestinationDialog(title: string, onSend: (ids: string[]) => void) {
    jaDestinationDialog.set({ title, onSend })
}
