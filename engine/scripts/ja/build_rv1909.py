#!/usr/bin/env python3
"""Construye la Biblia RV1909 offline para el instalador JA Proyección.

Origen: eBible.org, spaRV1909, dominio público.
No depende de herramientas externas salvo Python 3.12 estándar.
"""
from __future__ import annotations
import hashlib
import io
import json
import re
import sys
import urllib.request
import unicodedata
import zipfile
from pathlib import Path

URL = "https://ebible.org/Scriptures/spaRV1909_vpl.zip"
# Fail closed: only explicitly reviewed ZIP digests from the official eBible URL.
# Do not accept arbitrary updates; ZIP packaging can change independently of VPL text.
APPROVED_ZIP_SHA256 = frozenset({
    "c901a31a89421eafa54e82a0a2ad94962c6889e3c5556c2a0834529789c4ac76",  # previous builds
    "f0b20b2473b3ed30dcee584b2311b6a1db27b32e714f1a2b0e97d01ba179f284",  # CI 2026-10-30
})
ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "public" / "ja-bibles" / "rv1909.fsb"
BOOKS = [
("GEN","Génesis"),("EXO","Éxodo"),("LEV","Levítico"),("NUM","Números"),("DEU","Deuteronomio"),
("JOS","Josué"),("JDG","Jueces"),("RUT","Rut"),("1SA","1 Samuel"),("2SA","2 Samuel"),
("1KI","1 Reyes"),("2KI","2 Reyes"),("1CH","1 Crónicas"),("2CH","2 Crónicas"),("EZR","Esdras"),
("NEH","Nehemías"),("EST","Ester"),("JOB","Job"),("PSA","Salmos"),("PRO","Proverbios"),
("ECC","Eclesiastés"),("SNG","Cantar de los Cantares"),("ISA","Isaías"),("JER","Jeremías"),
("LAM","Lamentaciones"),("EZK","Ezequiel"),("DAN","Daniel"),("HOS","Oseas"),("JOL","Joel"),
("AMO","Amós"),("OBA","Abdías"),("JON","Jonás"),("MIC","Miqueas"),("NAM","Nahúm"),
("HAB","Habacuc"),("ZEP","Sofonías"),("HAG","Hageo"),("ZEC","Zacarías"),("MAL","Malaquías"),
("MAT","Mateo"),("MRK","Marcos"),("LUK","Lucas"),("JHN","Juan"),("ACT","Hechos"),
("ROM","Romanos"),("1CO","1 Corintios"),("2CO","2 Corintios"),("GAL","Gálatas"),
("EPH","Efesios"),("PHP","Filipenses"),("COL","Colosenses"),("1TH","1 Tesalonicenses"),
("2TH","2 Tesalonicenses"),("1TI","1 Timoteo"),("2TI","2 Timoteo"),("TIT","Tito"),
("PHM","Filemón"),("HEB","Hebreos"),("JAS","Santiago"),("1PE","1 Pedro"),
("2PE","2 Pedro"),("1JN","1 Juan"),("2JN","2 Juan"),("3JN","3 Juan"),
("JUD","Judas"),("REV","Apocalipsis")
]
ALIASES: dict[str, str] = {}
for code, name in BOOKS:
    ALIASES[code] = code
    ALIASES[name.casefold().replace(" ", "")] = code
