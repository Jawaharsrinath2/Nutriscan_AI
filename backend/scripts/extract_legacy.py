"""One-time migration: pull data and images out of the legacy single-file HTML app.

Writes:
  backend/app/data/ingredients.json   <- INGREDIENT_DB
  backend/app/data/dishes.json        <- DISH_PRESETS (+ dropdown group/label from the <select>)
  backend/app/data/diet_plans.json    <- DIET_PLANS (+ card title/description from the markup)
  frontend/public/samples/*.jpg       <- embedded base64 dish photos, deduplicated by hash

Usage (from the backend folder):
  python scripts/extract_legacy.py [path/to/legacy.html]
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
DEFAULT_HTML = PROJECT_DIR / "legacy" / "nutriscan_ai_pre_meal_food_photo_analyzer_diet_planner.html"
DATA_DIR = BACKEND_DIR / "app" / "data"
SAMPLES_DIR = PROJECT_DIR / "frontend" / "public" / "samples"
SAMPLES_URL_PREFIX = "/samples/"


def js_object_to_json(src: str) -> str:
    """Convert a JS object literal (unquoted keys, comments, trailing commas) to JSON text."""
    out: list[str] = []
    i, n = 0, len(src)
    while i < n:
        ch = src[i]
        if ch in "\"'":
            # Copy string literals verbatim (re-quoted with double quotes).
            quote, j, buf = ch, i + 1, []
            while src[j] != quote:
                if src[j] == "\\":
                    buf.append(src[j : j + 2])
                    j += 2
                    continue
                buf.append('\\"' if src[j] == '"' else src[j])
                j += 1
            out.append('"' + "".join(buf) + '"')
            i = j + 1
        elif src.startswith("//", i):
            i = src.index("\n", i)
        elif ch.isalpha() or ch == "_":
            m = re.match(r"[A-Za-z_]\w*", src[i:])
            word = m.group(0)
            rest = src[i + len(word) :].lstrip()
            out.append(f'"{word}"' if rest.startswith(":") else word)
            i += len(word)
        else:
            out.append(ch)
            i += 1
    text = "".join(out)
    return re.sub(r",(\s*[}\]])", r"\1", text)


def extract_const(page: str, name: str) -> dict:
    start = page.index(f"const {name} = {{") + len(f"const {name} = ")
    depth, i = 0, start
    in_str: str | None = None
    while True:
        ch = page[i]
        if in_str:
            if ch == "\\":
                i += 1
            elif ch == in_str:
                in_str = None
        elif ch in "\"'":
            in_str = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    return json.loads(js_object_to_json(page[start : i + 1]))


def save_images(dishes: dict) -> dict[str, str]:
    """Write each preset photo once; returns sha1 -> public URL."""
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    by_hash: dict[str, str] = {}
    for key, dish in dishes.items():
        data_url = dish.get("image", "")
        if not data_url.startswith("data:image"):
            continue
        raw = base64.b64decode(data_url.split(",", 1)[1])
        digest = hashlib.sha1(raw).hexdigest()
        if digest not in by_hash:
            (SAMPLES_DIR / f"{key}.jpg").write_bytes(raw)
            by_hash[digest] = SAMPLES_URL_PREFIX + f"{key}.jpg"
        dish["image"] = by_hash[digest]
    return by_hash


def parse_dish_menu(page: str) -> dict[str, dict]:
    """Read optgroup + option labels from the dish <select> so the dropdown stays identical."""
    select = re.search(r'<select id="dishProfileSelect".*?</select>', page, re.S).group(0)
    menu: dict[str, dict] = {}
    for order, (group, body) in enumerate(re.findall(r'<optgroup label="([^"]+)">(.*?)</optgroup>', select, re.S)):
        for value, label in re.findall(r'<option value="([^"]+)"[^>]*>(.*?)</option>', body, re.S):
            menu[value] = {"menu_group": html.unescape(group), "menu_label": html.unescape(label.strip())}
    return menu


def parse_plan_cards(page: str) -> dict[str, dict]:
    cards: dict[str, dict] = {}
    for plan_key, body in re.findall(r'data-plan="([^"]+)".*?>(.*?)</button>', page, re.S):
        title = re.search(r'font-extrabold text-slate-900">(.*?)</div>', body, re.S).group(1)
        desc = re.search(r"<p[^>]*>(.*?)</p>", body, re.S).group(1)
        cards[plan_key] = {"title": html.unescape(title.strip()), "description": html.unescape(desc.strip())}
    return cards


def other_embedded_images(page: str, known: dict[str, str]) -> list[str]:
    """Report embedded images that are not one of the preset photos (should be none)."""
    missing = []
    for m in re.finditer(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", page):
        digest = hashlib.sha1(base64.b64decode(m.group(1))).hexdigest()
        if digest not in known:
            missing.append(digest)
    return missing


def main() -> None:
    html_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_HTML
    page = html_path.read_text(encoding="utf-8")

    ingredients = extract_const(page, "INGREDIENT_DB")
    dishes = extract_const(page, "DISH_PRESETS")
    plans = extract_const(page, "DIET_PLANS")

    by_hash = save_images(dishes)
    menu = parse_dish_menu(page)
    for key, dish in dishes.items():
        dish.update(menu.get(key, {"menu_group": None, "menu_label": dish["title"]}))
        # The legacy confidence numbers were hard-coded, not measured.
        dish.pop("confidence", None)
        # Many presets borrow another dish's photo; their pins were placed for that other photo.
        if dish["image"] != f"{SAMPLES_URL_PREFIX}{key}.jpg":
            dish["hotspots"] = []

    cards = parse_plan_cards(page)
    for key, plan in plans.items():
        plan.update(cards.get(key, {}))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name, payload in (("ingredients", ingredients), ("dishes", dishes), ("diet_plans", plans)):
        (DATA_DIR / f"{name}.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    unknown = other_embedded_images(page, by_hash)
    print(f"ingredients: {len(ingredients)}  dishes: {len(dishes)}  plans: {len(plans)}")
    print(f"unique images written: {len(by_hash)}  -> {SAMPLES_DIR}")
    print(f"embedded images not matching any preset: {len(set(unknown))}")


if __name__ == "__main__":
    main()
