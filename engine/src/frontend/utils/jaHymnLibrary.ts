import { writable } from "svelte/store"
import { Main } from "../../types/IPC/Main"
import type { FileFolder } from "../../types/Main"
import { requestMain } from "../IPC/main"
import { isJAExclusiveHymnPath, normalizeJAContentPath } from "./jaHymnPaths"

// JA-owned video libraries are separate from FreeShow mediaFolders/audioFolders.
export const hymnFolders = writable<Record<string, string>>({})
export const hymnVideos = writable<FileFolder[]>([])
export const hymnLibraryError = writable("")

export const hymnSourcePaths = writable<string[]>([])
export const hymnCollectionPaths = writable<Record<string, string[]>>({})
export const hymnSourceStatus = writable<Record<string, string>>({})
export const hymnLinks = writable<Record<string, string[]>>({ "Himnario Adventista": [], "Cantos Juveniles": [] })
const STORAGE = "ja-hymn-linked-sources-v1"
function readLinks(): Record<string, string[]> {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE) || "{}")
        return Object.fromEntries(["Himnario Adventista", "Cantos Juveniles"].map((name) => [name, Array.isArray(data[name]) ? data[name].filter((v: unknown) => typeof v === "string") : []]))
    } catch { return { "Himnario Adventista": [], "Cantos Juveniles": [] } }
}
export function linkHymnFolder(collection: string, path: string, previous = "") {
    if (!path || !["Himnario Adventista", "Cantos Juveniles"].includes(collection)) return
    const next = readLinks()
    next[collection] = next[collection].filter((p) => normalizeJAContentPath(p) !== normalizeJAContentPath(previous))
    if (!next[collection].some((p) => normalizeJAContentPath(p) === normalizeJAContentPath(path))) next[collection].push(path)
    localStorage.setItem(STORAGE, JSON.stringify(next))
    hymnLinks.set(next)
    void refreshJAHymnLibrary()
}
export function unlinkHymnFolder(collection: string, path: string) {
    const next = readLinks()
    if (!next[collection]) return
    next[collection] = next[collection].filter((p) => normalizeJAContentPath(p) !== normalizeJAContentPath(path))
    localStorage.setItem(STORAGE, JSON.stringify(next))
    hymnLinks.set(next)
    void refreshJAHymnLibrary()
}

const EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "avi", "mkv", "wmv"])
let refreshGeneration = 0

export function isHymnVideo(name: string): boolean {
    return EXTENSIONS.has((name.split(".").pop() || "").toLowerCase())
}

// Use the existing folder IPC; never copy, rename or change a user's videos.
// This can be invoked at startup and whenever the independent Hymnario tab opens.
export async function refreshJAHymnLibrary(): Promise<void> {
    const generation = ++refreshGeneration
    const folders = await requestMain(Main.JA_CONTENT_FOLDERS)
    if (!folders?.folders) return
    const roots: Record<string, string> = {}
    for (const name of ["Himnario Adventista", "Cantos Juveniles"]) {
        if (folders.folders[name]) roots[name] = folders.folders[name]
    }
    hymnFolders.set(roots)
    const links = readLinks()
    hymnLinks.set(links)
    const collections = Object.fromEntries(["Himnario Adventista", "Cantos Juveniles"].map((name) => [name, [roots[name], ...links[name]].filter(Boolean)]))
    hymnCollectionPaths.set(collections)
    const sources = [...new Set(Object.values(collections).flat())]
    hymnSourcePaths.set(sources)
    const statuses: Record<string, string> = {}
    const byPath = new Map<string, FileFolder>()
    for (const path of sources) {
        try {
            const result = await requestMain(Main.READ_FOLDER, { path, depth: 5 })
            if (generation !== refreshGeneration) return
            if (!result) { statuses[path] = "unavailable"; continue }
            let found = 0
            for (const file of Object.values(result) as FileFolder[]) {
                if (file.isFolder || !isHymnVideo(file.name)) continue
                if (!isJAExclusiveHymnPath(file.path, sources)) continue
                found++
                byPath.set(normalizeJAContentPath(file.path), file)
            }
            statuses[path] = found ? "available" : "empty"
        } catch {
            statuses[path] = "unavailable"
        }
    }
    if (generation !== refreshGeneration) return
    hymnSourceStatus.set(statuses)
    hymnVideos.set([...byPath.values()].sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true })))
    hymnLibraryError.set("")
}

let syncListenersInstalled = false
let lastRefreshTime = 0

// Refresh on returning to JA after files were copied, renamed or removed in
// Windows Explorer. A full reconciliation also runs on startup.
export function installJAHymnLibrarySync(): void {
    if (syncListenersInstalled || typeof window === "undefined") return
    syncListenersInstalled = true
    const reconcile = () => {
        if (document.visibilityState === "hidden") return
        const now = Date.now()
        if (now - lastRefreshTime < 1000) return
        lastRefreshTime = now
        void refreshJAHymnLibrary()
    }
    window.addEventListener("focus", reconcile)
    document.addEventListener("visibilitychange", reconcile)
}
