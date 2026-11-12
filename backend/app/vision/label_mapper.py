"""Map a detector's free-text label (e.g. "Idly", "sambhar") to an ingredient key."""

import difflib
import re

from app.services.food_repository import FoodRepository

FUZZY_CUTOFF = 0.85


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


class LabelMapper:
    def __init__(self, repo: FoodRepository):
        self._known_keys = set(repo.ingredients)
        self._alias_to_key: dict[str, str] = {}
        for key, ingredient in repo.ingredients.items():
            self._alias_to_key[normalize(key)] = key
            self._alias_to_key[normalize(ingredient["name"])] = key
        for key, aliases in repo.aliases.items():
            for alias in aliases:
                self._alias_to_key[normalize(alias)] = key

    def map(self, label: str, suggested_key: str | None = None) -> str | None:
        if suggested_key in self._known_keys:
            return suggested_key

        text = normalize(label)
        if not text:
            return None
        if text in self._alias_to_key:
            return self._alias_to_key[text]

        # Longest alias that appears as whole words wins: "masala dosa" beats "dosa", "sambar rice" beats "rice".
        padded = f" {text} "
        contained = [alias for alias in self._alias_to_key if f" {alias} " in padded]
        if contained:
            return self._alias_to_key[max(contained, key=len)]

        close = difflib.get_close_matches(text, list(self._alias_to_key), n=1, cutoff=FUZZY_CUTOFF)
        return self._alias_to_key[close[0]] if close else None
