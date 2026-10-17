"""Title cards for the videos (1920x1080 PNG). These are clearly designed cards, not app screenshots.
Usage: python make-cards.py cards.json outdir
cards.json: [{"id": "a01", "title": "...", "subtitle": "...", "note": "..."}]
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080
F = "C:/Windows/Fonts/"
def font(name, size):
    return ImageFont.truetype(os.path.join(F, name), size)

def card(c, out):
    img = Image.new("RGB", (W, H), "#071a2e")
    d = ImageDraw.Draw(img)
    # soft depth: layered glows and glass panels
    glow = Image.new("RGB", (W, H), "#071a2e")
    g = ImageDraw.Draw(glow)
    g.ellipse((1150, -250, 2250, 850), fill="#0e5e6f")
    g.ellipse((-300, 600, 700, 1500), fill="#123a63")
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.blend(img, glow, 0.85)
    d = ImageDraw.Draw(img, "RGBA")
    for i, (x, y, w, h, a) in enumerate([(1180, 300, 560, 360, 34), (1240, 360, 560, 360, 46), (1300, 420, 560, 360, 60)]):
        d.rounded_rectangle((x, y, x + w, y + h), 36, fill=(180, 235, 240, a), outline=(160, 230, 235, 90), width=2)
    d.ellipse((1460, 520, 1640, 700), fill=(76, 201, 210, 200))
    d.text((1505, 548), "+", font=font("segoeuib.ttf", 120), fill=(7, 26, 46, 255))
    d.text((150, 360), c["title"], font=font("segoeuib.ttf", 132), fill="#f6f1e7")
    y = 540
    sub = c.get("subtitle", "")
    words, line, lines = sub.split(), "", []
    f2 = font("segoeuil.ttf", 54)
    for w in words:
        t = (line + " " + w).strip()
        if d.textlength(t, font=f2) > 980: lines.append(line); line = w
        else: line = t
    if line: lines.append(line)
    for l in lines:
        d.text((154, y), l, font=f2, fill="#7fe3e8"); y += 70
    d.rectangle((154, y + 30, 154 + 120, y + 36), fill="#e2574c")
    d.text((154, y + 64), c.get("note", ""), font=font("segoeui.ttf", 34), fill="#c9d6df")
    d.text((154, 980), "Synthetic data only · AI explanations are checked against the document · Not medical advice", font=font("segoeui.ttf", 26), fill="#8aa0b0")
    img.save(out)

if __name__ == "__main__":
    cards = json.load(open(sys.argv[1], encoding="utf-8"))
    os.makedirs(sys.argv[2], exist_ok=True)
    for c in cards:
        card(c, os.path.join(sys.argv[2], c["id"] + ".png"))
    print("cards:", len(cards))
