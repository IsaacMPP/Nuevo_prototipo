"use strict";
/**
 * Audita los controles de la interfaz Gemini real DESPUÉS de build:ui.
 * El resultado es un censo técnico, NO una certificación de funcionalidad.
 * No utiliza botones ni fuentes simuladas del prototipo original.
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const sourcePath = path.join(root, "build/index.html");
const shellPath = path.join(root, "engine/src/frontend/components/ja/JaGeminiShell.svelte");
const settingsPath = path.join(root, "engine/src/frontend/components/ja/JaGeminiSettings.svelte");
const reportDir = path.join(root, "experiments/ja-gemini-freeshow/build-audit");

function attr(raw, name) {
  // Evitar expresiones regulares construidas con fragmentos de HTML no confiables.
  const rx = /\b([a-zA-Z][-a-zA-Z0-9:]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let hit;
  while ((hit = rx.exec(raw))) {
    if (hit[1].toLowerCase() === name.toLowerCase()) return hit[2] ?? hit[3] ?? hit[4] ?? "";
  }
  return "";
}
function clean(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp|lt|gt|quot);/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
}
function collect(html) {
  // El controlador de demostración no forma parte del build de producción.
  const withoutScripts = html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "");
  const body = withoutScripts.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || withoutScripts;
  const controls = [];
  const rx = /<(button|input|select|textarea|a|summary)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  let m;
  while ((m = rx.exec(body))) {
    const tag = m[1].toLowerCase(), raw = m[2], id = attr(raw, "id");
    const hasHref = /\shref\s*=/.test(raw);
    if (tag === "a" && !hasHref && !/\brole\s*=/.test(raw)) continue;
    const label = attr(raw, "aria-label") || attr(raw, "title") || attr(raw, "value") ||
      (tag === "button" || tag === "a" || tag === "summary"
        ? clean(body.slice(rx.lastIndex, Math.min(body.length, rx.lastIndex + 450)).split(new RegExp("</" + tag + "\\s*>", "i"))[0])
        : "");
    controls.push({ key: id || "no-id:" + tag + ":" + rx.lastIndex, id, tag,
      label: clean(label), type: attr(raw, "type"), href: tag === "a" ? attr(raw, "href") : "",
      disabledInHtml: /(?:^|\s)disabled(?:\s|=|$)/i.test(raw), location: rx.lastIndex });
  }
  return controls;
}
function classify(entries, shell) {
  // Solo "wired-by-id" significa que existe manejador. No implica validación física.
  const bound = new Set([...shell.matchAll(/\bbind\(\s*["']([^"']+)["']\s*,/g)].map(m=>m[1]));
  const disabled = new Set([...shell.matchAll(/\bdisable\(\s*["']([^"']+)["']\s*,/g)].map(m=>m[1]));
  const duplicates = new Map();
  for (const e of entries) if(e.id) duplicates.set(e.id, (duplicates.get(e.id) || 0) + 1);
  return entries.map(e => {
    let status = "sin-verificar";
    if(e.disabledInHtml || disabled.has(e.id)) status = "deshabilitado";
    else if(e.id && bound.has(e.id)) status = "con-manejador-no-validado";
    else if(e.id && shell.includes('el("' + e.id + '")')) status = "referenciado-requiere-revision";
    if (!e.id) status = e.disabledInHtml ? "deshabilitado" : "sin-id-requiere-revision";
    return { ...e, status, duplicateId: !!e.id && duplicates.get(e.id) > 1 };
  });
}
function audit() {
  if(!fs.existsSync(sourcePath)) throw Error("Ejecutar npm run build:ui primero");
  const html = fs.readFileSync(sourcePath, "utf8");
  const shell = fs.readFileSync(shellPath, "utf8");
  const settings = fs.readFileSync(settingsPath, "utf8");
  const raw = collect(html), controls = classify(raw, shell);
  const declaredRuntime = [
    {area:"Sidebar",kind:"generated",name:"Biblia / Himnario / Multimedia",status:"con-manejador-no-validado"},
    {area:"Sidebar",kind:"generated",name:"YouTube / Presentaciones / Fondos / Listas",status:"deshabilitado"},
    {area:"Biblia",kind:"generated",name:"Navegador / Versión / cuadrícula / lista / proyectar",status:"parcial-requiere-E2E"},
    {area:"Pantallas",kind:"generated",name:"Tarjetas y selector de salida",status:"con-manejador-no-validado"},
    {area:"Configuración",kind:"component",name:"JaGeminiSettings",status: settings.includes('dispatch("close")') ? "parcial-requiere-E2E" : "sin-verificar"},
    {area:"Programa",kind:"generated",name:"Seek / volumen / limpiar / mute",status:"parcial-requiere-E2E"}
  ];
  const totals = {};
  for (const c of controls) totals[c.status] = (totals[c.status] || 0) + 1;
  const unknown = controls.filter(c => /sin-verificar|sin-id|requiere-revision/.test(c.status));
  const duplicated = controls.filter(c => c.duplicateId);
  const report = {version:1,commit:process.env.GITHUB_SHA || null,
    source:"build/index.html (DOM real sin controlador ficticio)",
    disclaimer:"Censo estático. Con-manejador NO implica función probada; requiere pruebas UI y físicas.",
    total:controls.length,totals,unresolved:unknown.length,duplicateIds:[...new Set(duplicated.map(x=>x.id))],
    declaredRuntime,controls};
  fs.mkdirSync(reportDir,{recursive:true});
  fs.writeFileSync(path.join(reportDir,"controles.json"),JSON.stringify(report,null,2)+"\n");
  const quote = value => '"' + String(value??"").replace(/"/g,'""').replace(/\r?\n/g," ") + '"';
  fs.writeFileSync(path.join(reportDir,"controles.csv"),
    ["id","tipo","etiqueta","estado","duplicado"].join(",")+"\n"+
    controls.map(c=>[c.id,c.tag,c.label,c.status,c.duplicateId].map(quote).join(",")).join("\n")+"\n");
  fs.writeFileSync(path.join(reportDir,"RESUMEN.md"),
    "# Auditoría automática del DOM Gemini\n\nControles detectados: **"+controls.length+
    "**; sin verificar: **"+unknown.length+"**; ID duplicados: **"+report.duplicateIds.length+
    "**.\n\nEste informe registra deuda funcional, no certifica botones. "+
    "Los controles creados en tiempo de ejecución se declaran aparte; se requiere inventario E2E dinámico.\n");
  console.log("[JA AUDITORIA] DOM real:",controls.length,"| sin verificar:",unknown.length,"| duplicados:",report.duplicateIds.length);
  console.log("[JA AUDITORIA] Estados:",JSON.stringify(totals));
  console.log("[JA AUDITORIA] Primeros pendientes:",unknown.slice(0,20).map(x=>x.id||x.label||x.key));
  const critical=["btnOpenSettingsModal","previewCanvasContent","programCanvasContent","btnProgramPause","leftModuleSidebar"];
  for (const id of critical) if (!html.includes('id="'+id+'"') && !html.includes("id='"+id+"'"))
    throw Error("Regresión del DOM Gemini: falta "+id);
  if(!shell.includes('bind("btnOpenSettingsModal"')) throw Error("El botón de configuración perdió su manejador");
  if(/dispatch\(["']classic["']\)/.test(shell)) throw Error("Se recuperó el cambio a FreeShow clásico");
  return report;
}
if(require.main === module) audit();
module.exports = {attr,collect,classify,audit};
