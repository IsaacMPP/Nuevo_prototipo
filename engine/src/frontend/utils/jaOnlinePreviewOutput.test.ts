import { describe, expect, it } from "vitest"
import { resolveJAOnlinePreviewOutput } from "./jaOnlinePreviewOutput"

describe("JA online preview routing", () => {
    it("uses the supervised output when that screen owns a live session", () => {
        expect(resolveJAOnlinePreviewOutput(["main", "ipad"], "ipad", "main", "other")).toBe("ipad")
    })
    it("prefers JA primary when the supervised output has different media", () => {
        expect(resolveJAOnlinePreviewOutput(["main", "ipad"], "samsung", "main", "other")).toBe("main")
    })
    it("selects a secondary with this video if JA primary is showing something else", () => {
        expect(resolveJAOnlinePreviewOutput(["samsung"], "ipad", "main", "ipad")).toBe("samsung")
    })
    it("uses explicit primary when there is not yet a projected online session", () => {
        expect(resolveJAOnlinePreviewOutput([], "samsung", "main", "ipad")).toBe("main")
    })
    it("does not silently select a different session when operator controls this one", () => {
        expect(resolveJAOnlinePreviewOutput(["ipad", "main"], "main", "main", "ipad")).toBe("main")
    })
})
