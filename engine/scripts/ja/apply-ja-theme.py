from pathlib import Path

# A deliberately small, idempotent presentation-only change.
# FreeShow's output, audio, event handlers and native settings are untouched.
p = Path("src/frontend/components/main/Top.svelte")
text = p.read_text(encoding="utf-8")
original = '<h1 style="align-self: center;width: 100%;padding: 0px 10px;text-align: center;font-size: 1.8em;">FreeShow</h1>'
replacement = '<div class="ja-brand" aria-label="JA Proyección"><img src="./ja-logo.png" alt="Emblema JA" draggable={false} /><div class="ja-name">JA <strong>Proyección</strong></div></div>'
if original in text:
    text = text.replace(original, replacement, 1)
elif replacement not in text:
    raise RuntimeError("FreeShow Top.svelte changed; refusing risky patch")
css = """
    /* JA branding: visual only, original navigation/output controls retained. */
    .ja-brand { display:flex; align-items:center; gap:9px; width:100%; height:58px; padding:2px 12px; white-space:nowrap; }
    .ja-brand img {height:51px; width:70px; object-fit:cover;}
    .ja-name {color:var(--text);font-size:1.5em;font-weight:750;letter-spacing:-.035em;}
    .ja-name strong {color:var(--secondary);font-weight:780;}
    .top { background:linear-gradient(100deg,#0b2a49 0%,#071b32 70%,#081a30 100%); border-bottom:1px solid #1a496c; }
    @media(max-width:940px){.ja-name{font-size:1.08em}.ja-brand img{height:42px;width:57px}}
"""
if "JA branding: visual only" not in text:
    if "<style>" not in text: raise RuntimeError("Missing style block")
    text = text.replace("<style>", "<style>\n"+css, 1)
p.write_text(text, encoding="utf-8")
