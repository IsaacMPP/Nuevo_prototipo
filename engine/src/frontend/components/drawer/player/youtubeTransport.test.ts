import { describe, expect, it } from "vitest"
import { decideYouTubeTransport } from "./youtubeTransport"

describe("YouTube native IFrame transport", () => {
    it("pauses a playing or buffering iframe when JA is paused", () => {
        expect(decideYouTubeTransport(true, 1)).toBe("pause")
        expect(decideYouTubeTransport(true, 3)).toBe("pause")
    })
    it("resumes only when JA is playing and iframe is stopped", () => {
        expect(decideYouTubeTransport(false, 2)).toBe("play")
        expect(decideYouTubeTransport(false, 5)).toBe("play")
        expect(decideYouTubeTransport(false, 1)).toBeNull()
    })
    it("does not spam pause commands while the iframe is already paused", () => {
        expect(decideYouTubeTransport(true, 2)).toBeNull()
        expect(decideYouTubeTransport(true, 5)).toBeNull()
    })
})
