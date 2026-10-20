#!/usr/bin/env python3
"""Create lightweight web images from the approved Academia JPEG collection.

This is a one-off maintenance utility; the wiki itself remains a static site.
Source JPEGs are never edited or removed by this script.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

SOURCE = Path("images/locations/academia")
THUMBS = SOURCE / "thumbs"
REPORT = SOURCE / "webp-report.json"


def convert(source: Path) -> dict[str, object]:
    target = source.with_suffix(".webp")
    thumb = THUMBS / target.name
    source_bytes = source.stat().st_size

    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        dimensions = [image.width, image.height]
        large = image.copy()
        large.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        large.save(target, format="WEBP", quality=88, method=6,
                   icc_profile=original.info.get("icc_profile", b""))

        small = image.copy()
        small.thumbnail((320, 320), Image.Resampling.LANCZOS)
        small.save(thumb, format="WEBP", quality=78, method=6,
                   icc_profile=original.info.get("icc_profile", b""))

    with Image.open(target) as check:
        check.verify()
    with Image.open(thumb) as check:
        check.verify()

    return {
        "file": source.name,
        "source_bytes": source_bytes,
        "webp_bytes": target.stat().st_size,
        "thumb_bytes": thumb.stat().st_size,
        "source_dimensions": dimensions,
        "webp_dimensions": [large.width, large.height],
        "thumb_dimensions": [small.width, small.height],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=8)
    args = parser.parse_args()
    sources = sorted(SOURCE.glob("*.jpg"))
    if len(sources) != 81:
        raise SystemExit(f"Expected 81 source JPEG files, found {len(sources)}")
    THUMBS.mkdir(exist_ok=True)
    entries = []
    if REPORT.exists():
        entries = json.loads(REPORT.read_text(encoding="utf-8"))["images"]
    done = {entry["file"] for entry in entries}
    added = []
    for source in sources:
        if source.name in done:
            continue
        if len(added) >= args.limit:
            break
        added.append(convert(source))
    merged = sorted(entries + added, key=lambda x: x["file"])
    REPORT.write_text(json.dumps({
        "original_count": len(sources),
        "converted_count": len(merged),
        "original_total_bytes": sum(p.stat().st_size for p in sources),
        "converted_total_bytes": sum(entry["webp_bytes"] for entry in merged),
        "thumbnails_total_bytes": sum(entry["thumb_bytes"] for entry in merged),
        "images": merged
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for entry in added:
        saved = 100 * (1 - entry["webp_bytes"] / entry["source_bytes"])
        print(f'{entry["file"]}: {entry["source_bytes"]} -> '
              f'{entry["webp_bytes"]} bytes ({saved:.1f}% saved); '
              f'thumb {entry["thumb_bytes"]} bytes')
    print(f"Converted {len(added)} more images; total {len(merged)}/{len(sources)}")


if __name__ == "__main__":
    main()
