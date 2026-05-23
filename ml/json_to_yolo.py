"""
Convert Label Studio JSON-MIN export -> YOLO labels (with waste levels).

Why:
  YOLO export from Label Studio only kept compartment class, dropped per-region
  Choice (waste rating). JSON-MIN keeps both as parallel arrays:
    label[i].rectanglelabels  -> "Big Compartment" or "Compartment"
    waste_rating[i]           -> "0 - No Waste" / "1 - A Bit of Waste" / ...

  We combine them into 8 YOLO classes:
    0..3 = Compartment + waste 0..3
    4..7 = Big Compartment + waste 0..3

How:
  1. Read JSON-MIN file.
  2. Group tasks by image filename, keep latest annotation per image.
  3. For each task, write labels/<basename>.txt with one line per box:
       <class_id> <cx> <cy> <w> <h>     (all normalized 0..1)
  4. Rewrite classes.txt with the 8 combined names.

Run from ml/:
  python json_to_yolo.py "C:\\path\\to\\project-4-at-...json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATASET = HERE / "dataset"
LABELS = DATASET / "labels"
IMAGES = DATASET / "images"
CLASSES_FILE = DATASET / "classes.txt"

WASTE_MAP = {
    "0 - No Waste": 0,
    "1 - A Bit of Waste": 1,
    "2 - Some Waste": 2,
    "3 - Full Waste": 3,
}

CLASS_NAMES = [
    "Compartment - No Waste",
    "Compartment - Bit of Waste",
    "Compartment - Some Waste",
    "Compartment - Full Waste",
    "Big Compartment - No Waste",
    "Big Compartment - Bit of Waste",
    "Big Compartment - Some Waste",
    "Big Compartment - Full Waste",
]


def class_id(compartment: str, waste: str) -> int | None:
    w = WASTE_MAP.get(waste)
    if w is None:
        return None
    if compartment == "Compartment":
        return w
    if compartment == "Big Compartment":
        return 4 + w
    return None


def main(json_path: Path) -> int:
    if not json_path.exists():
        print(f"ERROR: {json_path} not found", file=sys.stderr)
        return 1

    LABELS.mkdir(parents=True, exist_ok=True)

    data = json.loads(json_path.read_text(encoding="utf-8"))
    print(f"Loaded {len(data)} tasks from {json_path.name}")

    # Group by image basename, keep newest annotation per image.
    by_basename: dict[str, dict] = {}
    for task in data:
        image = task.get("image", "")
        if not image:
            continue
        filename = image.rsplit("/", 1)[-1]
        stem = filename.rsplit(".", 1)[0]
        existing = by_basename.get(stem)
        if existing is None or task.get("updated_at", "") >= existing.get("updated_at", ""):
            by_basename[stem] = task

    print(f"Unique images: {len(by_basename)}")

    # Wipe any stale label files from previous run.
    for old in LABELS.glob("*.txt"):
        old.unlink()

    written = 0
    skipped_boxes = 0
    skipped_files = 0
    for stem, task in by_basename.items():
        labels = task.get("label", []) or []
        ratings = task.get("waste_rating", []) or []
        if len(labels) != len(ratings):
            print(f"WARN: {stem} has {len(labels)} boxes vs {len(ratings)} ratings — skipping")
            skipped_files += 1
            continue

        lines: list[str] = []
        for box, rating in zip(labels, ratings):
            rect_labels = box.get("rectanglelabels") or []
            if not rect_labels:
                skipped_boxes += 1
                continue
            cid = class_id(rect_labels[0], rating)
            if cid is None:
                skipped_boxes += 1
                continue

            # Label Studio: x/y/width/height in PERCENT, x/y is top-left corner.
            x = float(box["x"]) / 100.0
            y = float(box["y"]) / 100.0
            w = float(box["width"]) / 100.0
            h = float(box["height"]) / 100.0
            cx = x + w / 2.0
            cy = y + h / 2.0
            lines.append(f"{cid} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")

        if lines:
            (LABELS / f"{stem}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
            written += 1
        else:
            skipped_files += 1

    CLASSES_FILE.write_text("\n".join(CLASS_NAMES) + "\n", encoding="utf-8")

    # Sanity: count which images on disk now lack a paired label.
    image_stems = {p.stem for ext in (".jpg", ".jpeg", ".png") for p in IMAGES.glob(f"*{ext}")}
    label_stems = {p.stem for p in LABELS.glob("*.txt")}
    orphan_images = image_stems - label_stems
    orphan_labels = label_stems - image_stems

    print()
    print(f"Wrote {written} label files, {skipped_files} files skipped, {skipped_boxes} boxes skipped")
    print(f"classes.txt rewritten with {len(CLASS_NAMES)} classes")
    print(f"Images on disk: {len(image_stems)}, labels on disk: {len(label_stems)}")
    if orphan_images:
        print(f"Images with no label ({len(orphan_images)}):")
        for s in sorted(orphan_images)[:10]:
            print(f"  - {s}")
        if len(orphan_images) > 10:
            print(f"  ... and {len(orphan_images) - 10} more")
    if orphan_labels:
        print(f"Labels with no image ({len(orphan_labels)}):")
        for s in sorted(orphan_labels)[:10]:
            print(f"  - {s}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python json_to_yolo.py <path-to-json-min.json>", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1])))