# BibleWorks abbreviations and common English book names.
OTHERS = {
"genesis":"GEN","gen":"GEN","exodus":"EXO","exo":"EXO","leviticus":"LEV","lev":"LEV",
"numbers":"NUM","num":"NUM","deuteronomy":"DEU","deut":"DEU","joshua":"JOS","josh":"JOS",
"judges":"JDG","judg":"JDG","ruth":"RUT","1samuel":"1SA","1sam":"1SA","2samuel":"2SA","2sam":"2SA",
"1kings":"1KI","1kgs":"1KI","2kings":"2KI","2kgs":"2KI","1chronicles":"1CH","1chr":"1CH",
"2chronicles":"2CH","2chr":"2CH","ezra":"EZR","nehemiah":"NEH","neh":"NEH","esther":"EST",
"psalms":"PSA","psalm":"PSA","ps":"PSA","proverbs":"PRO","prov":"PRO","ecclesiastes":"ECC",
"songofsolomon":"SNG","songofsongs":"SNG","isaiah":"ISA","jeremiah":"JER","lamentations":"LAM",
"ezekiel":"EZK","daniel":"DAN","hosea":"HOS","joel":"JOL","amos":"AMO","obadiah":"OBA",
"jonah":"JON","micah":"MIC","nahum":"NAM","habakkuk":"HAB","zephaniah":"ZEP","haggai":"HAG",
"zechariah":"ZEC","malachi":"MAL","matthew":"MAT","mark":"MRK","luke":"LUK","john":"JHN",
"acts":"ACT","romans":"ROM","1corinthians":"1CO","2corinthians":"2CO","galatians":"GAL",
"ephesians":"EPH","philippians":"PHP","colossians":"COL","1thessalonians":"1TH",
"2thessalonians":"2TH","1timothy":"1TI","2timothy":"2TI","titus":"TIT","philemon":"PHM",
"hebrews":"HEB","james":"JAS","1peter":"1PE","2peter":"2PE","1john":"1JN","2john":"2JN",
"3john":"3JN","jude":"JUD","revelation":"REV","revelations":"REV","revel":"REV",
"cant":"SNG","song":"SNG","acts":"ACT",
}
ALIASES.update(OTHERS)
# Formas usuales de Cantar de los Cantares en archivos VPL/BibleWorks
# (el código fuente puede indicar "Cant", "Ct", "Song", "SOS", etc.).
for alias in ("cantares","cantarde loscantares","cantardeloscantares","cantico","canticodeloscanticos",
              "canticodesalomon","canticles","songofsolomon","songofsongs","song","songs",
              "solomonssong","sos","ss","ct","cnt","ca","cant","can","son","sol","so"):
    ALIASES[re.sub(r"[\s._-]+", "", alias)] = "SNG"
ALIASES.update({"MT":"MAT","MK":"MRK","LK":"LUK","JN":"JHN","AC":"ACT","GE":"GEN",
"EX":"EXO","LE":"LEV","NU":"NUM","DT":"DEU","JS":"JOS","JG":"JDG","RU":"RUT",
"PS":"PSA","PR":"PRO","EC":"ECC","SO":"SNG","IS":"ISA","JE":"JER","LA":"LAM",
"EZ":"EZK","DA":"DAN","HO":"HOS","JL":"JOL","AM":"AMO","OB":"OBA",
"JON":"JON","MI":"MIC","NA":"NAM","HAB":"HAB","ZEP":"ZEP","HAG":"HAG",
"ZEC":"ZEC","MAL":"MAL","ROM":"ROM","RE":"REV"})
# Abreviaturas reales identificadas por el validador de la edición VPL de eBible.org.
ALIASES.update({
    "EZE": "EZK", "JOH": "JHN", "MAR": "MRK", "JAM": "JAS",
    "1JO": "1JN", "2JO": "2JN", "3JO": "3JN",
    "PHI": "PHP", "JOE": "JOL", "NAH": "NAM"
})
# GEN 1:1 En el principio... / GEN.1.1<TAB>... / GEN 1 1<TAB>...
REFERENCE_PATTERNS = [
re.compile(r"^\s*(.+?)\s+(\d+):(\d+)(?:[.-]\d+)?\s+(.+)$"),
re.compile(r"^\s*(.+?)\.(\d+)\.(\d+)\s+(.+)$"),
re.compile(r"^\s*(.+?)\s+(\d+)\s+(\d+)\t+(.+)$")
]

def match_reference(line: str):
    for pattern in REFERENCE_PATTERNS:
        m = pattern.match(line)
        if not m:
            continue
        token, chapter, verse, text = m.groups()
        clean = re.sub(r"[\s.\-_]+", "", token).casefold()
        code = ALIASES.get(token.strip().upper()) or ALIASES.get(clean)
        if code and 0 < int(chapter) <= 150 and 0 < int(verse) <= 200 and text.strip():
            return code, int(chapter), int(verse), text.strip()
    return None

