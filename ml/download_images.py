"""
Download training images from Cloudflare R2 to match the Label Studio export.

Why this exists:
  Label Studio's "YOLO with Images" export ships an empty images/ folder when
  the data source is cloud storage (R2). Labels live in labels/, but images
  stay in R2. YOLO training needs them side by side, so we pull them down.

How it works:
  1. List every .txt file in ml/dataset/labels/  (one per labeled image).
  2. For each label "foo.txt", look in R2 prefixes (Trays/, Trays (clean)/)
     for any image with basename "foo.jpg" / "foo.jpeg" / "foo.png".
  3. Download each match into ml/dataset/images/.
  4. Report labels that didn't find an image (so you know what's missing).

Run from the Eco-Tracker/ml/ folder:
  python download_images.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from dotenv import load_dotenv

# Load R2 credentials from web/.env.local (same file the website uses).
HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / "web" / ".env.local")

R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET = os.environ["R2_BUCKET"]

LABELS_DIR = HERE / "dataset" / "labels"
IMAGES_DIR = HERE / "dataset" / "images"
PREFIXES = ["Trays/", "Trays (clean)/"]
EXTS = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")


def make_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )


def list_all_keys(client, prefix: str) -> list[str]:
    """Return every object key under a prefix (handles pagination)."""
    keys: list[str] = []
    token: str | None = None
    while True:
        kwargs = {"Bucket": R2_BUCKET, "Prefix": prefix}
        if token:
            kwargs["ContinuationToken"] = token
        resp = client.list_objects_v2(**kwargs)
        for obj in resp.get("Contents", []):
            keys.append(obj["Key"])
        if not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
    return keys


def main() -> int:
    if not LABELS_DIR.exists():
        print(f"ERROR: {LABELS_DIR} not found", file=sys.stderr)
        return 1

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    label_basenames = sorted(p.stem for p in LABELS_DIR.glob("*.txt"))
    print(f"Found {len(label_basenames)} label files in {LABELS_DIR}")

    client = make_client()

    # Index every key in both R2 prefixes by its basename (without extension).
    print("Listing R2 objects...")
    by_basename: dict[str, str] = {}
    for prefix in PREFIXES:
        keys = list_all_keys(client, prefix)
        print(f"  {prefix} -> {len(keys)} objects")
        for key in keys:
            filename = key.rsplit("/", 1)[-1]
            stem, ext = os.path.splitext(filename)
            if ext in EXTS and stem not in by_basename:
                by_basename[stem] = key

    downloaded = 0
    skipped = 0
    missing: list[str] = []
    for stem in label_basenames:
        key = by_basename.get(stem)
        if key is None:
            missing.append(stem)
            continue
        ext = os.path.splitext(key)[1]
        out_path = IMAGES_DIR / f"{stem}{ext}"
        if out_path.exists():
            skipped += 1
            continue
        client.download_file(R2_BUCKET, key, str(out_path))
        downloaded += 1
        if downloaded % 10 == 0:
            print(f"  downloaded {downloaded}...")

    print()
    print(f"Done. Downloaded: {downloaded}, already present: {skipped}, missing: {len(missing)}")
    if missing:
        print("Labels without a matching image in R2:")
        for stem in missing:
            print(f"  - {stem}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
