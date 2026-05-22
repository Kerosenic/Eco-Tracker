"""Run one tray scan and write the result to Supabase + R2.

Laptop dev mode (no cameras, no scale):
  - Student: picked at random (or by --student flag)
  - Weight:  random 0-350g
  - Photo:   station/sample-tray.jpg (or --photo path)

The Pi version replaces those three stubs with real hardware reads;
everything downstream (score, upload, save) stays the same.
"""

import argparse
import random
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from db import supabase_client, r2_client, R2_BUCKET
from score import score_tray, max_possible_score


def upload_photo(photo_path: Path) -> str:
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    key = f"Tray-Photos/{timestamp}-{uuid.uuid4()}{photo_path.suffix}"
    r2_client().upload_file(
        str(photo_path),
        R2_BUCKET,
        key,
        ExtraArgs={"ContentType": "image/jpeg"},
    )
    return key


def pick_student(supabase, name: str | None):
    query = supabase.table("students").select("id, name, total_credits")
    if name:
        query = query.eq("name", name)
    res = query.execute()
    if not res.data:
        sys.exit("No matching student. Run the seed SQL first, or check --student spelling.")
    return random.choice(res.data) if not name else res.data[0]


def fake_weight_g() -> float:
    return round(random.uniform(0, 350), 1)


def main(photo_arg: str | None, student_arg: str | None) -> None:
    supabase = supabase_client()

    student = pick_student(supabase, student_arg)
    print(f"Student: {student['name']} ({student['id']})")

    weight_g = fake_weight_g()
    print(f"Weight:  {weight_g}g")

    photo_path = Path(photo_arg) if photo_arg else Path(__file__).parent / "sample-tray.jpg"
    if not photo_path.exists():
        sys.exit(f"Photo not found: {photo_path}\nDrop any .jpg into station/ as sample-tray.jpg, or pass --photo.")

    compartment_scores, total_score = score_tray(str(photo_path))
    print(f"Scores:  {compartment_scores}  total={total_score}")

    eco_credits = round(100 - (total_score / max_possible_score()) * 90)
    co2_saved_g = round(max(0, 350 - weight_g) * 5, 1)

    photo_key = upload_photo(photo_path)
    print(f"Uploaded: {photo_key}")

    supabase.table("meals").insert({
        "student_id": student["id"],
        "weight_g": weight_g,
        "total_score": total_score,
        "eco_credits": eco_credits,
        "co2_saved_g": co2_saved_g,
        "compartment_scores": compartment_scores,
        "photo_url": photo_key,
    }).execute()

    new_total = student["total_credits"] + eco_credits
    supabase.table("students").update({"total_credits": new_total}).eq("id", student["id"]).execute()
    print(f"Saved. {student['name']} now has {new_total} credits.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", help="Path to a tray photo. Defaults to station/sample-tray.jpg")
    parser.add_argument("--student", help="Student name. Defaults to random.")
    args = parser.parse_args()
    main(args.photo, args.student)
