#!/usr/bin/env python3
"""
Derives the web-ready images the site actually ships (public/images) from the original artwork
in assets/media-originals/images, which is kept out of public/ so it is never deployed.

Every entry is (source, output, max width, quality). Outputs are WebP sized to about twice the
largest size the image is ever shown at (so it stays sharp on 2x screens and no bigger), with
alpha kept for frames and cut-outs. Originals stay untouched; the code references the outputs.

    python3 scripts/media/optimize-images.py            # writes only missing or stale outputs
    python3 scripts/media/optimize-images.py --force    # rewrites every output

Shown sizes (css px) were measured in the browser; see the comment on each group.
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(__file__)
# Originals live outside public/ so they are never deployed; only the derived files ship.
SOURCES = os.path.join(HERE, "..", "..", "assets", "media-originals", "images")
ROOT = os.path.join(HERE, "..", "..", "public", "images")

JOBS = [
    # The avatar is shown at up to ~120 css px (header 76, guide 66, cards) → one 240 px file. Social cards: 630 px JPEG.
    ("andrei-tekhtelev-avatar.png", "andrei-tekhtelev-avatar-240.webp", 240, 82),
    ("andrei-tekhtelev-avatar.png", "andrei-tekhtelev-avatar-og.jpg", 630, 86),
    # App marks: 30 px in the hero, 72 px in the projects workspace → 160.
    ("apps/symply-house.png", "apps/symply-house.webp", 160, 85),
    ("apps/symply-health.png", "apps/symply-health.webp", 160, 85),
    ("apps/symply-budget.png", "apps/symply-budget.webp", 160, 85),
    ("apps/house-of-commons-main.png", "apps/house-of-commons-main.webp", 160, 85),
    # Device frames around the live preview: the iPhone frame is 538 css px wide → about 1100.
    ("device-frames/iphone-16-pro-black-titanium.png", "device-frames/iphone-16-pro-black-titanium.webp", 1100, 86),
    ("device-frames/ipad-pro-11-space-gray.png", "device-frames/ipad-pro-11-space-gray.webp", 1400, 86),
    ("device-frames/pixel-7-pro-obsidian.png", "device-frames/pixel-7-pro-obsidian.webp", 600, 86),
    # Story illustrations: shown at most ~260–360 css px → 720 on the long side.
    *[(f"{name}.png", f"{name}.webp", 720, 80) for name in (
        "wizard-programmer-ai-logos-avatar", "wizard-programmer-ai-logos-avatar-calm", "wizard-programmer-meditating-coding",
        "wizard-programmer-sad", "wizard-programmer-bewildered-clean", "wizard-magic-effect", "manager-assignment-avatar",
        "goat-advanced-storm-generator", "goat-thumbs-up-avatar", "goat-under-shower-storm-generator", "goat-wet-white-sad",
        "goat-near-storm-generator", "goat-storm-on-side-white", "pink-goat-blue-stripe", "random-task-slot-machine", "bug-in-jar",
    )],
    # Wide scenes: up to ~800 css px wide → 1600.
    *[(f"{name}.png", f"{name}.webp", 1600, 78) for name in (
        "puzzle-sky-storm", "puzzle-sky-cloudy", "puzzle-sky-clear", "programmer-under-umbrella-storm-banner-ai-logos",
    )],
]


def card_jobs():
    """Flow and scenario cards: 256 px artwork, shown at ≤128 css px — same size, WebP."""
    for folder in ("flow-cards", "flow-cards/tasks", "scenario-cards"):
        base = os.path.join(SOURCES, folder)
        for name in sorted(os.listdir(base)):
            if name.endswith(".png"):
                yield (f"{folder}/{name}", f"{folder}/{name[:-4]}.webp", 256, 82)


def convert(source, output, max_width, quality, force):
    src, out = os.path.join(SOURCES, source), os.path.join(ROOT, output)
    if not force and os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
        return None
    image = Image.open(src)
    if image.width > max_width:
        image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
    if output.endswith(".jpg"):
        image.convert("RGB").save(out, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
        image.convert("RGBA" if has_alpha else "RGB").save(out, "WEBP", quality=quality, method=6)
    return os.path.getsize(src), os.path.getsize(out)


def main():
    force = "--force" in sys.argv
    before = after = 0
    for job in [*JOBS, *card_jobs()]:
        result = convert(*job, force)
        if result:
            before += result[0]; after += result[1]
            print(f"{result[0] / 1024:8.0f} KB → {result[1] / 1024:6.0f} KB  {job[1]}")
    if before:
        print(f"\n{before / 1e6:.1f} MB → {after / 1e6:.2f} MB")
    else:
        print("Everything is up to date.")


if __name__ == "__main__":
    main()
