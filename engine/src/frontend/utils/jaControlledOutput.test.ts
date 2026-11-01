import { get } from "svelte/store"
import { afterEach, describe, expect, it } from "vitest"
import { jaControlledOutputId, restoreJAPresentationWorkspace } from "./jaControlledOutput"

afterEach(() => jaControlledOutputId.set(""))

describe("JA return to presentation workspace", () => {
    it("exits the primary video mirror", () => {
        jaControlledOutputId.set("primario")
        restoreJAPresentationWorkspace()
        expect(get(jaControlledOutputId)).toBe("")
    })
    it("is idempotent in normal preview", () => {
        restoreJAPresentationWorkspace()
        expect(get(jaControlledOutputId)).toBe("")
    })
    it("does not select a different monitor after leaving secondary supervision", () => {
        jaControlledOutputId.set("ipad")
        restoreJAPresentationWorkspace()
        expect(get(jaControlledOutputId)).toBe("")
    })
})
