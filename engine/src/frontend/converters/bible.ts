import { uid } from "uid"
import { formatToFileName } from "../components/helpers/show"
import { activePopup, alertMessage, drawerTabsData, scriptures, scripturesCache } from "../stores"
import { translateText } from "../utils/language"
import { save } from "../utils/save"
import { convertBebliaBible } from "./bebliaBible"
import { convertOpenSongBible } from "./opensong"
import { convertOSISBible } from "./osisBible"
import { convertZefaniaBible } from "./zefaniaBible"

const bibleTypes = {
    freeshow: { name: "FreeShow", func: importFSB },
    zefania: { name: "Zefania", func: convertZefaniaBible },
    osis: { name: "OSIS", func: convertOSISBible },
    beblia: { name: "Beblia", func: convertBebliaBible },
    opensong: { name: "OpenSong", func: convertOpenSongBible }
}

/** A local FSB is a [id, bible] JSON tuple. Never accept arbitrary JSON as a Bible. */
export function validateLocalFSB(content: string): { id: string; bible: any } | null {
    try {
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "string" || !parsed[0].trim()) return null
        const bible = parsed[1]
        if (!bible || typeof bible.name !== "string" || !Array.isArray(bible.books) || bible.books.length < 1 || bible.books.length > 100) return null
        if (!bible.books.every((book: any) => book && typeof book.name === "string" && Array.isArray(book.chapters) && book.chapters.length > 0 &&
            book.chapters.every((chapter: any) => Array.isArray(chapter.verses) && chapter.verses.length > 0 &&
                chapter.verses.every((verse: any) => Number.isInteger(verse.number) && verse.number >= 0 && typeof verse.text === "string")))) return null
        return { id: parsed[0], bible }
    } catch (err) {
        console.warn("Invalid local FSB format", err)
        return null
    }
}

export function importBibles(data: any[]) {
    alertMessage.set("popup.importing")
    activePopup.set("alert")

    setTimeout(() => {
        let imported = 0
        const failed: string[] = []
        data.forEach((file) => {
            const type = file.type === "fsb" || !file.type ? "freeshow" : file.type
            const converter = bibleTypes[type as keyof typeof bibleTypes]
            if (!converter) {
                failed.push(file.name || "Formato desconocido")
                return
            }
            // The FreeShow import returns only the count of valid files.
            const result = converter.func([file])
            if (type === "freeshow" && result === 0) failed.push(file.name || "Archivo no válido")
            else imported++
        })

        let message = imported ? `✓ ${imported} Biblia(s) importada(s)` : "No se importó ninguna Biblia."
        if (failed.length) message += `<br><br>Archivos no importados:<br>${failed.map((name) => "• " + name.replace(/[<>&"]/g, "")).join("<br>")}`
        alertMessage.set(message)
    }, 200)
}

export function importFSB(data: any[]): number {
    let count = 0
    data.forEach(({ content, name }) => {
        const parsed = validateLocalFSB(content)
        if (!parsed) return

        const { id, bible } = parsed
        scripturesCache.update((a) => {
            a[id] = bible
            return a
        })

        const safeName = formatToFileName(bible.name || name)
        scriptures.update((a) => {
            a[id] = { name: safeName, id }
            return a
        })
        setActiveScripture(id)
        count++
    })
    if (count) save()
    return count
}

export function setActiveScripture(tabId: string) {
    drawerTabsData.update((a) => {
        a.scripture = { ...a.scripture, activeSubTab: tabId }
        return a
    })
}
