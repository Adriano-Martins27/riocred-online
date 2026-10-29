"""Gera logo RioCred: wordmark com ondas de rio + icones do app."""
from PIL import Image, ImageDraw, ImageFont
import math, os

TEAL = (13, 122, 95)        # verde-azulado principal
TEAL_DARK = (9, 84, 66)
BLUE = (23, 94, 154)        # azul rio
GOLD = (232, 164, 46)

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")


def wave(draw, y, x0, x1, amp, wavelength, width, color):
    """Desenha uma onda senoidal como sequencia de pequenos segmentos."""
    pts = []
    for x in range(x0, x1 + 1, 4):
        yy = y + amp * math.sin((x - x0) / wavelength * 2 * math.pi)
        pts.append((x, yy))
    draw.line(pts, fill=color, width=width, joint="curve")


def make_logo(path, W=1027, H=600):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # --- icone: circulo moeda + ondas ---
    cx, cy, r = W // 2, 170, 120
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TEAL)
    d.ellipse([cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14], fill=TEAL_DARK)
    # ondas dentro do circulo (rio)
    wave(d, cy - 10, cx - 85, cx + 85, 14, 90, 18, (255, 255, 255))
    wave(d, cy + 28, cx - 85, cx + 85, 14, 90, 18, BLUE)
    # moeda dourada pequena
    d.ellipse([cx + 55, cy - 105, cx + 115, cy - 45], fill=GOLD)
    f_coin = ImageFont.truetype(FONT_BOLD, 34)
    d.text((cx + 85, cy - 75), "R$", font=f_coin, fill=(120, 75, 10), anchor="mm")

    # --- wordmark ---
    f = ImageFont.truetype(FONT_BOLD, 190)
    t1, t2 = "Rio", "Cred"
    w1 = d.textlength(t1, font=f)
    w2 = d.textlength(t2, font=f)
    x0 = (W - w1 - w2) / 2
    y = 380
    d.text((x0, y), t1, font=f, fill=TEAL_DARK)
    d.text((x0 + w1, y), t2, font=f, fill=TEAL)
    img.save(path)
    print("logo ->", path, img.size)


def make_icon(path, size=1024, bg=True):
    img = Image.new("RGBA", (size, size), TEAL_DARK if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy, r = size // 2, size // 2 - 40, int(size * 0.34)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TEAL)
    d.ellipse([cx - r + 20, cy - r + 20, cx + r - 20, cy + r - 20], fill=BLUE)
    # ondas
    wave(d, cy - 15, cx - int(r * .68), cx + int(r * .68), 26, 170, 34, (255, 255, 255))
    wave(d, cy + 55, cx - int(r * .68), cx + int(r * .68), 26, 170, 34, GOLD)
    # "R"
    f = ImageFont.truetype(FONT_BOLD, int(size * 0.16))
    d.text((cx, size - int(size * 0.13)), "RioCred", font=f, fill=(255, 255, 255), anchor="mm")
    img.save(path)
    print("icon ->", path)


def make_splash(path, size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy, r = size // 2, size // 2, int(size * 0.40)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TEAL)
    d.ellipse([cx - r + 18, cy - r + 18, cx + r - 18, cy + r - 18], fill=BLUE)
    wave(d, cy - 15, cx - int(r * .68), cx + int(r * .68), 24, 160, 32, (255, 255, 255))
    wave(d, cy + 50, cx - int(r * .68), cx + int(r * .68), 24, 160, 32, GOLD)
    img.save(path)
    print("splash ->", path)


def make_notif(path, size=96):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    wave(d, size // 2 - 10, 8, size - 8, 8, 40, 8, (255, 255, 255))
    wave(d, size // 2 + 16, 8, size - 8, 8, 40, 8, (255, 255, 255))
    img.save(path)
    print("notif ->", path)


if __name__ == "__main__":
    make_logo(os.path.join(OUT, "logo.png"))
    make_icon(os.path.join(OUT, "images", "icon.png"))
    make_icon(os.path.join(OUT, "images", "adaptive-icon.png"))
    make_splash(os.path.join(OUT, "images", "splash-icon.png"))
    make_notif(os.path.join(OUT, "images", "notification-icon.png"))
