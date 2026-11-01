export interface NativeYouTubeAudioAPI {
    isMuted(): boolean
    mute(): void
    unMute(): void
    getVolume(): number
    setVolume(volume: number): void
}

// YouTubePlayer.svelte forwards event.target, a RAW YT.Player. All methods are
// synchronous. The youtube-player proxy itself has Promise-returning methods,
// but it is never passed to this native adapter.
export function syncNativeYouTubeAudio(player: NativeYouTubeAudioAPI, muted: boolean, restoreVolume = false): void {
    if (muted) {
        if (!player.isMuted()) player.mute()
        return
    }
    if (player.isMuted()) player.unMute()
    if (restoreVolume && player.getVolume() === 0) player.setVolume(100)
}

export function shouldMuteYouTube(preview: boolean, inOutputWindow: boolean, sessionActive: boolean, sessionMuted: boolean): boolean {
    return preview || !inOutputWindow || !sessionActive || sessionMuted
}
