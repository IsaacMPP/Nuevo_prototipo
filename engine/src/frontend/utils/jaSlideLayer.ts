import { outputs } from "../stores"

// Display-only preference: never clear slides or interrupt playback.
export function setJASlideLayer(outputId: string, showOverMedia: boolean): void {
    outputs.update((current) => {
        const output = current[outputId]
        if (!output?.enabled || !output.active || output.stageOutput) return current
        return {
            ...current,
            [outputId]: {
                ...output,
                out: { ...(output.out || {}), jaSlideLayer: { showOverMedia } }
            }
        }
    })
}
