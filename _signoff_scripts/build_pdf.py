"""Compile UIUX_SignOff screenshots into one PDF for client sign-off.
Cover + index + one captioned page per screenshot (tall shots split into pages)."""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = sys.argv[1]
OUT = sys.argv[2]
W = 2400                    # page width in px
PAGE_H = int(W * 0.625)     # 16:10 viewport-sized pages
GREEN = (44, 152, 66)

def font(sz, bold=False):
    for f in (['/System/Library/Fonts/Supplemental/Arial Bold.ttf'] if bold else []) + ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()

shots = sorted(glob.glob(os.path.join(ROOT, '**', '*.png'), recursive=True))
def caption(path):
    rel = os.path.relpath(path, ROOT)[:-4]
    parts = rel.split(os.sep)
    return ' › '.join(p.split(' ', 1)[1] if p[:2].isdigit() and ' ' in p else p for p in parts)

pages = []
# cover
c = Image.new('RGB', (W, PAGE_H), 'white'); d = ImageDraw.Draw(c)
d.rectangle([0, 0, W, 18], fill=GREEN)
d.text((160, PAGE_H // 2 - 220), 'ESSA EAPA — Accounts Payable Automation', font=font(84, True), fill=(22, 24, 44))
d.text((160, PAGE_H // 2 - 90), 'UI / UX Design Sign-off — Application Screens', font=font(56), fill=(75, 85, 99))
d.text((160, PAGE_H // 2 + 20), f'{len(shots)} screens · captured 12 Oct 2026 · DEV/UAT environment', font=font(40), fill=(107, 114, 128))
pages.append(c)
# index
mods = []
for s in shots:
    top = os.path.relpath(s, ROOT).split(os.sep)[0]
    if not mods or mods[-1][0] != top: mods.append([top, 0])
    mods[-1][1] += 1
ix = Image.new('RGB', (W, PAGE_H), 'white'); d = ImageDraw.Draw(ix)
d.text((160, 110), 'Contents', font=font(64, True), fill=(22, 24, 44))
y = 230
for name, n in mods:
    d.text((180, y), name, font=font(40), fill=(31, 41, 55)); d.text((W - 520, y), f'{n} screen{"s" if n > 1 else ""}', font=font(40), fill=(107, 114, 128)); y += 62
pages.append(ix)
# screens
CAP = 120
for i, s in enumerate(shots, 1):
    im = Image.open(s).convert('RGB')
    im = im.resize((W - 160, int(im.size[1] * (W - 160) / im.size[0])), Image.LANCZOS)
    body = PAGE_H * 2 - CAP - 80          # allow tall pages up to 2 viewport heights before splitting
    chunks = [im.crop((0, y0, im.size[0], min(im.size[1], y0 + body))) for y0 in range(0, im.size[1], body)]
    for k, ch in enumerate(chunks):
        pg = Image.new('RGB', (W, ch.size[1] + CAP + 80), (243, 244, 246)); d = ImageDraw.Draw(pg)
        d.rectangle([0, 0, W, CAP], fill='white'); d.rectangle([0, CAP - 4, W, CAP], fill=GREEN)
        t = f'{i:03d}  {caption(s)}' + (f'  (part {k + 1}/{len(chunks)})' if len(chunks) > 1 else '')
        d.text((80, 38), t, font=font(40, True), fill=(22, 24, 44))
        pg.paste(ch, (80, CAP + 40))
        pages.append(pg)
pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=200, quality=85)
print(len(shots), 'screens ->', len(pages), 'pages ->', OUT, round(os.path.getsize(OUT) / 1e6, 1), 'MB')
