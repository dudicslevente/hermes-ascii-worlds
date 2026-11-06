"""Compose a labelled contact sheet and 2:1 banner from real captured frames.

Optional documentation tooling: Python 3 + Pillow. Run capture-gallery.mjs first.
No artwork is synthesized: originals are only scaled/letterboxed for overview.
"""
import hashlib
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('ASCII_WORLDS_GALLERY', ROOT / 'docs/images/v1.2'))
CAPTURES = json.loads((OUT / 'captures.json').read_text())
previews = [c for c in CAPTURES['captures'] if c['kind'] == 'preview']
ids = list(dict.fromkeys(c['scene'] for c in previews))
assert len(ids) == 20 and len(previews) == 40
DARK = {'koi', 'jellyfish', 'manta-rays', 'solitary-whale', 'octopus',
        'luna-moths', 'sleeping-cat', 'owl', 'fireflies', 'night-sky'}

def font(size):
    try:
        return ImageFont.truetype(os.environ.get('ASCII_WORLDS_FONT', 'DejaVuSans.ttf'), size)
    except OSError:
        return ImageFont.load_default(size=size)

sheet = Image.new('RGB', (1640, 1480), '#141c20')
draw = ImageDraw.Draw(sheet)
draw.text((24, 18), 'ASCII Worlds 1.2.0 / all 20 habitats', font=font(30), fill='#e1e6e9')
draw.text((24, 64), 'Real plugin previews', font=font(18), fill='#b6c3c7')
for i, scene in enumerate(ids):
    tone = 'dark' if scene in DARK else 'light'
    entry = next(c for c in previews if c['scene'] == scene and c['tone'] == tone)
    original = Image.open(OUT / entry['file']).convert('RGB')
    tile = ImageOps.contain(original, (390, 222), Image.Resampling.LANCZOS)
    x, y = 20 + (i % 4) * 405, 108 + (i // 4) * 268
    cell = tile.getpixel((2, 2))
    draw.rounded_rectangle((x, y, x + 389, y + 221), radius=8, fill=cell)
    sheet.paste(tile, (x, y + (222 - tile.height) // 2))
    draw.text((x, y + 226), entry['title'], font=font(18), fill='#e1e6e9')
sheet.save(OUT / 'overview.png', optimize=True)

original = Image.open(OUT / 'solitary-whale-dark.png').convert('RGB')
original = original.crop((3, 3, original.width - 3, original.height - 3))
width = min(original.width, original.height * 2)
height = width // 2
left = max(0, min(original.width - width, 0))
top = (original.height - height) // 2
banner = original.crop((left, top, left + width, top + height)).resize((1200, 600), Image.Resampling.LANCZOS)
banner.save(OUT / 'banner.png', optimize=True)

records = []
by_name = {c['file']: c for c in CAPTURES['captures']}
for p in sorted(OUT.glob('*.png')):
    with Image.open(p) as image:
        assert image.format == 'PNG'
        dimensions = list(image.size)
    original = by_name.get(p.name)
    caption = (f"{original.get('title', original['scene'])}: {original['tone']} {original['kind']}"
               if original else 'Overview of real plugin previews' if p.name == 'overview.png'
               else '2:1 crop of the Solitary whale preview')
    records.append({'file': p.name, 'caption': caption,
                    'evidence': 'Actual generated plugin captured in a browser test page.',
                    'dimensions': dimensions, 'bytes': p.stat().st_size,
                    'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                    'source': 'actual browser screenshot' if original else 'scaled real captures; no synthesized artwork'})
report = {'version': '1.2.0', 'pluginSha256': CAPTURES['pluginSha256'],
          'catalogSha256': CAPTURES['catalogSha256'], 'images': records,
          'overviewThemes': {'dark': len(DARK), 'light': len(ids) - len(DARK)}}
(OUT / 'gallery.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'images': len(records), 'bytes': sum(r['bytes'] for r in records),
                  'banner': [1200, 600], 'overviewThemes': report['overviewThemes']}, indent=2))
