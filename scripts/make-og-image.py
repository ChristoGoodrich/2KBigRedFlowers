"""Generate the 1200x630 social share (Open Graph) card for 2KBigRedFlowers.

Re-run if branding changes:
    python scripts/make-og-image.py
Mirrors the header flower logo (8 dark + 8 bright petals, concentric center)
on a dark card with the wordmark and tagline.
"""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (10, 10, 10)
DARK_RED = (139, 0, 21)
RED = (212, 0, 26)
YELLOW = (255, 208, 0)
ORANGE_MID = (240, 168, 0)
ORANGE_DK = (192, 120, 0)
TEXT = (255, 255, 255)
DIM = (170, 170, 175)
ACCENT = (226, 26, 47)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Subtle vertical accent band on the left edge
d.rectangle([0, 0, 12, H], fill=ACCENT)

# --- Flower logo (supersampled for smooth edges) ---
SS = 4
logo_size = 300
cx = cy = logo_size // 2 * SS
flo = Image.new("RGBA", (logo_size * SS, logo_size * SS), (0, 0, 0, 0))
fd = ImageDraw.Draw(flo)
rx, ry = 40 * SS, 80 * SS          # petal half-extents (scaled from 5x10 @ ~8x)
offset = 72 * SS                    # petal distance from center

def petal(angle_deg, color):
    a = math.radians(angle_deg)
    # petal center pushed "up" then rotated around logo center
    px = cx + offset * math.sin(a)
    py = cy - offset * math.cos(a)
    petal_img = Image.new("RGBA", flo.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(petal_img)
    pd.ellipse([px - rx, py - ry, px + rx, py + ry], fill=color)
    rotated = petal_img.rotate(-angle_deg, center=(px, py), resample=Image.BICUBIC)
    flo.alpha_composite(rotated)

for k in range(8):
    petal(22.5 + k * 45, DARK_RED)
for k in range(8):
    petal(k * 45, RED)

for r, col in ((52, YELLOW), (32, ORANGE_MID), (16, ORANGE_DK)):
    fd.ellipse([cx - r * SS, cy - r * SS, cx + r * SS, cy + r * SS], fill=col)

flo = flo.resize((logo_size, logo_size), Image.LANCZOS)
logo_x, logo_y = 80, (H - logo_size) // 2
img.paste(flo, (logo_x, logo_y), flo)

# --- Text block (auto-fit so nothing clips the right edge) ---
tx = logo_x + logo_size + 55
max_x = W - 60

# Largest title size that fits the available width.
title_size = 88
while title_size > 40:
    title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", title_size)
    if tx + d.textlength("2KBigRedFlowers", font=title_font) <= max_x:
        break
    title_size -= 2

sub_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 38)
tag_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
cjk_font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 32)

d.text((tx, 205), "2KBigRedFlowers", font=title_font, fill=TEXT)
d.text((tx, 320), "NBA 2K26", font=sub_font, fill=ACCENT)
tag_x = tx + d.textlength("NBA 2K26", font=sub_font) + 26
d.text((tag_x, 326), "BUILD & PERFORMANCE TRACKER", font=tag_font, fill=DIM)
d.text((tx, 392), "建模管理 · 比赛记录 · 数据分析", font=cjk_font, fill=DIM)

img.save("og-image.png", "PNG", optimize=True)
print("wrote og-image.png", img.size)
