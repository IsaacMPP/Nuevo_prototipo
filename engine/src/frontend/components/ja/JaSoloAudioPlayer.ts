// JA Solo Audio: one local HTMLAudioElement, independent from FreeShow's
// VideoPlayer, AudioPlayer, WebAudio analyser and physical projection outputs.
// MP4 soundtracks are decoded by Chromium when supported by Windows codecs.
import { encodeFilePath } from "../helpers/media"

export class JaSoloAudioPlayer {
    private static element: HTMLAudioElement | null = null
    private static source = ""
    private static generation = 0
    private static errorText = ""

    static get path(): string { return this.source }
    static get audio(): HTMLAudioElement | null { return this.element }
    static get error(): string { return this.errorText }
    static isPlaying(path?: string): boolean {
        return !!this.element && (!path || path === this.source) && !this.element.paused
    }
    static async start(path: string): Promise<boolean> {
        if (!path) { this.errorText="Selecciona un archivo local."; return false }
        // Replace the existing session immediately. No 'busy' lock, so rapid
        // clicks and playlist Next cannot strand a pending media load.
        this.stop()
        const token = this.generation
        const audio = new Audio()
        this.element = audio
        this.source = path
        this.errorText = ""
        audio.preload = "auto"
        audio.volume = 1
        audio.muted = false
        audio.src = encodeFilePath(path)
        try {
            await audio.play()
            if (token !== this.generation || audio !== this.element) return false
            if (audio.paused) throw Error("Windows no inició la reproducción.")
            return true
        } catch(err) {
            if (token !== this.generation) return false
            const code = audio.error?.code
            this.errorText = "Solo audio: no se pudo reproducir el archivo ("+
                (code ? "código de medio "+code : String(err))+
                "). Comprueba la pista de audio del MP4 y la salida de Windows."
            this.stop(false)
            return false
        }
    }
    static stop(clearError=true): void {
        ++this.generation
        const old = this.element
        this.element = null
        this.source = ""
        if (clearError) this.errorText=""
        if (old) {
            old.pause()
            old.removeAttribute("src")
            old.load()
        }
    }
    static toggle(): Promise<void> | void {
        const audio=this.element
        if (!audio) return
        if (!audio.paused) { audio.pause(); return }
        return audio.play().then(()=>{this.errorText=""}).catch(err=>{
            this.errorText="No se pudo continuar Solo audio: "+String(err)
        })
    }
    static seek(seconds:number): void {
        const audio=this.element
        if (!audio || !Number.isFinite(seconds) || !Number.isFinite(audio.duration)) return
        audio.currentTime=Math.min(audio.duration,Math.max(0,seconds))
    }
    static setVolume(value:number): void {
        if(this.element)this.element.volume=Math.max(0,Math.min(1,value))
    }
    static setMuted(value:boolean): void {
        if(this.element)this.element.muted=value
    }
}
