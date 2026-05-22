"""Compute tray waste scores.

Stub — returns realistic random scores. Will be replaced with a YOLO
model call once the model is trained. Keep the function signature stable
so swapping in the real model touches nothing else.
"""

import random


COMPARTMENTS = ["main", "side1", "side2", "soup", "dessert"]
LARGE_COMPARTMENT = "main"

_WASTE_LEVELS = [0, 1, 2, 3]
_WASTE_WEIGHTS = [0.50, 0.30, 0.15, 0.05]


def score_tray(photo_path: str) -> tuple[dict, int]:
    scores = {c: random.choices(_WASTE_LEVELS, weights=_WASTE_WEIGHTS)[0] for c in COMPARTMENTS}
    total = sum(scores[c] * (2 if c == LARGE_COMPARTMENT else 1) for c in COMPARTMENTS)
    return scores, total


def max_possible_score() -> int:
    return 3 * (len(COMPARTMENTS) + 1)
