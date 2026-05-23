"""Compute tray waste scores from a photo using a trained YOLO model.

Falls back to a stub (random scores) if the model file isn't present yet,
so the station pipeline still runs end-to-end during development.

Class layout (must match ml/data.yaml):
  0..3 = Compartment + waste 0..3
  4..7 = Big Compartment + waste 0..3

Output:
  compartment_scores: dict mapping compartment_id -> waste level (0-3)
  total: sum of waste levels, with the Big Compartment counted twice
         (so a fully wasted big compartment hurts more than a small one).
"""

from __future__ import annotations

import random
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "best.pt"
COMPARTMENT_BIG = "big_compartment"
COMPARTMENT_SMALL = "compartment"

_WASTE_LEVELS = [0, 1, 2, 3]
_WASTE_WEIGHTS = [0.50, 0.30, 0.15, 0.05]
_LEGACY_COMPARTMENTS = ["main", "side1", "side2", "soup", "dessert"]


def _stub_score() -> tuple[dict, int]:
    scores = {c: random.choices(_WASTE_LEVELS, weights=_WASTE_WEIGHTS)[0] for c in _LEGACY_COMPARTMENTS}
    total = sum(scores[c] * (2 if c == "main" else 1) for c in _LEGACY_COMPARTMENTS)
    return scores, total


_yolo_model = None


def _load_model():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        _yolo_model = YOLO(str(MODEL_PATH))
    return _yolo_model


def _class_to_compartment_and_waste(class_id: int) -> tuple[str, int]:
    if 0 <= class_id <= 3:
        return COMPARTMENT_SMALL, class_id
    if 4 <= class_id <= 7:
        return COMPARTMENT_BIG, class_id - 4
    raise ValueError(f"unexpected class id: {class_id}")


def score_tray(photo_path: str) -> tuple[dict, int]:
    if not MODEL_PATH.exists():
        return _stub_score()

    model = _load_model()
    results = model.predict(source=photo_path, conf=0.25, verbose=False)
    detections = results[0].boxes

    if detections is None or len(detections) == 0:
        return {}, 0

    # One row per detected box. Build compartment_scores keyed by
    # "big_compartment" / "compartment_1" / "compartment_2" ... so the same
    # tray photo always yields stable, named compartments.
    big_waste: int | None = None
    small_wastes: list[int] = []
    for cls_tensor in detections.cls:
        class_id = int(cls_tensor.item())
        kind, waste = _class_to_compartment_and_waste(class_id)
        if kind == COMPARTMENT_BIG:
            if big_waste is None or waste > big_waste:
                big_waste = waste
        else:
            small_wastes.append(waste)

    compartment_scores: dict = {}
    if big_waste is not None:
        compartment_scores["big_compartment"] = big_waste
    for i, w in enumerate(small_wastes, start=1):
        compartment_scores[f"compartment_{i}"] = w

    total = (big_waste * 2 if big_waste is not None else 0) + sum(small_wastes)
    return compartment_scores, total


def max_possible_score() -> int:
    # Worst case: 1 big compartment full + 4 regular compartments full.
    return 3 * 2 + 3 * 4
