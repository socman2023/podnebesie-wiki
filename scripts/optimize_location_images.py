#!/usr/bin/env python3
"""Convert staged JPEG location album sources to optimized WebP and thumbnails."""
from pathlib import Path
from PIL import Image, ImageOps
import shutil
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("images/locations")
processed = []
for album in sorted(root.iterdir()):
    if not album.is_dir() or not (album / "source").is_dir():
        continue
    source = album / "source"
    originals = sorted(source.glob("*.jpg"))
    if not originals:
        raise RuntimeError(f"No staged JPEGs in {source}")
    (album / "thumbs").mkdir(exist_ok=True)
    for photo in originals:
        with Image.open(photo) as opened:
            img = ImageOps.exif_transpose(opened).convert("RGB")
            if img.width < 400 or img.height < 300:
                raise ValueError(f"Unexpected dimensions: {photo} {img.size}")
            target = album / (photo.stem + ".webp")
            thumb = album / "thumbs" / (photo.stem + ".webp")
            img.save(target, "WEBP", quality=83, method=6)
            small = img.copy()
            small.thumbnail((384, 256), Image.Resampling.LANCZOS)
            small.save(thumb, "WEBP", quality=75, method=6)
            with Image.open(target) as check:
                check.verify()
            with Image.open(thumb) as check:
                check.verify()
        processed.append(str(photo))
    shutil.rmtree(source)
print(f"Converted and verified {len(processed)} staged photos into WebP with thumbnails")
if not processed:
    raise RuntimeError("No staged images found; refusing empty optimization")
