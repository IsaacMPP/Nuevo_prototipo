#!/usr/bin/env node
// Creates a unique, traceable build version without changing committed package-lock.
const fs = require("node:fs")
const path = require("node:path")
const run = Number(process.env.GITHUB_RUN_NUMBER)
const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || 1)
if (!Number.isSafeInteger(run) || run < 1 || !Number.isSafeInteger(attempt) || attempt < 1) {
    throw new Error("GITHUB_RUN_NUMBER and GITHUB_RUN_ATTEMPT must be positive integers")
}
const version = `2.0.${run * 100 + attempt}`
const pkgPath = path.join(__dirname, "../../package.json")
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
pkg.name = "ja-proyecciones-2"
pkg.productName = "JA Proyecciones 2"
pkg.version = version
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n")
const original = fs.readFileSync(path.join(__dirname, "../../config/building/electron-builder.yaml"), "utf8")
let config = original
    .replace(/^appId:.*$/m, "appId: mx.japroy.proyecciones2")
    .replace(/^productName:.*$/m, "productName: JA Proyecciones 2")
    .replace(/^artifactName:.*$/m, "artifactName: JA-Proyecciones-2-${version}-${arch}.${ext}")
// FreeShow's Azure signing identity belongs to its upstream maintainers.
config = config.replace(/^    icon: build\/public\/icon.png$/m, "    icon: build/public/ja-icon.ico")
config += `\nnsis:\n    installerSidebar: build/public/ja-installer-sidebar.bmp\n    installerHeader: build/public/ja-installer-header.bmp\n`
config = config.replace(/^    azureSignOptions:\s*\n(?:        [^\n]*\n)+/m, "")
const out = path.join(__dirname, "../../config/building/ja-windows.generated.yaml")
fs.writeFileSync(out, config)
fs.writeFileSync(path.join(__dirname, "../../ja-build-info.json"), JSON.stringify({
    version, commit: process.env.GITHUB_SHA || "local", run: process.env.GITHUB_RUN_ID || "", attempt
}, null, 2) + "\n")
console.log("JA version:", version)
