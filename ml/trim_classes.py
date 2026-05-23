"""
Trim the dataset to just the classes we care about for waste scoring:

  0 - No Waste
  1 - A Bit of Waste
  2 - Some Waste
  3 - Full Waste
  4 - Big Compartment
  5 - Compartment

The Label Studio export also tagged each box with a specific dish (classes
6-185). We don't need those right now — too many classes, too few photos
per dish. Strip them.

What this script does:
  1. Rewrite classes.txt to only the first 6 classes.
  2. For every label file, keep only lines whose class_id is 0-5.
     (YOLO label lines look like: "<class_id> <cx> <cy> <w> <h>")
  3. If a label file ends up empty, delete it AND its matching image
     (an image with no objects of interest is useless for training).

Run from ml/:
  python trim_classes.py
"""

from pathlib import Path

HERE = Path(__file__).resolve().parent
DATASET = HERE / "dataset"
LABELS = DATASET / "labels"
IMAGES = DATASET / "images"
CLASSES = DATASET / "classes.txt"

KEEP_CLASS_IDS = {0, 1, 2, 3, 4, 5}
KEEP_NAMES = [
    "0 - No Waste",
    "1 - A Bit of Waste",
    "2 - Some Waste",
    "3 - Full Waste",
    "Big Compartment",
    "Compartment",
]


def main() -> None:
    CLASSES.write_text("\n".join(KEEP_NAMES) + "\n", encoding="utf-8")
    print(f"Wrote {CLASSES} with {len(KEEP_NAMES)} classes")

    kept_files = 0
    emptied_files = 0
    kept_lines_total = 0
    dropped_lines_total = 0

    for label_path in LABELS.glob("*.txt"):
        kept_lines: list[str] = []
        for line in label_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            class_id = int(stripped.split()[0])
            if class_id in KEEP_CLASS_IDS:
                kept_lines.append(stripped)
                kept_lines_total += 1
            else:
                dropped_lines_total += 1

        if kept_lines:
            label_path.write_text("\n".join(kept_lines) + "\n", encoding="utf-8")
            kept_files += 1
        else:
            label_path.unlink()
            stem = label_path.stem
            for ext in (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"):
                img = IMAGES / f"{stem}{ext}"
                if img.exists():
                    img.unlink()
                    break
            emptied_files += 1

    print(f"Kept boxes: {kept_lines_total}, dropped (dish) boxes: {dropped_lines_total}")
    print(f"Label files kept: {kept_files}, removed (no waste/compartment boxes): {emptied_files}")


if __name__ == "__main__":
    main()
