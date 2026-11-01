import { loadThumbnail } from "../components/helpers/media"

// FreeShow persists generated thumbnails on disk. Keep only a small queue of
// concurrent thumbnail requests to avoid overwhelming low-end machines.
const MAX_ACTIVE = 2
let active = 0
const pending: Array<() => void> = []
const cache = new Map<string, Promise<string>>()

function release() {
    active -= 1
    pending.shift()?.()
}

export function queuedHymnThumbnail(path: string): Promise<string> {
    const existing = cache.get(path)
    if (existing) return existing
    const job = new Promise<string>((resolve) => {
        const run = async () => {
            active += 1
            try { resolve((await loadThumbnail(path)) || "") }
            catch { resolve("") }
            finally { release() }
        }
        if (active < MAX_ACTIVE) void run()
        else pending.push(() => { void run() })
    })
    cache.set(path, job)
    return job
}

// Clear only the transient promise cache; native thumbnail image files remain.
export function clearHymnThumbnailRequests() { cache.clear() }
