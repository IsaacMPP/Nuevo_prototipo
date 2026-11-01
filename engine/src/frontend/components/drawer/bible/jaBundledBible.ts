import { get } from "svelte/store"
import { Main } from "../../../../types/IPC/Main"
import { requestMain } from "../../../IPC/main"
import { drawerTabsData, scriptures } from "../../../stores"
import { save } from "../../../utils/save"

export const JA_BUNDLED_RV1909_ID = "ja-rv1909"
const NAME = "Reina-Valera 1909 (RV1909)"
let registering = false

/** Al cargar un perfil, ofrecer la Biblia offline verificada incluida en el instalador. */
export async function registerJARV1909(): Promise<boolean> {
    if (registering) return false
    registering = true
    try {
        // Confirma que el instalador realmente contiene los 66 libros; si falta
        // el recurso no mostramos una traducción falsa que no pueda proyectar.
        const bundled = await requestMain(Main.BIBLE, { id: JA_BUNDLED_RV1909_ID, name: NAME })
        if (bundled?.error || bundled?.content?.[1]?.books?.length !== 66) {
            console.warn("JA: RV1909 integrada no está disponible en esta instalación")
            return false
        }

        const entries = get(scriptures)
        if (entries[JA_BUNDLED_RV1909_ID]) return true
        scriptures.update((current) => ({
            ...current,
            [JA_BUNDLED_RV1909_ID]: {
                id: JA_BUNDLED_RV1909_ID,
                name: NAME
            }
        }))

        const currentTabId = get(drawerTabsData).scripture?.activeSubTab || ""
        const activeName = (entries[currentTabId]?.name || "").toLowerCase()
        // Priorizar español al agregar por primera vez si no hay selección,
        // o si la elección anterior era una Biblia inglesa de ejemplo.
        const selectedEnglish = /\b(english|king james|kjv|world english|american standard)\b/i.test(activeName)
        if (!currentTabId || selectedEnglish) {
            drawerTabsData.update((current) => ({
                ...current,
                scripture: {
                    ...current.scripture,
                    activeSubTab: JA_BUNDLED_RV1909_ID
                }
            }))
        }
        save()
        return true
    } catch (error) {
        console.error("JA: No se pudo registrar RV1909", error)
        return false
    } finally {
        registering = false
    }
}
