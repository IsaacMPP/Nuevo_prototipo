// Raw YouTube IFrame API states: -1 unstarted, 0 ended, 1 playing,
// 2 paused, 3 buffering, 5 cued. Decisions use the native synchronous API.
export type YouTubeTransportAction = "play" | "pause" | null
export function decideYouTubeTransport(paused: boolean, state: number): YouTubeTransportAction {
    if (paused) return state === 1 || state === 3 ? "pause" : null
    return state === 1 || state === 3 ? null : "play"
}
