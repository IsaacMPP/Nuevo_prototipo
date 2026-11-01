/**
 * Nombres populares de traducciones españolas. NO contiene textos bíblicos.
 * Biblias protegidas: importar exclusivamente desde fuentes autorizadas.
 */
export const JA_SPANISH_EDITIONS = [
    { code: "RVR1960", name: "Reina-Valera 1960", short: "RVR60", copyright: true },
    { code: "RVR1995", name: "Reina-Valera 1995", short: "RVR95", copyright: true },
    { code: "NVI", name: "Nueva Versión Internacional", short: "NVI", copyright: true },
    { code: "NTV", name: "Nueva Traducción Viviente", short: "NTV", copyright: true },
    { code: "NBLA", name: "Nueva Biblia de las Américas", short: "NBLA", copyright: true },
    { code: "DHH", name: "Dios Habla Hoy", short: "DHH", copyright: true },
    { code: "RV1909", name: "Reina-Valera 1909", short: "RV1909", copyright: false }
] as const

export function findSpanishEdition(name: string): string {
    const text = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
    if (/(REINAVALERA1960|RVR1960|RVR60|RV1960|RV60)/.test(text)) return "RVR1960"
    if (/(REINAVALERA1995|RVR1995|RVR95|RV1995|RV95)/.test(text)) return "RVR1995"
    if (/(NUEVAVERSIONINTERNACIONAL|NVI)/.test(text)) return "NVI"
    if (/(NUEVATRADUCCIONVIVIENTE|NTV)/.test(text)) return "NTV"
    if (/(NUEVABIBLIADELASAMERICAS|NBLA)/.test(text)) return "NBLA"
    if (/(DIOSHABLAHOY|DHH)/.test(text)) return "DHH"
    if (/(REINAVALERA1909|RV1909|RVR1909)/.test(text)) return "RV1909"
    return ""
}
