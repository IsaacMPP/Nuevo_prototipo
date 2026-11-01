import { describe, expect, it, vi } from "vitest"
import { shouldMuteYouTube, syncNativeYouTubeAudio } from "./youtubeAudio"

function makePlayer(initialMuted: boolean, initialVolume = 100) {
    const state = { muted: initialMuted, volume: initialVolume }
    const player = {
        isMuted: vi.fn(() => state.muted),
        mute: vi.fn(() => { state.muted = true }),
        unMute: vi.fn(() => { state.muted = false }),
        getVolume: vi.fn(() => state.volume),
        setVolume: vi.fn((volume: number) => { state.volume = volume })
    }
    return { state, player }
}

describe("YouTube raw IFrame API audio", () => {
    it("unmutes primary with synchronous native isMuted", () => {
        const { state, player } = makePlayer(true, 100)
        syncNativeYouTubeAudio(player, false)
        expect(state.muted).toBe(false)
        expect(player.unMute).toHaveBeenCalledOnce()
    })
    it("recovers a zero volume only at first audible initialization", () => {
        const { state, player } = makePlayer(true, 0)
        syncNativeYouTubeAudio(player, false, true)
        expect(state).toEqual({ muted: false, volume: 100 })
        state.volume = 0
        syncNativeYouTubeAudio(player, false, false)
        expect(state.volume).toBe(0)
    })
    it("mutes secondary/preview and preserves manual volume", () => {
        const { state, player } = makePlayer(false, 55)
        syncNativeYouTubeAudio(player, true)
        expect(state).toEqual({ muted: true, volume: 55 })
        expect(player.setVolume).not.toHaveBeenCalled()
    })
    it("retains JA policy for secondary and preview", () => {
        expect(shouldMuteYouTube(false, true, true, false)).toBe(false)
        expect(shouldMuteYouTube(false, true, true, true)).toBe(true)
        expect(shouldMuteYouTube(false, true, false, false)).toBe(true)
        expect(shouldMuteYouTube(true, true, true, false)).toBe(true)
        expect(shouldMuteYouTube(false, false, true, false)).toBe(true)
    })
})