def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "JA-Proyeccion-Build/1.0"})
    with urllib.request.urlopen(req, timeout=90) as response:
        raw = response.read(20 * 1024 * 1024)
    got = hashlib.sha256(raw).hexdigest()
    if got not in APPROVED_ZIP_SHA256:
        raise ValueError("RV1909 ZIP cambió; validar la fuente antes de actualizar SHA-256. actual=" + got)
    archive = zipfile.ZipFile(io.BytesIO(raw))
    entries = [(entry.filename, archive.read(entry)) for entry in archive.infolist()
               if not entry.is_dir() and entry.file_size < 14_000_000
               and entry.filename.lower().endswith((".txt",".vpl"))]
    if not entries:
        raise ValueError("El ZIP VPL no contiene archivos de texto: " + ", ".join(archive.namelist()[:20]))
    parsed = {}
    unknown = {}
    for name, content in entries:
        if len(content) > 12_000_000: continue
        decoded = content.decode("utf-8-sig", errors="replace")
        for line in decoded.splitlines():
            item = match_reference(line)
            if not item: continue
            book, chapter, verse, text = item
            parsed[(book, chapter, verse)] = text
    if len({key[0] for key in parsed}) < 66:
        # Diagnóstico de etiquetas no reconocidas. Solo se imprimen referencias,
        # no se vuelcan al registro los textos íntegros de versículos.
        unknown = {}
        for filename, content in entries:
            for line in content.decode("utf-8-sig", errors="replace").splitlines():
                for pattern in REFERENCE_PATTERNS:
                    m = pattern.match(line)
                    if not m: continue
                    prefix = m.group(1).strip()
                    clean = re.sub(r"[\s._-]+", "", prefix).casefold()
                    if not (ALIASES.get(prefix.upper()) or ALIASES.get(clean)):
                        unknown[prefix] = unknown.get(prefix, 0) + 1
                    break
        print("Etiquetas VPL sin asignar:", sorted(unknown.items(), key=lambda item: -item[1])[:25], flush=True)
    if not parsed:
        raise ValueError("No se encontraron versículos. ZIP=" + repr([n for n,_ in entries])+
                         " Ejemplo=" + repr(entries[0][1][:400]))
    bible = {"name":"Reina-Valera 1909 (RV1909)", "metadata":{
        "language":"spa", "translation":"RV1909", "source":URL,
        "copyright":"Dominio público · eBible.org", "license":"Public Domain"
    }, "books":[]}
    total = 0
    for number, (code, name) in enumerate(BOOKS, 1):
        chapters = sorted({chapter for book, chapter, verse in parsed if book == code})
        if not chapters or chapters != list(range(1,max(chapters)+1)):
            raise ValueError(f"Capítulos incompletos: {code} {chapters[:10]}")
        output_chapters = []
        for chapter in chapters:
            verses = sorted((v, text) for (book, ch, v), text in parsed.items() if book == code and ch == chapter)
            if not verses: raise ValueError(f"Faltan versículos: {code} {chapter}")
            output_chapters.append({"number":chapter, "verses":[{"number":verse,"text":text} for verse,text in verses]})
            total += len(verses)
        bible["books"].append({"number":number,"name":name,"abbreviation":code,"chapters":output_chapters})
    if len(bible["books"]) != 66 or total < 30_000 or total > 32_000 or sum(len(b["chapters"]) for b in bible["books"]) != 1189:
        raise ValueError(f"Contenido incompleto: {len(bible['books'])} libros, {total} versículos")
    # Compare multiple canonical passages shown on the official eBible RV1909
    # page, independent of whitespace, case and accent differences.
    def normalize_verse(value: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFKD", value.casefold()) if not unicodedata.combining(c))
    anchors = (
        (("GEN", 1, 1), "en el principio crio dios los cielos y la tierra"),
        (("PSA", 23, 1), "jehova es mi pastor"),
        (("JHN", 3, 16), "porque de tal manera amo dios al mundo"),
    )
    for reference, snippet in anchors:
        if snippet not in normalize_verse(parsed.get(reference, "")):
            raise ValueError(f"Muestra RV1909 no coincide: {reference}")
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    data = ["ja-rv1909", bible]
    TARGET.write_text(json.dumps(data, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
    print(f"JA RV1909 empaquetada: {len(bible['books'])} libros, {total} versículos, "+str(TARGET.stat().st_size)+" bytes")
if __name__ == "__main__":
    main()
