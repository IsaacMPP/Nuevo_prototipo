<script lang="ts">
    // Puente real Gemini -> servicios FreeShow. No ejecuta los scripts del mock.
    import { createEventDispatcher, onMount } from "svelte"
    import { get } from "svelte/store"
    import { geminiHtml, geminiBodyClasses } from "./gemini-fragment.generated"
    import { media, mediaFolders, outputs, outLocked } from "../../stores"
    import { encodeFilePath, getExtension, getMediaType } from "../helpers/media"
    import { clearBackground } from "../output/clear"
    import { setOutput } from "../helpers/output"
    import { VideoPlayer } from "../media/video/videoPlayer"
    import { videoSync } from "../media/video/videoSync"
    import PreviewOutput from "../output/preview/PreviewOutput.svelte"

    const dispatch = createEventDispatcher()
    let host: HTMLDivElement
    let prepared = ""
    let selectedId = ""
    let mode: "multimedia" | "himnario" = "multimedia"
    let programRenderer: PreviewOutput | null = null
    let renderedOutput = ""
    let playingPath = ""
    let listeningOutput = ""
    let programMute: HTMLButtonElement | null = null
    let stopVideoState: (() => void) | null = null
    let cleanup: Array<() => void> = []
    let programSeek: HTMLInputElement | null = null
    let previewMedia: HTMLMediaElement | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let videoState = { paused: true, muted: false, currentTime: 0, duration: 0 }

    const el = (id: string) => host?.querySelector<HTMLElement>("#" + id) || null
    const fileName = (path: string) => path.split(/[\\/]/).pop() || path
    const time = (seconds: number) => {
        const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
    }
    function notice(message: string) {
        const label = el("jaToastText")
        const toast = el("jaToast")
        if (label && toast) {
            label.textContent = message
            toast.classList.remove("hidden")
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => toast.classList.add("hidden"), 4500)
        } else console.info("[JA Gemini]", message)
    }
    function bind(id: string, fn: () => void) {
        const element = el(id)
        if (!element) return
        element.addEventListener("click", fn)
        cleanup.push(() => element.removeEventListener("click", fn))
    }
    function disable(id: string, reason: string) {
        const element = el(id) as HTMLButtonElement | null
        if (!element) return
        element.disabled = true
        element.setAttribute("aria-disabled", "true")
        element.title = reason
    }
    function chooseOutput() {
        const available = Object.entries(get(outputs))
            .filter(([, value]) => value && value.enabled && !value.stageOutput)
            .map(([id]) => id)
        if (!available.includes(selectedId)) selectedId = available[0] || ""
        return available
    }
    function rebuildOutputs() {
        if (!host) return
        const available = chooseOutput()
        const list = el("multiscreenCardsList")
        const targets = el("quickTargetButtons")
        list?.replaceChildren()
        targets?.replaceChildren()
        if (!available.length) {
            if (list) list.textContent = "Configura una salida en FreeShow antes de proyectar."
            if (targets) targets.textContent = "Sin salida configurada"
        }
        for (const id of available) {
            const value = get(outputs)[id]
            const name = value.name || "Salida " + id
            const button = document.createElement("button")
            button.type = "button"
            button.className = "text-left w-full p-3 rounded-lg border text-xs " + (id === selectedId ? "border-amber-400 bg-[#102d53] text-white" : "border-[#27446e] bg-[#091a38] text-slate-200")
            const background = value.out?.background
            button.textContent = name + (background ? " · " + fileName(background.path || background.id || "") : " · Libre")
            button.onclick = () => { selectedId = id; rebuildOutputs(); syncProgram() }
            list?.appendChild(button)
            const target = button.cloneNode(true) as HTMLButtonElement
            target.className = "px-3 py-1 rounded-lg border text-xs " + (id === selectedId ? "pill-amber-target" : "border-[#27446e]")
            target.onclick = button.onclick
            targets?.appendChild(target)
        }
        syncProgram()
    }
    function syncProgram() {
        if (!host) return
        const target = el("programCanvasContent")
        const available = chooseOutput()
        const output = selectedId ? get(outputs)[selectedId] : null
        if (target && renderedOutput !== selectedId) {
            programRenderer?.$destroy()
            programRenderer = null
            renderedOutput = selectedId
            target.replaceChildren()
            if (selectedId) programRenderer = new PreviewOutput({ target, props: { outputId: selectedId } })
            else target.textContent = "Sin salida FreeShow"
        }
        const path = output?.out?.background?.path || output?.out?.background?.id || ""
        const valid = !!path && (getMediaType(getExtension(path)) === "video" || output?.out?.background?.type === "player")
        if (playingPath !== path || listeningOutput !== selectedId || (stopVideoState && (!selectedId || !valid))) {
            stopVideoState?.()
            stopVideoState = null
            playingPath = path
            listeningOutput = selectedId
            videoState = { paused: true, muted: false, currentTime: 0, duration: 0 }
            if (valid) stopVideoState = videoSync(path, selectedId, (next) => {
                videoState = {
                    paused: !!next.paused, muted: !!next.muted,
                    currentTime: Number(next.currentTime) || 0,
                    duration: Number(next.duration) || 0
                }
                updateTransport()
            })
        }
        const label = el("programStateLabel")
        if (label) label.textContent = output ? (path ? fileName(path) : "Salida libre") : "Sin salida"
        const badge = el("programBadgeText")
        if (badge) badge.textContent = output ? (path ? "Programa · FreeShow" : "Programa · Sin emisión") : "Programa · Sin salida"
        updateTransport()
        // La primera prueba no cambia automáticamente salidas no seleccionadas.
        if (available.length !== 1) disable("btnPreviewToAll", "Enviar a todos: se evaluará después de aislar sesiones")
    }
    function updateTransport() {
        const pause = el("btnProgramPause") as HTMLButtonElement | null
        if (pause) {
            pause.disabled = !playingPath || get(outLocked)
            pause.title = videoState.paused ? "Reproducir en Programa" : "Pausar Programa"
            pause.setAttribute("aria-label", pause.title)
            pause.textContent = videoState.paused ? "▶" : "Ⅱ"
        }
        if (programMute) {
            programMute.disabled = !playingPath || get(outLocked)
            programMute.textContent = videoState.muted ? "🔇" : "🔊"
            programMute.title = videoState.muted ? "Reactivar audio de Programa" : "Silenciar Programa"
        }
        const counter = el("programTimeCounter")
        if (counter) counter.textContent = playingPath ? time(videoState.currentTime) + " / " + time(videoState.duration) : "—"
        if (programSeek) {
            programSeek.disabled = !playingPath || !Number.isFinite(videoState.duration) || videoState.duration <= 0
            programSeek.max = String(Math.max(1, videoState.duration))
            if (document.activeElement !== programSeek) programSeek.value = String(videoState.currentTime)
        }
    }
    function sourceFiles() {
        const folders = Object.values(get(mediaFolders)).filter(Boolean)
        const hymnFolders = folders.filter((f) => /himnario|himnos|hymns|cantos/i.test(f.name || "")).map((f) => (f.path || "").toLowerCase())
        return Object.keys(get(media))
            .filter((path) => {
                const type = getMediaType(getExtension(path))
                if (type !== "video" && type !== "image" && type !== "audio") return false
                if (path.startsWith("http:") || path.startsWith("https:")) return false
                return mode !== "himnario" || hymnFolders.some((f) => path.toLowerCase().startsWith(f))
            }).sort((a, b) => fileName(a).localeCompare(fileName(b), "es"))
    }
    function renderLibrary() {
        if (!host) return
        const area = el(mode === "himnario" ? "hymnModuleGrid" : "multimediaCardsGrid")
        if (!area) return
        const files = sourceFiles()
        area.replaceChildren()
        if (!files.length) {
            const msg = document.createElement("p")
            msg.className = "col-span-full p-5 text-sm text-slate-300"
            msg.textContent = "Sin archivos indexados. Abre Biblioteca FreeShow para vincular la carpeta real; después regresa a Gemini."
            area.append(msg)
            return
        }
        const term = ((el(mode === "himnario" ? "hymnModuleSearch" : "multimediaSearchInput") as HTMLInputElement | null)?.value || "").toLocaleLowerCase("es")
        for (const path of files.filter((f) => fileName(f).toLocaleLowerCase("es").includes(term)).slice(0, 160)) {
            const item = document.createElement("button")
            item.type = "button"
            item.className = "p-2 min-w-0 rounded-lg bg-[#0a1938] border border-[#24446f] text-left hover:border-cyan-400"
            const img = document.createElement("div")
            img.className = "aspect-video rounded-md bg-[#06132a] flex items-center justify-center text-sky-300"
            img.textContent = getMediaType(getExtension(path)) === "video" ? "▶" : "▣"
            const title = document.createElement("p")
            title.className = "text-xs text-slate-200 truncate mt-2"
            title.textContent = fileName(path)
            item.append(img, title)
            item.onclick = () => prepare(path)
            area.append(item)
        }
        if (files.length > 160) {
            const info = document.createElement("p")
            info.textContent = "Mostrando 160 archivos. Usa el filtro para localizar otros."
            info.className = "col-span-full text-xs text-slate-300 p-2"
            area.append(info)
        }
    }
    function showModule(next: "multimedia" | "himnario") {
        mode = next
        for (const [module, section] of [["multimedia", "moduleView_multimedia"], ["himnario", "moduleView_himnario"], ["biblia", "moduleView_biblia"], ["other", "moduleView_other"]]) {
            const element = el(section)
            if (element) {
                element.classList.toggle("hidden", module !== next)
                element.classList.toggle("flex", module === next)
            }
        }
        renderLibrary()
    }
    function setupNavigation() {
        const menu = el("leftModuleSidebar")
        if (!menu) return
        menu.replaceChildren()
        for (const [name, text] of [
            ["multimedia", "▶ Multimedia"], ["himnario", "♫ Himnario"],
            ["biblia", "📖 Biblia · pendiente"], ["youtube", "▶ YouTube · pendiente"],
            ["presentaciones", "▣ Presentaciones · pendiente"], ["classic", "↗ Biblioteca FreeShow"]
        ]) {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#142c54] rounded-md"
            button.textContent = text
            if (name === "multimedia" || name === "himnario")
                button.onclick = () => showModule(name)
            else if (name === "classic") button.onclick = () => dispatch("classic")
            else { button.disabled = true; button.title = "Pendiente de integración con el motor real" }
            menu.append(button)
        }
    }
    function updatePreviewProgress() {
        const counter = el("previewTimeCounter")
        if (counter && previewMedia) counter.textContent = time(previewMedia.currentTime) + " / " + time(previewMedia.duration)
        const slider = el("previewSeekSlider") as HTMLInputElement | null
        if (slider && previewMedia && Number.isFinite(previewMedia.duration)) {
            slider.disabled = false
            slider.max = String(previewMedia.duration)
            if (document.activeElement !== slider) slider.value = String(previewMedia.currentTime)
        }
        const play = el("btnPreviewPlay") as HTMLButtonElement | null
        if (play) play.textContent = previewMedia?.paused ? "▶" : "Ⅱ"
    }
    function prepare(path: string) {
        prepared = path
        previewMedia?.pause()
        previewMedia = null
        const target = el("previewCanvasContent")
        if (!target) return
        target.replaceChildren()
        const type = getMediaType(getExtension(path))
        if (type === "video" || type === "audio") {
            const m = document.createElement(type === "video" ? "video" : "audio")
            m.className = "w-full h-full object-contain"
            m.src = encodeFilePath(path)
            m.preload = "metadata"
            m.muted = true
            m.controls = false
            m.addEventListener("timeupdate", updatePreviewProgress)
            m.addEventListener("loadedmetadata", updatePreviewProgress)
            m.addEventListener("play", updatePreviewProgress)
            m.addEventListener("pause", updatePreviewProgress)
            m.addEventListener("error", () => notice("Vista previa: formato o ruta no reproducible"))
            target.append(m)
            previewMedia = m
        } else {
            const img = document.createElement("img")
            img.src = encodeFilePath(path)
            img.alt = fileName(path)
            img.className = "w-full h-full object-contain"
            target.append(img)
        }
        const label = el("previewTimeCounter")
        if (label) label.textContent = fileName(path)
        updatePreviewProgress()
    }
    function project() {
        if (!prepared) return notice("Selecciona primero un archivo real de la biblioteca")
        const ids = chooseOutput()
        if (ids.length !== 1 || !selectedId || !ids.includes(selectedId))
            return notice("Esta prueba aislada solo admite UNA salida habilitada para proteger las demás.")
        if (get(outLocked)) return notice("La salida está bloqueada desde FreeShow.")
        setOutput("background", { path: prepared, type: getMediaType(getExtension(prepared)), loop: false, muted: false, startAt: 0 }, false, selectedId)
        notice("Enviado al motor FreeShow: " + fileName(prepared))
    }
    function clearProgram() {
        if (chooseOutput().length !== 1 || !selectedId) return notice("Limpieza de múltiples salidas no habilitada en esta prueba")
        if (get(outLocked)) return notice("La salida está bloqueada")
        clearBackground(selectedId)
        // No modificar previewMedia ni prepared.
        notice("Fondo de Programa limpiado. Vista previa permanece preparada.")
    }
    function pauseProgram() {
        if (!playingPath || !selectedId) return notice("Programa no tiene vídeo activo")
        if (videoState.paused) VideoPlayer.play(playingPath, selectedId)
        else VideoPlayer.pause(playingPath, selectedId)
    }
    function muteProgram() {
        if (!playingPath || !selectedId) return notice("Programa no tiene vídeo activo")
        VideoPlayer.toggleMute(playingPath, selectedId)
    }
    onMount(() => {
        setupNavigation()
        showModule("multimedia")
        const program = el("programCanvasContent")
        if (program) program.replaceChildren()
        const preview = el("previewCanvasContent")
        if (preview) { preview.replaceChildren(); preview.textContent = "Selecciona un archivo para preparar Vista previa" }
        const slider = el("previewSeekSlider") as HTMLInputElement | null
        if (slider) {
            slider.disabled = true
            slider.addEventListener("input", () => { if (previewMedia) previewMedia.currentTime = Number(slider.value) || 0 })
        }
        bind("btnPreviewPlay", () => { if (previewMedia) { if (previewMedia.paused) void previewMedia.play().catch(() => notice("No se pudo iniciar Vista previa")); else previewMedia.pause() } })
        bind("btnPreviewMute", () => { if (previewMedia) previewMedia.muted = !previewMedia.muted })
        bind("btnBridgeQuickPlay", project)
        bind("btnBridgeCut", project)
        bind("btnProgramPause", pauseProgram)
        bind("btnBridgeClearText", () => notice("Limpiar texto se habilitará al integrar Biblia"))
        bind("btnBridgeBlack", () => notice("Cortina negra: todavía no integrada"))
        const programStatus = el("programTimeCounter")?.parentElement
        if (programStatus) {
            programSeek = document.createElement("input")
            programSeek.type = "range"
            programSeek.min = "0"; programSeek.max = "1"; programSeek.step = "0.1"
            programSeek.disabled = true
            programSeek.title = "Buscar posición real del vídeo en Programa"
            programSeek.className = "w-full accent-emerald-400"
            programSeek.addEventListener("change", () => {
                if (playingPath && selectedId && programSeek) VideoPlayer.seekTo(playingPath, selectedId, Number(programSeek.value))
            })
            programStatus.append(programSeek)
            cleanup.push(() => programSeek?.remove())
        }
        const programButtons = el("btnProgramPause")?.parentElement
        if (programButtons) {
            const clear = document.createElement("button")
            clear.type = "button"; clear.textContent = "✕"
            clear.title = "Limpiar solo el fondo de Programa"
            clear.className = "text-xs border border-[#355681] px-2 py-1 rounded text-white"
            clear.onclick = clearProgram
            programButtons.append(clear)
            cleanup.push(() => clear.remove())
            const mute = document.createElement("button")
            mute.type = "button"; mute.textContent = "🔊"
            mute.title = "Silenciar/reactivar vídeo de Programa"
            mute.className = clear.className
            mute.onclick = muteProgram
            programMute = mute
            programButtons.append(mute)
            cleanup.push(() => mute.remove())
        }
        disable("btnBridgeFade", "Fundido de multimedia pendiente de validación")
        disable("btnProgramToAll", "Envío múltiple pendiente de aislamiento")
        disable("btnPreviewToAll", "Envío múltiple pendiente de aislamiento")
        disable("btnProjectSelectedVerse", "Biblia todavía no integrada en esta prueba")
        disable("btnOpenSettingsModal", "Configura pantallas y bibliotecas desde FreeShow clásico")
        const vol = el("programVolumeSlider") as HTMLInputElement | null
        if (vol) { vol.disabled = true; vol.title = "Volumen fino pendiente; usar silencio/reactivar real" }
        const hymnSearch = el("hymnModuleSearch")
        const mediaSearch = el("multimediaSearchInput")
        hymnSearch?.addEventListener("input", renderLibrary)
        mediaSearch?.addEventListener("input", renderLibrary)
        cleanup.push(() => hymnSearch?.removeEventListener("input", renderLibrary), () => mediaSearch?.removeEventListener("input", renderLibrary))
        const uOutputs = outputs.subscribe(() => rebuildOutputs())
        const uMedia = media.subscribe(() => renderLibrary())
        const uFolders = mediaFolders.subscribe(() => renderLibrary())
        cleanup.push(uOutputs, uMedia, uFolders)
        rebuildOutputs()
        return () => {
            if (timer) clearTimeout(timer)
            previewMedia?.pause()
            stopVideoState?.()
            programRenderer?.$destroy()
            for (const off of cleanup) off()
            cleanup = []
        }
    })
</script>

<svelte:head><link rel="stylesheet" href="ja-gemini.css" /></svelte:head>
<div class={"ja-gemini-host " + geminiBodyClasses} bind:this={host}>
    {@html geminiHtml}
</div>
<style>
    .ja-gemini-host { width: 100%; height: 100%; overflow: hidden; position: relative; }
    .ja-gemini-host :global(#programCanvasContent .previewOutput) { width: 100%; height: 100%; }
    .ja-gemini-host :global(#programCanvasContent .center) { width: 100%; height: 100%; }
</style>
