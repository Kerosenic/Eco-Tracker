"""One-time backfill: compute face embeddings for every student that has
a `photo_url` saved on their row, and write the embedding back to
`students.face_embedding`.

Run this after students register their faces on the website. The Pi
station will then be able to identify them by webcam at meal time.

Usage:
    python register_faces.py            # all students missing an embedding
    python register_faces.py --all      # recompute for everybody
    python register_faces.py --student "Emily Chen"
"""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

from db import supabase_client, r2_client, R2_BUCKET
from identify import compute_embedding


def download_face(r2, key: str, dest: Path) -> bool:
    """Download `key` from R2 into `dest`. Returns False if not found."""
    try:
        r2.download_file(R2_BUCKET, key, str(dest))
        return True
    except Exception as err:
        print(f"  ! could not download {key}: {err}")
        return False


def main(refresh_all: bool, student_name: str | None) -> None:
    supabase = supabase_client()
    r2 = r2_client()

    query = supabase.table("students").select("id, name, photo_url, face_embedding")
    if student_name:
        query = query.eq("name", student_name)
    students = query.execute().data or []

    if not students:
        sys.exit("No students found. Check --student spelling, or run the seed SQL.")

    updated = 0
    skipped = 0
    failed = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        for student in students:
            name = student["name"]
            photo_key = student.get("photo_url")
            existing = student.get("face_embedding")

            if not photo_key:
                print(f"- {name}: no photo_url, skip")
                skipped += 1
                continue
            if existing and not refresh_all:
                print(f"- {name}: already has embedding, skip (use --all to recompute)")
                skipped += 1
                continue

            print(f"+ {name}: downloading {photo_key}")
            local = tmp_path / f"{student['id']}.jpg"
            if not download_face(r2, photo_key, local):
                failed += 1
                continue

            embedding = compute_embedding(local)
            if embedding is None:
                print(f"  ! no face detected in photo, skip")
                failed += 1
                continue

            supabase.table("students").update({"face_embedding": embedding}).eq(
                "id", student["id"]
            ).execute()
            print(f"  saved 128-float embedding")
            updated += 1

    print(f"\nDone. updated={updated} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Recompute embeddings even for students who already have one.")
    parser.add_argument("--student", help="Only process this one student by name.")
    args = parser.parse_args()
    main(args.all, args.student)
