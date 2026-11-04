"""Optional verification artifact encoder; needs ffmpeg and Pillow, not runtime dependencies."""
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MOTION = ROOT / "evidence" / "motion"
for scene in ("jellyfish", "koi"):
    output = MOTION / f"{scene}-roaming.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "10", "-i", str(MOTION / scene / "%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf",
        "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-crf", "19", str(output),
    ], check=True)
    sheet = Image.new("RGB", (1000, 780), "#111820")
    draw = ImageDraw.Draw(sheet)
    for index, second in enumerate((0, 5, 10, 15, 20)):
        frame = Image.open(MOTION / scene / f"{second * 10:04d}.png").convert("RGB")
        frame.thumbnail((490, 225))
        x, y = (index % 2) * 500 + 5, (index // 2) * 260 + 25
        sheet.paste(frame, (x, y))
        draw.text((x + 5, y - 18), f"{scene} / {second} simulation seconds", fill="#e0e9ed")
    sheet.save(MOTION / f"{scene}-contact.png")
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=codec_name,width,height,nb_frames,duration", "-of", "json", str(output),
    ], check=True, capture_output=True, text=True)
    metadata = json.loads(probe.stdout)
    (MOTION / f"{scene}-video.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(scene, metadata)
