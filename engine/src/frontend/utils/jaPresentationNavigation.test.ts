import { describe, expect, it } from "vitest"
import { resolveJAPresentationNavigationOutputs as resolve } from "./jaPresentationNavigation"

const ids = ["main", "ipad", "samsung"]
const shows = { main: "hola", ipad: "hola", samsung: "different" }

describe("JA presentation arrow destinations", () => {
    it("uses the configured primary for normal slides", () => {
        expect(resolve(ids, "main", "", "hola", null, shows, false)).toEqual(["main"])
    })
    it("advances only explicitly selected screens showing the same presentation", () => {
        expect(resolve(ids, "main", "", "hola", { showId: "hola", outputIds: ["ipad", "main"] }, shows, false)).toEqual(["ipad", "main"])
    })
    it("can control a single screen instead of its old group", () => {
        expect(resolve(ids, "main", "ipad", "hola", { showId: "hola", outputIds: ["ipad", "main"] }, shows, false)).toEqual(["ipad"])
    })
    it("ignores disconnected or replaced screens", () => {
        expect(resolve(["main", "samsung"], "main", "", "hola", { showId: "hola", outputIds: ["main", "ipad", "samsung"] }, shows, false)).toEqual(["main"])
    })
    it("leaves Biblia on its existing navigation route", () => {
        expect(resolve(ids, "main", "ipad", "hola", { showId: "hola", outputIds: ["main", "ipad"] }, shows, true)).toEqual(["main"])
    })
    it("never substitutes a different output for the disconnected JA primary", () => {
        expect(resolve(["ipad"], "main", "", "hola", null, shows, false)).toEqual([])
    })
})
