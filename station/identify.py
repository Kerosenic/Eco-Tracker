"""Face identification for the station.

Uses the `face_recognition` library (built on dlib) to:
  - Compute a 128-number "embedding" for a face in a photo.
  - Compare an unknown face against every student's saved embedding
    and return the closest match (or None if nobody is similar enough).

Why embeddings:
  Two photos of the same person produce two embeddings that are CLOSE
  in 128-D space. Two different people produce embeddings that are FAR
  apart. So "find the matching student" reduces to "find the nearest
  saved embedding under a distance threshold".

Threshold:
  face_recognition's docs recommend 0.6 as the cutoff for the same person.
  We use 0.55 (slightly stricter) so a stranger is more likely to be
  rejected than a real student is misclassified as someone else.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional

import face_recognition  # type: ignore[import-not-found]
import numpy as np


MATCH_THRESHOLD = 0.55


def compute_embedding(image_path: str | Path) -> Optional[list[float]]:
    """Return a 128-float embedding for the largest face in `image_path`.

    Returns None if no face is detected. We pick the largest face so a
    background bystander can't accidentally claim the meal.
    """
    image = face_recognition.load_image_file(str(image_path))
    boxes = face_recognition.face_locations(image, model="hog")
    if not boxes:
        return None

    # Largest face = biggest (bottom-top) * (right-left) area.
    boxes.sort(key=lambda b: (b[2] - b[0]) * (b[1] - b[3]), reverse=True)
    encodings = face_recognition.face_encodings(image, [boxes[0]])
    if not encodings:
        return None
    return encodings[0].tolist()


def find_match(
    unknown_embedding: list[float],
    students: Iterable[dict],
) -> Optional[dict]:
    """Return the closest student under MATCH_THRESHOLD, else None.

    `students` is an iterable of rows from Supabase's `students` table.
    Each row must have `face_embedding` as a list of 128 floats (jsonb
    column). Rows without an embedding are skipped.
    """
    target = np.asarray(unknown_embedding, dtype=np.float64)
    best_student: Optional[dict] = None
    best_distance = float("inf")

    for student in students:
        saved = student.get("face_embedding")
        if not saved:
            continue
        candidate = np.asarray(saved, dtype=np.float64)
        if candidate.shape != target.shape:
            continue
        distance = float(np.linalg.norm(target - candidate))
        if distance < best_distance:
            best_distance = distance
            best_student = student

    if best_student is None or best_distance > MATCH_THRESHOLD:
        return None
    best_student["_match_distance"] = best_distance
    return best_student
