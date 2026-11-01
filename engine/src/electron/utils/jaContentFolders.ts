import { app } from "electron"
import { mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"

// User-owned media belongs outside Program Files and remains after upgrades.
export function getJAContentFolders(): { base: string; folders: Record<string, string> } {
    const base = join(app.getPath("documents"), "JA Proyecciones 2")
    const folders = ["Biblias", "Himnario Adventista", "Cantos Juveniles", "Fondos Personalizados", "Audio", "Imagenes", "Videos", "Importaciones", "Presentaciones", "Cache", "Configuracion"]
    return { base, folders: Object.fromEntries(folders.map(name => [name, join(base, name)])) }
}

export function ensureJAContentFolders(): void {
    const base = join(app.getPath("documents"), "JA Proyecciones 2")
    const folders = [
        "Biblias", "Himnario Adventista", "Cantos Juveniles",
        "Fondos Personalizados", "Audio", "Imagenes", "Videos",
        "Importaciones", "Presentaciones", "Cache", "Configuracion"
    ]
    try {
        for (const name of ["", ...folders]) {
            const target = join(base, name)
            if (!existsSync(target)) mkdirSync(target, { recursive: true })
        }
        console.info("JA content folders ready:", base)
    } catch (error) {
        // Must not prevent FreeShow from launching when Documents is unavailable.
        console.warn("JA content directory unavailable:", error)
    }
}
