"""Supermarket Packaged Food & Barcode Health Audit Service.

Performs:
1. Barcode lookup via Open Food Facts API (with cached fallbacks for popular Indian/global items).
2. Packaging & Nutrition Label inspection via Gemini Vision fallback.
3. Health audit assessment: NutriScore (A to E), Nova group, Red Flags (palm oil, maltodextrin, high sugar, excess sodium), Green Flags, AI verdict, and healthy swaps.
4. Logging directly into user's daily MealLog targets.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import date, datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import MealLog
from app.schemas.audit import NutriGrade, ProductAuditResponse, ProductNutriments, LogPackagedFoodRequest
from app.schemas.meal import LoggedMeal, PlateItem

logger = logging.getLogger(__name__)

# Known sample catalogue for instant offline demo or fallback
PRESET_PRODUCTS: dict[str, dict[str, Any]] = {
    "8901719101038": {
        "barcode": "8901719101038",
        "product_name": "Parle-G Original Gluco Biscuits",
        "brand": "Parle",
        "image_url": "https://images.openfoodfacts.org/images/products/890/171/910/1038/front_en.11.400.jpg",
        "categories": ["Biscuits", "Sweet snacks", "Wheat biscuits"],
        "ingredients_text": "Refined Wheat Flour (Maida) (67%), Sugar (24.8%), Refined Palm Oil, Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Salt, Milk Solids, Emulsifier [INS 322] and Dough Conditioner [INS 223].",
        "nutriscore_grade": "e",
        "nova_group": 4,
        "nutriments": {
            "energy-kcal_100g": 461.0,
            "proteins_100g": 7.1,
            "carbohydrates_100g": 78.0,
            "fat_100g": 12.4,
            "sugars_100g": 24.8,
            "fiber_100g": 1.8,
            "sodium_100g": 0.3,
            "salt_100g": 0.75,
            "serving_size": "25g",
        },
    },
    "5449000000996": {
        "barcode": "5449000000996",
        "product_name": "Coca-Cola Original Taste",
        "brand": "The Coca-Cola Company",
        "image_url": "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.810.400.jpg",
        "categories": ["Beverages", "Carbonated drinks", "Sodas", "Colas"],
        "ingredients_text": "Carbonated Water, Sugar, Colour (Caramel IV INS 150d), Acidity Regulator (INS 338), Caffeine, Natural Flavours.",
        "nutriscore_grade": "e",
        "nova_group": 4,
        "nutriments": {
            "energy-kcal_100g": 42.0,
            "proteins_100g": 0.0,
            "carbohydrates_100g": 10.6,
            "fat_100g": 0.0,
            "sugars_100g": 10.6,
            "fiber_100g": 0.0,
            "sodium_100g": 0.01,
            "salt_100g": 0.025,
            "serving_size": "250ml",
        },
    },
    "7622210287471": {
        "barcode": "7622210287471",
        "product_name": "Cadbury Dairy Milk Chocolate",
        "brand": "Cadbury / Mondelez",
        "image_url": "https://images.openfoodfacts.org/images/products/762/221/028/7471/front_en.5.400.jpg",
        "categories": ["Confectionery", "Chocolates", "Milk chocolates"],
        "ingredients_text": "Sugar, Milk Solids (20%), Cocoa Butter, Cocoa Solids, Emulsifiers (INS 442, INS 476), Flavours (Natural, Nature Identical and Artificial (Vanilla) Flavouring Substances).",
        "nutriscore_grade": "e",
        "nova_group": 4,
        "nutriments": {
            "energy-kcal_100g": 532.0,
            "proteins_100g": 7.8,
            "carbohydrates_100g": 59.5,
            "fat_100g": 29.8,
            "sugars_100g": 57.0,
            "fiber_100g": 2.1,
            "sodium_100g": 0.15,
            "salt_100g": 0.38,
            "serving_size": "24g",
        },
    },
    "8901499008800": {
        "barcode": "8901499008800",
        "product_name": "Kellogg's Corn Flakes Original",
        "brand": "Kellogg's",
        "image_url": "https://images.openfoodfacts.org/images/products/890/149/900/8800/front_en.11.400.jpg",
        "categories": ["Breakfast cereals", "Corn flakes"],
        "ingredients_text": "Milled Corn (91.2%), Sugar, Cereal Extract, Iodized Salt, Vitamins, Minerals and Antioxidant (INS 320).",
        "nutriscore_grade": "c",
        "nova_group": 4,
        "nutriments": {
            "energy-kcal_100g": 378.0,
            "proteins_100g": 7.3,
            "carbohydrates_100g": 84.0,
            "fat_100g": 0.8,
            "sugars_100g": 8.0,
            "fiber_100g": 3.2,
            "sodium_100g": 0.72,
            "salt_100g": 1.8,
            "serving_size": "30g",
        },
    },
    "8901030383709": {
        "barcode": "8901030383709",
        "product_name": "Knorr Classic Mixed Vegetable Soup",
        "brand": "Knorr / Unilever",
        "image_url": None,
        "categories": ["Soups", "Dehydrated soups"],
        "ingredients_text": "Refined Wheat Flour (Maida), Dehydrated Vegetables (15%), Sugar, Salt, Hydrolyzed Vegetable Protein, Edible Vegetable Fat, Thickener (INS 415), Flavor Enhancers (INS 627, INS 631).",
        "nutriscore_grade": "d",
        "nova_group": 4,
        "nutriments": {
            "energy-kcal_100g": 332.0,
            "proteins_100g": 6.8,
            "carbohydrates_100g": 65.0,
            "fat_100g": 4.5,
            "sugars_100g": 18.0,
            "fiber_100g": 4.0,
            "sodium_100g": 3.8,
            "salt_100g": 9.5,
            "serving_size": "11g",
        },
    },
}

# Additives and Red Flag triggers
HARMFUL_PATTERNS = [
    (r"palm\s*oil|refined\s*palmolein|palmolein", "Refined Palm Oil / Palmolein (high in saturated palmitic acid, promotes vascular inflammation)"),
    (r"hydrogenated|vanaspati|trans\s*fat|partially\s*hydrogenated", "Hydrogenated Fats / Trans Fat risk (adverse impact on LDL/HDL lipid profiles)"),
    (r"invert\s*sugar|glucose\s*syrup|high\s*fructose|maltodextrin|liquid\s*glucose|dextrose", "Hidden Ultra-Refined Sugars (maltodextrin / invert syrup causes sharp glucose & insulin spikes)"),
    (r"ins\s*150d|caramel\s*iv|caramel\s*color", "Caramel Color IV (INS 150d) (processed with ammonia & sulfites, potential 4-MEI contaminant)"),
    (r"ins\s*102|tartrazine", "Tartrazine (INS 102) (synthetic azo dye linked to hyperactivity and allergies)"),
    (r"ins\s*110|sunset\s*yellow", "Sunset Yellow (INS 110) (artificial azo dye, banned in certain European foods)"),
    (r"ins\s*621|monosodium\s*glutamate|msg", "MSG / Flavor Enhancer (INS 621) (may induce hyper-palatability & overeating)"),
    (r"ins\s*951|aspartame", "Aspartame (INS 951) (artificial sweetener classified as possibly carcinogenic by WHO IARC)"),
    (r"ins\s*955|sucralose", "Sucralose (INS 955) (high-potency synthetic sweetener with potential gut microbiome alteration)"),
    (r"ins\s*211|sodium\s*benzoate", "Sodium Benzoate (INS 211) (synthetic preservative that can form benzene traces with ascorbic acid)"),
    (r"ins\s*223|sodium\s*metabisulphite", "Sodium Metabisulphite (INS 223) (strong sulfiting dough agent, allergen risk)"),
    (r"ins\s*320|bha", "BHA / Antioxidant (INS 320) (synthetic phenolic preservative under scrutiny for endocrine disruption)"),
]


def _clean_str(val: Any) -> str:
    return str(val).strip() if val else ""


def _parse_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        return round(f, 2)
    except (ValueError, TypeError):
        return default


def _extract_serving_grams(serving_size_str: str | None, default: float = 50.0) -> float:
    if not serving_size_str:
        return default
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|ml|gm)", serving_size_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return default


def evaluate_product_health(
    barcode: str,
    product_name: str,
    brand: str | None,
    image_url: str | None,
    categories: list[str],
    ingredients_text: str | None,
    nutriments_raw: dict[str, Any],
    grade_hint: str | None = None,
    nova_hint: int | None = None,
) -> ProductAuditResponse:
    """Computes NutriGrade, Nova Ultra-processing, Red Flags, Green Flags, AI verdict, and Smart Swaps."""
    kcal_100g = _parse_float(nutriments_raw.get("energy-kcal_100g") or nutriments_raw.get("energy-kcal"))
    protein_100g = _parse_float(nutriments_raw.get("proteins_100g") or nutriments_raw.get("proteins"))
    carbs_100g = _parse_float(nutriments_raw.get("carbohydrates_100g") or nutriments_raw.get("carbohydrates"))
    fat_100g = _parse_float(nutriments_raw.get("fat_100g") or nutriments_raw.get("fat"))
    sugars_100g = _parse_float(nutriments_raw.get("sugars_100g") or nutriments_raw.get("sugars"))
    fiber_100g = _parse_float(nutriments_raw.get("fiber_100g") or nutriments_raw.get("fiber"))
    sodium_100g = _parse_float(nutriments_raw.get("sodium_100g") or nutriments_raw.get("sodium"))
    salt_100g = _parse_float(nutriments_raw.get("salt_100g") or nutriments_raw.get("salt"))

    if salt_100g > 0 and sodium_100g == 0:
        sodium_100g = round(salt_100g / 2.5, 3)
    elif sodium_100g > 0 and salt_100g == 0:
        salt_100g = round(sodium_100g * 2.5, 3)

    serving_size_str = nutriments_raw.get("serving_size")
    serving_g = _extract_serving_grams(serving_size_str, default=50.0)

    # Compute serving values
    ratio = serving_g / 100.0
    serving_kcal = round(kcal_100g * ratio)
    serving_protein = round(protein_100g * ratio, 1)
    serving_carbs = round(carbs_100g * ratio, 1)
    serving_fat = round(fat_100g * ratio, 1)
    serving_sugars = round(sugars_100g * ratio, 1)

    nutriments = ProductNutriments(
        kcal_100g=kcal_100g,
        protein_100g=protein_100g,
        carbs_100g=carbs_100g,
        fat_100g=fat_100g,
        fiber_100g=fiber_100g,
        sugars_100g=sugars_100g,
        sodium_100g=sodium_100g,
        salt_100g=salt_100g,
        serving_size=serving_size_str,
        serving_grams=serving_g,
        serving_kcal=serving_kcal,
        serving_protein=serving_protein,
        serving_carbs=serving_carbs,
        serving_fat=serving_fat,
        serving_sugars=serving_sugars,
    )

    # Ingredients inspection
    ing_lower = (ingredients_text or "").lower()
    red_flags: list[str] = []
    harmful_additives: list[str] = []
    green_flags: list[str] = []

    for pattern, warning in HARMFUL_PATTERNS:
        if re.search(pattern, ing_lower):
            red_flags.append(warning)
            if "INS" in warning or "Additives" in warning or "preservative" in warning.lower() or "dye" in warning.lower():
                harmful_additives.append(warning)

    # Macro-based flags
    if sugars_100g >= 20.0:
        red_flags.append(f"Excessive Sugar: {sugars_100g}g sugar per 100g (over 4 teaspoons per serving)")
    elif sugars_100g >= 12.0:
        red_flags.append(f"High Added Sugars ({sugars_100g}g / 100g)")

    if sodium_100g >= 0.6:  # 600mg per 100g
        red_flags.append(f"High Sodium: {int(sodium_100g * 1000)}mg sodium per 100g (risk of blood pressure elevation)")

    if fat_100g >= 20.0:
        red_flags.append(f"High Total Fat: {fat_100g}g per 100g")

    if kcal_100g >= 450:
        red_flags.append(f"Calorie Dense ({int(kcal_100g)} kcal / 100g)")

    # Green flags
    if protein_100g >= 10.0:
        green_flags.append(f"High Protein ({protein_100g}g per 100g) aids muscle maintenance and satiety")
    elif protein_100g >= 6.0:
        green_flags.append(f"Moderate Protein source ({protein_100g}g per 100g)")

    if fiber_100g >= 5.0:
        green_flags.append(f"High Dietary Fiber ({fiber_100g}g per 100g) supports gut health and slows sugar absorption")

    if sugars_100g <= 4.0:
        green_flags.append(f"Low Sugar profile ({sugars_100g}g per 100g)")

    if sodium_100g <= 0.12:
        green_flags.append("Low Sodium formulation (< 120mg / 100g)")

    if "whole wheat" in ing_lower or "oats" in ing_lower or "millet" in ing_lower or "ragi" in ing_lower:
        green_flags.append("Contains whole grains / millets")

    # Determine NutriGrade & Health Score (0-100)
    score = 75
    # Negative deductions
    score -= min(35, int(sugars_100g * 1.2))
    score -= min(25, int(fat_100g * 0.8))
    score -= min(20, int(sodium_100g * 25))
    score -= min(20, len(red_flags) * 5)

    # Positive bonuses
    score += min(20, int(protein_100g * 1.5))
    score += min(15, int(fiber_100g * 2.0))
    if len(red_flags) == 0:
        score += 10

    score = max(5, min(95, score))

    # Grade determination
    if grade_hint and grade_hint.lower() in ("a", "b", "c", "d", "e"):
        grade: NutriGrade = grade_hint.upper()  # type: ignore
    else:
        if score >= 75:
            grade = "A"
        elif score >= 60:
            grade = "B"
        elif score >= 45:
            grade = "C"
        elif score >= 30:
            grade = "D"
        else:
            grade = "E"

    nova_group = nova_hint or (4 if (harmful_additives or "invert" in ing_lower or "palm" in ing_lower) else 3 if (fat_100g > 10 or sugars_100g > 10) else 1)

    # Status summary
    if grade in ("A", "B") and score >= 60:
        summary_status = "healthy"
    elif grade == "C" or (score >= 40 and score < 60):
        summary_status = "moderate"
    else:
        summary_status = "unhealthy"

    # Contextual Swaps
    healthy_swaps = _generate_swaps(product_name, categories, ing_lower, grade)

    # AI Verdict string
    verdict = _generate_verdict(product_name, grade, nova_group, score, red_flags, green_flags, sugars_100g, protein_100g)

    return ProductAuditResponse(
        barcode=barcode,
        product_name=product_name,
        brand=brand,
        image_url=image_url,
        categories=categories,
        ingredients_text=ingredients_text,
        nutriscore_grade=grade,
        nova_group=nova_group,
        health_score=score,
        verdict=verdict,
        summary_status=summary_status,
        red_flags=red_flags,
        green_flags=green_flags,
        harmful_additives=harmful_additives,
        healthy_swaps=healthy_swaps,
        nutriments=nutriments,
    )


def _generate_swaps(product_name: str, categories: list[str], ing: str, grade: NutriGrade) -> list[str]:
    combined = (product_name + " " + " ".join(categories) + " " + ing).lower()

    if any(k in combined for k in ["biscuit", "cookie", "rusk", "wafer", "parle"]):
        return [
            "Roasted Makhana (Foxnuts) with pink salt and turmeric (High fiber, 0 refined sugar)",
            "Homemade Ragi & Oats Jaggery Cookies (Whole grain & iron rich)",
            "Handful of roasted almonds, walnuts, and pumpkin seeds",
        ]
    elif any(k in combined for k in ["cola", "soda", "beverage", "soft drink", "pepsi", "coke"]):
        return [
            "Fresh Chilled Tender Coconut Water (Natural electrolytes, zero refined syrup)",
            "Sparkling Lime Water with fresh mint and chia seeds (Zero calorie refreshment)",
            "Iced Herbal Hibiscus or Green Tea unsweetened",
        ]
    elif any(k in combined for k in ["noodle", "ramen", "maggi", "pasta"]):
        return [
            "Whole Wheat or Foxtail Millet Noodles with stir-fried bell peppers and carrots",
            "Millet Vegetable Upma / Poha topped with roasted peanuts",
            "Soba (Buckwheat) noodles with tofu and sesame broth",
        ]
    elif any(k in combined for k in ["chocolate", "candy", "sweet", "cadbury"]):
        return [
            "Dark Chocolate (75%+ Cocoa) in moderate portions (Rich in flavonoids & antioxidants)",
            "Medjool dates stuffed with raw almond butter",
            "Greek yogurt topped with fresh blueberries and a drizzle of organic honey",
        ]
    elif any(k in combined for k in ["chips", "crisps", "namkeen", "lays", "fried"]):
        return [
            "Air-popped popcorn lightly seasoned with nutritional yeast or black pepper",
            "Baked Beetroot and Sweet Potato chips",
            "Sprouted Moong & Chana chaat with lemon juice and coriander",
        ]
    elif any(k in combined for k in ["soup"]):
        return [
            "Fresh homemade vegetable clear soup with blended pumpkin and lentils",
            "Tomato & roasted garlic soup without refined cornstarch or preservative thickeners",
        ]
    else:
        return [
            "Whole fruit (Apple, Orange, or Guava) paired with a handful of raw nuts",
            "Roasted chickpeas (Sundal / Bhuna Chana) for clean plant protein",
            "Boiled eggs with black pepper or fresh paneer cubes",
        ]


def _generate_verdict(
    product_name: str,
    grade: NutriGrade,
    nova: int,
    score: int,
    red_flags: list[str],
    green_flags: list[str],
    sugar: float,
    protein: float,
) -> str:
    if grade in ("D", "E") or score < 45:
        reasons = []
        if sugar >= 15:
            reasons.append("heavy sugar concentration")
        if any("palm" in rf.lower() for rf in red_flags):
            reasons.append("refined palm oil")
        if any("sodium" in rf.lower() for rf in red_flags):
            reasons.append("excessive sodium")
        if any("trans" in rf.lower() for rf in red_flags):
            reasons.append("unhealthy fat fractions")
        reason_txt = ", ".join(reasons) if reasons else "industrial processing and poor nutrient density"
        return (
            f"{product_name} is rated NutriScore '{grade}' (Ultra-processed NOVA {nova}). "
            f"It is dominated by {reason_txt}. Best avoided or kept for rare occasional treats."
        )
    elif grade == "C" or (score >= 45 and score < 65):
        return (
            f"{product_name} has a moderate nutritional profile (NutriScore '{grade}'). "
            "While it provides acceptable energy, monitor portion sizes carefully to prevent exceeding your daily sodium or sugar budget."
        )
    else:
        return (
            f"{product_name} delivers solid nutritional quality (NutriScore '{grade}', Health Score {score}/100). "
            "Good macronutrient balance with clean profile suitable for everyday health goals."
        )


async def lookup_barcode(barcode: str) -> ProductAuditResponse:
    """Fetch product from Open Food Facts API or fallback catalogue, then audit its health."""
    barcode = barcode.strip().replace(" ", "")

    # 1. Check preset demo catalogue first for instant response
    if barcode in PRESET_PRODUCTS:
        p = PRESET_PRODUCTS[barcode]
        return evaluate_product_health(
            barcode=barcode,
            product_name=p["product_name"],
            brand=p.get("brand"),
            image_url=p.get("image_url"),
            categories=p.get("categories", []),
            ingredients_text=p.get("ingredients_text"),
            nutriments_raw=p.get("nutriments", {}),
            grade_hint=p.get("nutriscore_grade"),
            nova_hint=p.get("nova_group"),
        )

    # 2. Query Open Food Facts API v2
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    headers = {"User-Agent": "NutriScanAI - WebApp - Version 1.0 (contact: info@nutriscan.ai)"}

    try:
        async with httpx.AsyncClient(timeout=9.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == 1 and "product" in data:
                    p = data["product"]
                    name = p.get("product_name_en") or p.get("product_name") or f"Packaged Food ({barcode})"
                    brand = p.get("brands") or p.get("brand_owner")
                    image_url = p.get("image_front_url") or p.get("image_url")
                    cats = [c.strip() for c in (p.get("categories") or "").split(",") if c.strip()][:5]
                    ing = p.get("ingredients_text_en") or p.get("ingredients_text")
                    nutri = p.get("nutriments", {})
                    grade = p.get("nutriscore_grade")
                    nova = p.get("nova_group")

                    return evaluate_product_health(
                        barcode=barcode,
                        product_name=name,
                        brand=brand,
                        image_url=image_url,
                        categories=cats,
                        ingredients_text=ing,
                        nutriments_raw=nutri,
                        grade_hint=grade,
                        nova_hint=nova,
                    )
    except Exception as exc:
        logger.warning("Open Food Facts lookup failed for barcode %s: %s", barcode, exc)

    # 3. Barcode not found
    raise ValueError(f"Product with barcode '{barcode}' was not found in the global food database. You can snap a photo of its Nutrition Table or try a sample barcode.")


async def audit_image_with_gemini(jpeg_bytes: bytes, settings: Settings) -> ProductAuditResponse:
    """Uses Gemini 3.6 Flash Vision to parse food packet photo, nutrition facts, or ingredients label."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=settings.gemini_timeout_s * 1000))

    schema = {
        "type": "OBJECT",
        "properties": {
            "is_packaged_food": {"type": "BOOLEAN"},
            "barcode": {"type": "STRING"},
            "product_name": {"type": "STRING"},
            "brand": {"type": "STRING"},
            "serving_size_g": {"type": "NUMBER"},
            "kcal_100g": {"type": "NUMBER"},
            "protein_100g": {"type": "NUMBER"},
            "carbs_100g": {"type": "NUMBER"},
            "fat_100g": {"type": "NUMBER"},
            "fiber_100g": {"type": "NUMBER"},
            "sugars_100g": {"type": "NUMBER"},
            "sodium_mg_100g": {"type": "NUMBER"},
            "ingredients_text": {"type": "STRING"},
            "categories": {"type": "ARRAY", "items": {"type": "STRING"}},
        },
        "required": ["is_packaged_food", "product_name", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g"],
    }

    prompt = (
        "Analyze this photo of a supermarket packaged food product, barcode, or nutrition facts table label.\n"
        "Extract:\n"
        "- barcode if visible\n"
        "- product_name and brand name\n"
        "- serving size in grams (if mentioned, else estimate 50g)\n"
        "- nutrition values normalized per 100g (Calories, Protein, Carbohydrates, Fat, Dietary Fiber, Sugars, Sodium in mg)\n"
        "- full ingredient list as text if readable\n"
        "- categories (e.g. snack, beverage, biscuit, dairy)\n"
        "If some values are missing, provide an educated estimate based on standard food science."
    )

    models_to_try = [settings.gemini_model, *settings.gemini_fallback_models]
    last_exc = None

    for m in models_to_try:
        try:
            res = client.models.generate_content(
                model=m,
                contents=[types.Part.from_bytes(data=jpeg_bytes, mime_type="image/jpeg"), prompt],
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema),
            )
            raw = json.loads(res.text or "{}")
            if not raw.get("is_packaged_food", True):
                raise ValueError("The provided photo does not appear to be a packaged food product or nutrition label.")

            barcode = raw.get("barcode") or uuid.uuid4().hex[:12]
            name = raw.get("product_name") or "Audited Packaged Food"
            brand = raw.get("brand")
            sodium_100g = round((raw.get("sodium_mg_100g") or 0.0) / 1000.0, 3)

            nutriments_raw = {
                "energy-kcal_100g": raw.get("kcal_100g", 0.0),
                "proteins_100g": raw.get("protein_100g", 0.0),
                "carbohydrates_100g": raw.get("carbs_100g", 0.0),
                "fat_100g": raw.get("fat_100g", 0.0),
                "fiber_100g": raw.get("fiber_100g", 0.0),
                "sugars_100g": raw.get("sugars_100g", 0.0),
                "sodium_100g": sodium_100g,
                "salt_100g": round(sodium_100g * 2.5, 3),
                "serving_size": f"{int(raw.get('serving_size_g') or 50)}g",
            }

            return evaluate_product_health(
                barcode=barcode,
                product_name=name,
                brand=brand,
                image_url=None,
                categories=raw.get("categories", []),
                ingredients_text=raw.get("ingredients_text"),
                nutriments_raw=nutriments_raw,
            )
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini vision audit failed on model %s: %s", m, exc)
            continue

    raise ValueError(f"Unable to analyze packaging image: {last_exc}")


