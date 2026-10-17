"""Rendered depth assets for the deck, built from REAL app screenshots (frames of the recorded app).
- backgrounds: dark gradient with soft glows (pptxgenjs cannot draw gradients)
- tilted: a screenshot in perspective on a floating glass panel with a soft shadow (rendered 3D)
- stack: three screenshots layered in depth
Usage: python make-deck-art.py <shots_dir> <out_dir>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter

shots, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def bg(name, w=2667, h=1500, glow=((1900, -200, 3000, 900, "#0f6a78"), (-400, 900, 900, 1900, "#15406e"))):
    img = Image.new("RGB", (w, h), "#06182b")
    layer = Image.new("RGB", (w, h), "#06182b"); d = ImageDraw.Draw(layer)
    for x0, y0, x1, y1, c in glow: d.ellipse((x0, y0, x1, y1), fill=c)
    layer = layer.filter(ImageFilter.GaussianBlur(220))
    Image.blend(img, layer, 0.9).save(os.path.join(out, name), quality=92)

def find_coeffs(src, dst):
    import numpy as np
    m = []
    for (x, y), (u, v) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(m, dtype=float); B = np.array(src, dtype=float).reshape(8)
    return np.linalg.solve(A, B).tolist()

def rounded(img, r):
    mask = Image.new("L", img.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), r, fill=255)
    img = img.convert("RGBA"); img.putalpha(mask); return img

def tilted(shot, name, crop=None, tilt=0.10, width=1500, shadow=True):
    s = Image.open(os.path.join(shots, shot)).convert("RGB")
    if crop: s = s.crop(crop)
    s = s.resize((width, int(width * s.height / s.width)), Image.LANCZOS)
    # bezel
    pad = 18
    framed = Image.new("RGB", (s.width + 2 * pad, s.height + 2 * pad + 26), "#0d2236")
    d = ImageDraw.Draw(framed)
    for i, c in enumerate(["#e2574c", "#f2b84b", "#4cc9d2"]): d.ellipse((pad + i * 22, 8, pad + i * 22 + 12, 20), fill=c)
    framed.paste(s, (pad, pad + 20))
    framed = rounded(framed, 22)
    w, h = framed.size
    k = int(w * tilt)
    dst = [(0, 0), (w, int(h * tilt * 0.55)), (w, h - int(h * tilt * 0.55)), (0, h)]  # right edge recedes
    canvas_w, canvas_h = w + 140, h + 180
    coeffs = find_coeffs([(0, 0), (w, 0), (w, h), (0, h)], dst)
    warped = framed.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        ImageDraw.Draw(sh).polygon([(70 + x + 30, 110 + y + 40) for x, y in dst], fill=(0, 0, 0, 150))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(38)))
    glass = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    ImageDraw.Draw(glass).polygon([(70 + x - 26, 110 + y - 26) for x, y in [(0, 0), (w + 52, int(h * tilt * 0.55)), (w + 52, h + 52 - int(h * tilt * 0.55)), (0, h + 52)]], fill=(127, 227, 232, 34), outline=(127, 227, 232, 110))
    canvas.alpha_composite(glass)
    canvas.alpha_composite(warped, (70, 110))
    canvas.save(os.path.join(out, name))

def stack(names, name, crops=None, width=1180):
    canvas = Image.new("RGBA", (width + 520, int(width * 0.62) + 420), (0, 0, 0, 0))
    for i, shot in enumerate(names):
        s = Image.open(os.path.join(shots, shot)).convert("RGB")
        if crops and crops[i]: s = s.crop(crops[i])
        s = rounded(s.resize((width, int(width * s.height / s.width)), Image.LANCZOS), 20)
        x, y = 40 + i * 230, 40 + i * 170
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((x + 24, y + 34, x + s.width + 24, y + s.height + 34), 24, fill=(0, 0, 0, 160))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
        border = Image.new("RGBA", (s.width + 8, s.height + 8), (0, 0, 0, 0)); ImageDraw.Draw(border).rounded_rectangle((0, 0, s.width + 7, s.height + 7), 24, outline=(127, 227, 232, 200), width=4)
        canvas.alpha_composite(s, (x, y)); canvas.alpha_composite(border, (x - 4, y - 4))
    canvas.save(os.path.join(out, name))

if __name__ == "__main__":
    bg("bg-dark.jpg")
    bg("bg-dark-2.jpg", glow=((-300, -300, 1000, 800, "#0f6a78"), (1800, 900, 3100, 1900, "#15406e")))
    import json
    spec = json.load(open(os.path.join(shots, "art.json"), encoding="utf-8"))
    for t in spec.get("tilted", []): tilted(t["shot"], t["name"], tuple(t["crop"]) if t.get("crop") else None, t.get("tilt", 0.10), t.get("width", 1500))
    for s in spec.get("stack", []): stack(s["shots"], s["name"], [tuple(c) if c else None for c in s.get("crops", [None] * len(s["shots"]))])
    print("art done")
