"""
Split ml/dataset/{images,labels}/ into train/val (80/20) with the layout
Ultralytics YOLO expects:

  ml/dataset/
    images/train/  images/val/
    labels/train/  labels/val/

Run from ml/:
  python split_dataset.py
"""

from __future__ import annotations

import random
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATASET = HERE / "dataset"
IMAGES = DATASET / "images"
LABELS = DATASET / "labels"

VAL_FRACTION = 0.2
SEED = 42


def main() -> None:
    image_files = [p for p in IMAGES.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    if not image_files:
        raise SystemExit("No image files found in ml/dataset/images/")

    pairs = []
    for img in image_files:
        label = LABELS / f"{img.stem}.txt"
        if not label.exists():
            print(f"skip {img.name} (no label)")
            continue
        pairs.append((img, label))

    rng = random.Random(SEED)
    rng.shuffle(pairs)
    n_val = max(1, int(len(pairs) * VAL_FRACTION))
    val_pairs = pairs[:n_val]
    train_pairs = pairs[n_val:]

    for sub in ("train", "val"):
        (IMAGES / sub).mkdir(parents=True, exist_ok=True)
        (LABELS / sub).mkdir(parents=True, exist_ok=True)

    def move(pair_list, sub):
        for img, lbl in pair_list:
            shutil.move(str(img), IMAGES / sub / img.name)
            shutil.move(str(lbl), LABELS / sub / lbl.name)

    move(train_pairs, "train")
    move(val_pairs, "val")

    print(f"train: {len(train_pairs)} images")
    print(f"val:   {len(val_pairs)} images")


if __name__ == "__main__":
    main()