def log_audit_to_meals(
    db: Session,
    user_id: int,
    request: LogPackagedFoodRequest,
) -> LoggedMeal:
    """Logs the audited packaged food directly into user's daily diary and updates dashboard targets."""
    now = datetime.now()
    meal_id = uuid.uuid4().hex
    title = f"{request.product_name} ({int(request.grams)}g)"
    if request.brand:
        title = f"{request.brand} - {title}"

    row = MealLog(
        id=meal_id,
        user_id=user_id,
        day=now.date(),
        created_at=now,
        slot=request.slot,
        title=title,
        image_url=request.image_url,
        items=[{"key": "packaged_food", "grams": request.grams, "name": request.product_name}],
        kcal=int(request.kcal),
        protein=round(float(request.protein), 1),
        carbs=round(float(request.carbs), 1),
        fat=round(float(request.fat), 1),
        fiber=round(float(request.fiber), 1),
    )
    db.add(row)
    db.commit()

    return LoggedMeal(
        id=row.id,
        slot=row.slot,
        time=row.created_at.strftime("%I:%M %p"),
        title=row.title,
        image_url=row.image_url,
        items=[PlateItem(key="packaged_food", grams=request.grams)],
        kcal=row.kcal,
        protein=row.protein,
        carbs=row.carbs,
        fat=row.fat,
        fiber=row.fiber,
    )
