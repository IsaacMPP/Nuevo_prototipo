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
    "--content", source,
    "--minify"
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error("Tailwind terminó con código " + result.status);
let html = fs.readFileSync(source, "utf8");
const cdn = /<script\s+src="https:\/\/cdn\.tailwindcss\.com\/3\.4\.17"><\/script>/;
if (!cdn.test(html)) throw new Error("No se encontró la referencia Tailwind del prototipo");
html = html.replace(cdn, '<link rel="stylesheet" href="tailwind.css">');
// Las fuentes web originales son opcionales; con internet mantienen fidelidad visual,
// y sin internet hay fuentes alternativas para la interfaz.
html = html.replace("</body>", '<script src="../desktop/bridge.js"></script>\n</body>');
fs.writeFileSync(path.join(out, "index.html"), html, "utf8");
console.log("Interfaz offline generada: build/index.html");
