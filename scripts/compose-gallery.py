"""Compose the all-dark overview and new-in-1.4 strip from real habitat frames.

Run after scripts/capture-gallery.mjs. Pillow is an optional development tool;
no image tooling or images are loaded by the installed plugin.
"""
import json
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IDS = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {WORLD_IDS} from './src/settings-v3.js'; console.log(JSON.stringify(WORLD_IDS));"
], cwd=ROOT, text=True))


def compose(ids, columns, dest):
    width, height, gap = 400, 234, 5
    rows = (len(ids) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * width + (columns - 1) * gap,
                              rows * height + (rows - 1) * gap), '#0f1214')
    for i, scene in enumerate(ids):
        with Image.open(ROOT / 'docs/images/habitats' / f'{scene}-dark.png') as image:
            frame = image.convert('RGB').resize((width, height), Image.Resampling.LANCZOS)
            sheet.paste(frame, ((i % columns) * (width + gap), (i // columns) * (height + gap)))
    sheet.save(ROOT / 'docs/images' / dest, optimize=True)


compose(IDS, 4, 'overview.png')
compose(['pipes', 'capybara-onsen', 'nyan-cat', 'dragon-hoard', 'wizard-tower', 'pirate-ship'],
        3, 'new-in-1.4.png')
print(f'Composed overview of {len(IDS)} habitats and new-in-1.4.png')
