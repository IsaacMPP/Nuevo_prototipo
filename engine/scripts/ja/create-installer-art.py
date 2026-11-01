from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[2]
logo = Image.open(root / "public/ja-logo.png").convert("RGBA")
hero = Image.open(root / "public/ja-hero.jpg").convert("RGB")
assets = root / "build/public"
assets.mkdir(parents=True, exist_ok=True)

# Installer/application icon using original JA emblem on the approved navy palette.
icon = Image.new("RGBA", (256, 256), "#0b2a49")
mark = logo.copy()
mark.thumbnail((222, 222), Image.Resampling.LANCZOS)
icon.alpha_composite(mark, ((256-mark.width)//2, (256-mark.height)//2))
icon.save(assets/"ja-icon.png")
icon.save(assets/"ja-icon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

# Native NSIS wizard imagery. Separate from the application splash/landing page.
panel = ImageOps.fit(hero, (164, 314), method=Image.Resampling.LANCZOS).convert("RGB")
wash = Image.new("RGB", panel.size, "#071b32")
panel = Image.blend(panel, wash, 0.67)
draw = ImageDraw.Draw(panel)
mark = logo.copy()
mark.thumbnail((132,132),Image.Resampling.LANCZOS)
panel.paste(mark, ((164-mark.width)//2,25), mark)
draw.line((16,245,148,245), fill="#77bee9",width=2)
draw.text((20,260), "JA Proyecciones", fill="#ffffff")
draw.text((20,278), "Version 2", fill="#d9ebf8")
panel.save(assets/"ja-installer-sidebar.bmp")

header = Image.new("RGB",(150,57),"#0b2a49")
d = ImageDraw.Draw(header)
mark = logo.copy()
mark.thumbnail((49,49),Image.Resampling.LANCZOS)
header.paste(mark,(3+(49-mark.width)//2,(57-mark.height)//2),mark)
d.text((55,13),"JA Proyecciones",fill="#ffffff")
d.text((55,30),"Instalacion",fill="#8bc9f1")
header.save(assets/"ja-installer-header.bmp")
print("Prepared JA Windows branding assets")
