"""Find the dish preset whose ingredients best match what was detected."""

MATCH_THRESHOLD = 0.5


def _weighted_overlap(detected: dict[str, float], preset: dict[str, float]) -> float:
    keys = detected.keys() | preset.keys()
    shared = sum(min(detected.get(k, 0), preset.get(k, 0)) for k in keys)
    total = sum(max(detected.get(k, 0), preset.get(k, 0)) for k in keys)
    return shared / total if total else 0.0


def best_match(detected: dict[str, float], dishes: dict[str, dict]) -> str | None:
    """Return the preset key with the highest ingredient-set overlap, or None below the threshold."""
    if not detected:
        return None
    best_key, best_rank = None, (0.0, 0.0)
    for key, dish in dishes.items():
        preset = {item["key"]: item["grams"] for item in dish["items"]}
        jaccard = len(detected.keys() & preset.keys()) / len(detected.keys() | preset.keys())
        rank = (jaccard, _weighted_overlap(detected, preset))
        if rank > best_rank:
            best_key, best_rank = key, rank
    return best_key if best_rank[0] >= MATCH_THRESHOLD else None
