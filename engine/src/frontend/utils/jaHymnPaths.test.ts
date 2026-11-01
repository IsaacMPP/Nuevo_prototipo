import { describe, expect, it } from "vitest"
import { isJAExclusiveHymnPath, isJAOverlappingFolder, isPathInJACollection, normalizeJAContentPath } from "./jaHymnPaths"

describe("JA hymnal folder boundaries", () => {
    const root = "C:\\Users\\poder\\Documents\\JA Proyecciones 2\\Himnario Adventista"
    it("normalizes Windows separators and case", () => {
        expect(normalizeJAContentPath(root)).toContain("/himnario adventista")
        expect(isPathInJACollection("c:/USERS/poder/Documents/JA Proyecciones 2/HIMNARIO ADVENTISTA/001.mp4", root)).toBe(true)
    })
    it("does not confuse similarly named sibling folders", () => {
        expect(isPathInJACollection(root + " Extra/001.mp4", root)).toBe(false)
        expect(isPathInJACollection("C:/another/001.mp4", root)).toBe(false)
    })
    it("excludes files in all managed hymn collections", () => {
        expect(isJAExclusiveHymnPath(root + "/A/002.mp4", [root, "C:/Cantos Juveniles"])).toBe(true)
        expect(isJAExclusiveHymnPath("C:/Videos/002.mp4", [root])).toBe(false)
    })
    it("detects a multimedia ancestor overlapping hymnal children", () => {
        expect(isJAOverlappingFolder(root, "C:/Users/poder/Documents/JA Proyecciones 2")).toBe(true)
        expect(isJAOverlappingFolder(root, "C:/Media")).toBe(false)
    })
})
