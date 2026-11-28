"""Approximate car value ranking for sorting contacts (rough, PL market feel)."""

from __future__ import annotations

import re
from typing import Optional

# Higher score = more expensive / premium. Matched longest-first against car text.
# Scores are relative ranks, not real PLN prices.
_MODEL_SCORES: list[tuple[str, int]] = [
    # Ultra / exotic
    ("lamborghini", 100),
    ("ferrari", 100),
    ("bentley", 98),
    ("rolls royce", 98),
    ("aston martin", 95),
    ("maserati", 92),
    ("chevrolet corvette", 90),
    ("corvette", 90),
    ("porsche", 88),
    # Flagship luxury
    ("range rover", 85),
    ("mercedes s500", 84),
    ("mercedes s-class", 84),
    ("mercedes gl550", 82),
    ("mercedes gl", 80),
    ("mercedes gle", 78),
    ("mercedes glc", 74),
    ("mercedes cla35", 72),
    ("mercedes cla", 70),
    ("mercedes w204", 62),
    ("mercedes", 68),
    ("bmw x6", 80),
    ("bmw x5", 78),
    ("bmw x4", 72),
    ("bmw x3", 70),
    ("bmw x2", 62),
    ("bmw x1", 60),
    ("bmw g30", 72),
    ("bmw f10", 65),
    ("bmw f11", 65),
    ("bmw f30", 60),
    ("bmw e65", 58),
    ("bmw e92", 58),
    ("bmw e60", 55),
    ("bmw e61", 55),
    ("bmw gt", 62),
    ("bmw", 64),
    ("audi q8", 80),
    ("audi q7", 78),
    ("audi q5", 72),
    ("audi q3", 65),
    ("audi a8", 78),
    ("audi a7", 74),
    ("audi a6", 68),
    ("audi a5", 66),
    ("audi a4", 60),
    ("audi a3", 55),
    ("audi", 62),
    ("jaguar", 76),
    ("lexus", 74),
    ("mustang", 72),
    ("tesla", 75),
    ("cupra formento", 68),  # formentor typo in data
    ("cupra formentor", 68),
    ("cupra", 66),
    # Premium / upper mid SUVs & saloons
    ("volvo xc90", 72),
    ("volvo v90", 68),
    ("volvo xc60", 65),
    ("volvo xc40", 60),
    ("volvo xc", 62),
    ("volvo s60", 58),
    ("volvo s40", 48),
    ("volvo", 58),
    ("jeep", 62),
    ("skoda kodiaq", 58),
    ("superb", 56),
    ("passat cc", 55),
    ("vw cc", 55),
    ("passat b8", 52),
    ("passat b7", 48),
    ("passat b6", 45),
    ("passat", 50),
    ("vw tiguan", 55),
    ("tiguan", 55),
    ("peugeot 508", 52),
    ("opel insignia", 50),
    ("toyota camry", 55),
    ("toyota rav4", 54),
    ("toyota rav", 54),
    ("toyota chr", 48),
    ("honda cr-v", 52),
    ("honda crv", 52),
    ("mazda cx5", 52),
    ("mazda cx-5", 52),
    ("mazda cx3", 45),
    ("mazda cx", 48),
    ("mazda rx", 55),
    ("mazda", 48),
    ("ford kuga", 48),
    ("ford mondeo", 48),
    ("smax", 48),
    ("s-max", 48),
    ("kia optima", 48),
    ("sportage", 48),
    ("hyundai tucson", 48),
    ("hyundai i40", 45),
    ("nissan qashkai", 46),
    ("nissan quashkai", 46),
    ("nissan quashkay", 46),
    ("qashqai", 46),
    ("mini", 50),
    # Mid
    ("golf", 45),
    ("seat leon", 44),
    ("octavia", 44),
    ("ford focus", 42),
    ("ford cmax", 40),
    ("ford c-max", 40),
    ("astra gtc", 40),
    ("astra", 38),
    ("kia ceed", 40),
    ("kia", 40),
    ("hyundai kona", 42),
    ("hyundai ix35", 40),
    ("hyundai", 40),
    ("toyota auris", 40),
    ("toyota avensis", 42),
    ("toyota", 40),
    ("honda jazz", 35),
    ("honda", 40),
    ("nissan juke", 40),
    ("nissan", 40),
    ("renault megane", 38),
    ("renault scenic", 36),
    ("renault laguna", 36),
    ("renault captur", 38),
    ("renault master", 35),
    ("renault clio", 32),
    ("renault", 36),
    ("peugeot 307", 34),
    ("peugeot 300", 36),
    ("peugeot 200", 34),
    ("peugeot", 36),
    ("citroen c5", 38),
    ("citroen c4", 34),
    ("citroen", 34),
    ("skoda scala", 38),
    ("skoda skala", 38),
    ("skoda", 40),
    ("seat", 40),
    ("vw", 42),
    ("volkswagen", 42),
    ("opel mokka", 38),
    ("opel zafira", 36),
    ("opel vectra", 34),
    ("opel meriva", 32),
    ("opel signum", 36),
    ("opel corsa", 30),
    ("opel", 34),
    ("ford fiesta", 32),
    ("ford", 38),
    ("puma", 40),
    ("chr", 48),
    ("corolla", 42),
    ("subaru", 45),
    ("suzuki", 34),
    ("saab", 40),
    ("fiat 500", 32),
    ("fiat punto", 28),
    ("fiat grand", 36),
    ("fiat", 30),
    ("dodge", 50),
    ("chevrolet", 45),
    # Budget
    ("toyota yaris", 30),
    ("toyota aygo", 25),
    ("dacia", 22),
]

# Pre-sort longest needle first for greedy match
_MODEL_SCORES.sort(key=lambda x: len(x[0]), reverse=True)

_DEFAULT_UNKNOWN = 25
_DEFAULT_NO_CAR = 0


def score_car_label(label: str) -> tuple[int, str]:
    """Return (score, matched_key) for a single car label."""
    text = label.strip().lower()
    text = re.sub(r"\s+", " ", text)
    if not text:
        return _DEFAULT_NO_CAR, ""
    for key, score in _MODEL_SCORES:
        # Word-ish boundary so "mercedes s" does not match inside "mercedes sk"
        if re.search(rf"(?<![a-z0-9]){re.escape(key)}(?![a-z])", text):
            return score, key
    return _DEFAULT_UNKNOWN, "unknown"


def score_cars_field(cars: Optional[str]) -> tuple[int, str]:
    """
    Score a contact's cars field (semicolon-separated).
    Uses the MAX score among listed cars (best/most expensive car wins).
    """
    if not cars or not cars.strip():
        return _DEFAULT_NO_CAR, ""

    best_score = _DEFAULT_NO_CAR
    best_label = ""
    best_key = ""
    for part in cars.split(";"):
        part = part.strip()
        if not part:
            continue
        score, key = score_car_label(part)
        if score > best_score:
            best_score = score
            best_label = part
            best_key = key
    return best_score, best_label or best_key
