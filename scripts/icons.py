# Generates the home-screen icons. Run: python3 scripts/icons.py
from PIL import Image, ImageDraw, ImageFont
import os
OUT = os.path.join(os.path.dirname(__file__), "..", "public")
def font(sz):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    im = Image.new("RGB", (size, size), "#0F1413"); d = ImageDraw.Draw(im)
    s = size / 512
    d.rounded_rectangle([96*s, 96*s, 416*s, 416*s], radius=60*s, fill="#C8322B")
    f = font(int(210*s)); t = "25"
    b = d.textbbox((0, 0), t, font=f)
    d.text(((size-(b[2]-b[0]))/2-b[0], (size-(b[3]-b[1]))/2-b[1]), t, font=f, fill="#FFFFFF")
    im.save(os.path.join(OUT, name))
