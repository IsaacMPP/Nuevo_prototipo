import { get } from "svelte/store"
import { Main } from "../../types/IPC/Main"
import { requestMain } from "../IPC/main"
import { audioFolders, mediaFolders } from "../stores"
import { installJAHymnLibrarySync, refreshJAHymnLibrary } from "./jaHymnLibrary"
import { normalizeJAContentPath } from "./jaHymnPaths"

// Register JA-managed locations with FreeShow's existing folder browsers.
// No copying, renaming, or clearing user-provided libraries.
const JA_MEDIA = ["Fondos Personalizados", "Imagenes", "Videos"]
const JA_AUDIO = ["Audio"]

export async function registerJAMediaFolders(): Promise<void> {
    try {
        const data = await requestMain(Main.JA_CONTENT_FOLDERS)
        if (!data?.folders) return
        const addMissing = (store: typeof mediaFolders, names: string[]) => {
            const existing = get(store)
            const knownPaths = new Set(Object.values(existing).map((item) => item.path?.toLowerCase()).filter(Boolean))
            const additions: typeof existing = {}
            for (const name of names) {
                const path = data.folders[name]
                if (!path || knownPaths.has(path.toLowerCase())) continue
                const id = "ja_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_")
                if (existing[id]) continue
                additions[id] = { name, path, icon: "folder" }
                knownPaths.add(path.toLowerCase())
            }
            if (Object.keys(additions).length) store.update((current) => ({ ...current, ...additions }))
        }
        // Move only managed hymn paths out of FreeShow media/audio registries.
        // Existing user folders outside these exact paths are not modified.
        const roots = ["Himnario Adventista", "Cantos Juveniles"].map((name) => data.folders[name]).filter(Boolean)
        const removeLegacy = (store: typeof mediaFolders) => store.update((entries) => {
            const filtered = Object.fromEntries(Object.entries(entries).filter(([, entry]) => !roots.some((root) => normalizeJAContentPath(root) === normalizeJAContentPath(entry.path || ""))))
            return Object.keys(entries).length === Object.keys(filtered).length ? entries : filtered
        })
        removeLegacy(mediaFolders)
        removeLegacy(audioFolders)
        addMissing(mediaFolders, JA_MEDIA)
        addMissing(audioFolders, JA_AUDIO)
        await refreshJAHymnLibrary()
        installJAHymnLibrarySync()
    } catch (error) {
        console.warn("JA media folders could not be registered:", error)
    }
}
