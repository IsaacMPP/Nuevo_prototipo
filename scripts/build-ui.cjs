"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "build");
const source = path.join(root, "prototype", "index.html");
fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(source)) throw new Error("Falta prototype/index.html");
const cli = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss");
if (!fs.existsSync(cli)) throw new Error("Ejecuta npm install antes de compilar la interfaz");
const result = spawnSync(cli, [
    "-i", path.join(root, "desktop", "tailwind-input.css"),
    "-o", path.join(out, "tailwind.css"),
    "--content", source,
    "--minify"
], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
let html = fs.readFileSync(source, "utf8");
const cdn = /<script\s+src="https:\/\/cdn\.tailwindcss\.com\/3\.4\.17"><\/script>/;
if (!cdn.test(html)) throw new Error("No se encontró la referencia Tailwind del prototipo");
html = html.replace(cdn, '<link rel="stylesheet" href="tailwind.css">');
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"\s*\/?>(\r?\n)?/g, "");
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin\s*\/?>(\r?\n)?/g, "");
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/g, "");
html = html.replace("</body>", '<script src="../desktop/bridge.js"></script>\n</body>');
fs.writeFileSync(path.join(out, "index.html"), html, "utf8");
console.log("Interfaz offline generada: build/index.html");
