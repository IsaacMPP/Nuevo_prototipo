"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "build");
const source = path.join(root, "prototype", "index.html");
fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(source)) throw new Error("Falta prototype/index.html");
const cli = require.resolve("tailwindcss/lib/cli.js");
const result = spawnSync(process.execPath, [cli,
    "-i", path.join(root, "desktop", "tailwind-input.css"),
    "-o", path.join(out, "tailwind.css"),
    "--content", path.join(root, "{prototype,desktop}", "*.{html,js}"),
    "--minify"
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error("Tailwind terminó con código " + result.status);
let html = fs.readFileSync(source, "utf8");
const cdn = /<script\s+src="https:\/\/cdn\.tailwindcss\.com\/3\.4\.17"><\/script>/;
if (!cdn.test(html)) throw new Error("No se encontró la referencia Tailwind del prototipo");
html = html.replace(cdn, '<link rel="stylesheet" href="tailwind.css">');
// Retain Gemini's approved DOM/layout, not its simulated audiovisual logic.
// Remove the single inline demo controller with its fictitious four screens,
// playback timers, hard-coded Bible versions and sample thumbnails.
const demos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi)];
if (demos.length !== 1) throw Error("El prototipo cambió: se esperaba exactamente un controlador de demostración");
html = html.replace(demos[0][0], "");
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' file: data:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' file: data:; media-src 'self' file:; object-src 'none'; connect-src 'none'">`;
html = html.replace("</head>", csp + "\n</head>");

// Las fuentes web originales son opcionales; con internet mantienen fidelidad visual,
// y sin internet hay fuentes alternativas para la interfaz.
html = html.replace("</body>", '<script src="../desktop/bridge.js"></script>\n</body>');
fs.writeFileSync(path.join(out, "index.html"), html, "utf8");
console.log("Interfaz offline generada: build/index.html");
