import { describe, expect, it } from "vitest"
import { selectJAOutputForDisplay } from "./jaMonitorAssignment"

const primary = { enabled: true, screen: "101" }
const secondary = { enabled: true, screen: "202" }
const free = { enabled: true, screen: "" }

describe("JA: monitor assignment is exclusive", () => {
    it("retains exact physical associations even if a stale profile disagrees", () => {
        const outputs = { main: primary, aux: secondary }
        const ids = new Set(["101", "202"])
        expect(selectJAOutputForDisplay({ id: 101, label: "HDMI" }, outputs,
            { "101|hdmi": "aux" }, ids, new Set())).toBe("main")
    })
    it("never assigns an output already claimed by another monitor", () => {
        const outputs = { main: { enabled: true, screen: "" }, aux: free }
        const profiles = { "101|hdmi": "main", "202|spacedesk": "main" }
        const ids = new Set(["101", "202"])
        expect(selectJAOutputForDisplay({ id: 101, label: "HDMI" }, outputs, profiles, ids, new Set())).toBe("main")
        expect(selectJAOutputForDisplay({ id: 202, label: "Spacedesk" }, outputs, profiles, ids, new Set(["main"]))).toBe("aux")
    })
    it("never steals a different connected display's output", () => {
        const outputs = { main: primary, aux: free }
        const ids = new Set(["101", "202"])
        expect(selectJAOutputForDisplay({ id: 202, label: "Spacedesk" }, outputs,
            { "202|spacedesk": "main" }, ids, new Set())).toBe("aux")
    })
    it("reuses a remembered disconnected output on reconnection", () => {
        const outputs = { main: primary, aux: { enabled: true, screen: "old-id" } }
        expect(selectJAOutputForDisplay({ id: 202, label: "Spacedesk" }, outputs,
            { "202|spacedesk": "aux" }, new Set(["101", "202"]), new Set(["main"]))).toBe("aux")
    })
    it("does not silently repurpose an unmatched disconnected output", () => {
        const outputs = { main: primary, aux: { enabled: true, screen: "old-id" } }
        expect(selectJAOutputForDisplay({ id: 202, label: "Unknown" }, outputs,
            {}, new Set(["101", "202"]), new Set(["main"]))).toBe("")
    })
    it("ignores the operator's reserved or already claimed outputs", () => {
        const outputs = { op: { enabled: true, stageOutput: true, screen: "101" },
            main: primary, aux: free }
        expect(selectJAOutputForDisplay({ id: 101, label: "HDMI" }, outputs, {},
            new Set(["101"]), new Set())).toBe("main")
        expect(selectJAOutputForDisplay({ id: 202, label: "Aux" }, outputs, {},
            new Set(["101", "202"]), new Set(["main"]))).toBe("aux")
    })
})
