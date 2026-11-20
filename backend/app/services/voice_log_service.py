"""Tanglish Voice Meal Logger Service.

Parses voice transcripts spoken in casual Tanglish, Tamil, or English into structured
dishes, realistic gram estimates, macros, meal slots, and logs directly into daily targets.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import MealLog
from app.schemas.meal import LoggedMeal, PlateItem, MealSlot
from app.schemas.voice_log import (
    ConfirmVoiceMealRequest,
    VoiceFoodItem,
    VoiceParseRequest,
    VoiceParseResponse,
)

logger = logging.getLogger(__name__)

# Fallback heuristic catalogue for offline testing or instant fallback
OFFLINE_DISH_LOOKUP = [
    {
        "patterns": [r"idli", r"idly"],
        "name": "Idli",
        "default_qty": "2 pieces",
        "default_grams": 100.0,
        "kcal": 130,
        "protein": 4.0,
        "carbs": 26.0,
        "fat": 0.8,
        "fiber": 2.0,
    },
    {
        "patterns": [r"vada", r"vadai"],
        "name": "Medu Vada",
        "default_qty": "1 piece",
        "default_grams": 50.0,
        "kcal": 145,
        "protein": 3.5,
        "carbs": 14.0,
        "fat": 8.5,
        "fiber": 1.5,
    },
    {
        "patterns": [r"dosa", r"dosai", r"roast", r"masala\s*dosa"],
        "name": "Crispy Dosa",
        "default_qty": "1 piece",
        "default_grams": 120.0,
        "kcal": 168,
        "protein": 3.9,
        "carbs": 29.0,
        "fat": 3.7,
        "fiber": 1.2,
    },
    {
        "patterns": [r"sambar", r"saambar"],
        "name": "Vegetable Sambar",
        "default_qty": "1 small bowl (100ml)",
        "default_grams": 100.0,
        "kcal": 75,
        "protein": 3.0,
        "carbs": 11.0,
        "fat": 2.1,
        "fiber": 2.5,
    },
    {
        "patterns": [r"chutney", r"coconut\s*chutney"],
        "name": "Coconut Chutney",
        "default_qty": "2 tbsp (40g)",
        "default_grams": 40.0,
        "kcal": 85,
        "protein": 1.2,
        "carbs": 3.5,
        "fat": 7.5,
        "fiber": 1.8,
    },
    {
        "patterns": [r"filter\s*coffee", r"coffee", r"kaapi"],
        "name": "South Indian Filter Coffee",
        "default_qty": "1 cup (120ml)",
        "default_grams": 120.0,
        "kcal": 70,
        "protein": 2.5,
        "carbs": 8.0,
        "fat": 3.0,
        "fiber": 0.0,
    },
    {
        "patterns": [r"tea", r"chai"],
        "name": "Milk Tea (Chai)",
        "default_qty": "1 cup (120ml)",
        "default_grams": 120.0,
        "kcal": 65,
        "protein": 2.0,
        "carbs": 9.0,
        "fat": 2.2,
        "fiber": 0.0,
    },
    {
        "patterns": [r"biryani", r"briyani", r"biriyani"],
        "name": "Chicken Biryani",
        "default_qty": "1 plate (350g)",
        "default_grams": 350.0,
        "kcal": 550,
        "protein": 28.0,
        "carbs": 65.0,
        "fat": 18.0,
        "fiber": 4.0,
    },
    {
        "patterns": [r"egg", r"boiled\s*egg", r"muttai"],
        "name": "Boiled Egg",
        "default_qty": "1 whole egg",
        "default_grams": 50.0,
        "kcal": 78,
        "protein": 6.3,
        "carbs": 0.6,
        "fat": 5.3,
        "fiber": 0.0,
    },
    {
        "patterns": [r"raita", r"thayir\s*pachadi"],
        "name": "Onion Raita",
        "default_qty": "1 cup (100g)",
        "default_grams": 100.0,
        "kcal": 60,
        "protein": 3.2,
        "carbs": 5.0,
        "fat": 3.0,
        "fiber": 0.8,
    },
    {
        "patterns": [r"chapati", r"chappathi", r"roti"],
        "name": "Whole Wheat Chapati",
        "default_qty": "2 pieces",
        "default_grams": 80.0,
        "kcal": 160,
        "protein": 5.5,
        "carbs": 30.0,
        "fat": 2.0,
        "fiber": 4.5,
    },
    {
        "patterns": [r"rice", r"satham", r"white\s*rice"],
        "name": "Steamed White Rice",
        "default_qty": "1 bowl (150g)",
        "default_grams": 150.0,
        "kcal": 195,
        "protein": 4.1,
        "carbs": 43.0,
        "fat": 0.4,
        "fiber": 0.6,
    },
    {
        "patterns": [r"curd", r"thayir", r"yogurt"],
        "name": "Fresh Curd (Dahi)",
        "default_qty": "1 cup (150g)",
        "default_grams": 150.0,
        "kcal": 95,
        "protein": 5.0,
        "carbs": 6.5,
        "fat": 5.0,
        "fiber": 0.0,
    },
    {
        "patterns": [r"samosa", r"samoosa"],
        "name": "Vegetable Samosa",
        "default_qty": "2 pieces (100g)",
        "default_grams": 100.0,
        "kcal": 260,
        "protein": 4.5,
        "carbs": 30.0,
        "fat": 14.0,
        "fiber": 2.5,
    },
    {
        "patterns": [r"paneer", r"paneer\s*butter\s*masala"],
        "name": "Paneer Curry",
        "default_qty": "1 bowl (150g)",
        "default_grams": 150.0,
        "kcal": 280,
        "protein": 12.0,
        "carbs": 10.0,
        "fat": 21.0,
        "fiber": 2.0,
    },
]


def _infer_slot_from_text(text: str) -> MealSlot:
    t = text.lower()
    if any(k in t for k in ["kaalai", "kalai", "morning", "breakfast", "tiffin"]):
        return "Breakfast"
    if any(k in t for k in ["madhiyam", "madhyam", "noon", "afternoon", "lunch"]):
        return "Lunch"
    if any(k in t for k in ["evening", "snack", "tea time", "chaai", "kaapi"]):
        return "Evening Snack"
    if any(k in t for k in ["night", "dinner", "raathiri", "rathiri"]):
        return "Dinner"

    # Default to current hour
    hour = datetime.now().hour
    if hour < 11:
        return "Breakfast"
    if hour < 16:
        return "Lunch"
    if hour < 19:
        return "Evening Snack"
    return "Dinner"


def parse_transcript_heuristically(transcript: str) -> VoiceParseResponse:
    """Fast offline fallback parser for common Indian and Tanglish phrases."""
    t_lower = transcript.lower()
    detected_items: list[VoiceFoodItem] = []

    for dish in OFFLINE_DISH_LOOKUP:
        matched = False
        for p in dish["patterns"]:
            if re.search(r"\b" + p + r"\b", t_lower):
                matched = True
                break

        if matched:
            # Check if there is a number before the word (e.g. "3 idli", "2 chapati")
            multiplier = 1.0
            num_match = re.search(r"(\d+)\s*(?:" + "|".join(dish["patterns"]) + r")", t_lower)
            if num_match:
                try:
                    count = int(num_match.group(1))
                    if "piece" in dish["default_qty"]:
                        multiplier = count / (2.0 if "2" in dish["default_qty"] else 1.0)
                    else:
                        multiplier = float(count)
                except ValueError:
                    pass

            multiplier = max(0.5, min(5.0, multiplier))
            qty_desc = f"{int(multiplier)} serving" if multiplier != 1.0 else dish["default_qty"]
            grams = round(dish["default_grams"] * multiplier)
            kcal = round(dish["kcal"] * multiplier)
            protein = round(dish["protein"] * multiplier, 1)
            carbs = round(dish["carbs"] * multiplier, 1)
            fat = round(dish["fat"] * multiplier, 1)
            fiber = round(dish["fiber"] * multiplier, 1)

            detected_items.append(
                VoiceFoodItem(
                    name=dish["name"],
                    quantity_description=qty_desc,
                    grams=grams,
                    kcal=kcal,
                    protein=protein,
                    carbs=carbs,
                    fat=fat,
                    fiber=fiber,
                )
            )

    if not detected_items:
        # Fallback generic plate
        detected_items.append(
            VoiceFoodItem(
                name="Home-cooked Meal",
                quantity_description="1 standard plate (250g)",
                grams=250.0,
                kcal=320,
                protein=8.0,
                carbs=45.0,
                fat=10.0,
                fiber=3.5,
            )
        )

    slot = _infer_slot_from_text(transcript)
    total_kcal = sum(i.kcal for i in detected_items)
    total_protein = round(sum(i.protein for i in detected_items), 1)
    total_carbs = round(sum(i.carbs for i in detected_items), 1)
    total_fat = round(sum(i.fat for i in detected_items), 1)
    total_fiber = round(sum(i.fiber for i in detected_items), 1)

    title = " + ".join(i.name for i in detected_items[:3])

    return VoiceParseResponse(
        raw_transcript=transcript,
        meal_title=title,
        slot=slot,
        items=detected_items,
        total_kcal=total_kcal,
        total_protein=total_protein,
        total_carbs=total_carbs,
        total_fat=total_fat,
        total_fiber=total_fiber,
        ai_note=f"Parsed {len(detected_items)} items successfully! Clean meal with {total_protein}g protein.",
    )


async def parse_voice_transcript(
    request: VoiceParseRequest,
    settings: Settings,
) -> VoiceParseResponse:
    """Uses Gemini 3.6 Flash to parse natural Tanglish / Tamil / English speech into structured meal data."""
    transcript = request.transcript.strip()
    if not transcript:
        raise ValueError("Transcript cannot be empty.")

    # If no API key configured, use rule-based parser
    if not settings.gemini_api_key:
        return parse_transcript_heuristically(transcript)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=20 * 1000))

    schema = {
        "type": "OBJECT",
        "properties": {
            "meal_title": {"type": "STRING"},
            "slot": {"type": "STRING", "enum": ["Breakfast", "Lunch", "Evening Snack", "Dinner"]},
            "items": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "name": {"type": "STRING"},
                        "quantity_description": {"type": "STRING"},
                        "grams": {"type": "NUMBER"},
                        "kcal": {"type": "INTEGER"},
                        "protein": {"type": "NUMBER"},
                        "carbs": {"type": "NUMBER"},
                        "fat": {"type": "NUMBER"},
                        "fiber": {"type": "NUMBER"},
                    },
                    "required": ["name", "quantity_description", "grams", "kcal", "protein", "carbs", "fat", "fiber"],
                },
            },
            "ai_note": {"type": "STRING"},
        },
        "required": ["meal_title", "slot", "items", "ai_note"],
    }

    prompt = (
        "You are NutriScan AI's expert Tamil / Tanglish / Indian food nutritionist and speech parser.\n"
        "The user spoke a food diary description in natural Tanglish (Tamil written in English alphabet), Tamil, or English.\n"
        f"User transcript: \"{transcript}\"\n\n"
        "Instructions:\n"
        "1. Understand Tamil food vocabulary: e.g. 'kaalaila' = morning/breakfast, 'madhiyam' = lunch, 'satham' = rice, 'thayir' = curd, 'muttai' = egg, 'saapten'/'saptuten' = I ate, 'kudichen' = I drank, 'oru cup' = one cup, 'rendu' = 2, 'moonu' = 3, 'naalu' = 4, 'aprm' = and then.\n"
        "2. Infer the meal slot accurately: 'Breakfast', 'Lunch', 'Evening Snack', or 'Dinner'.\n"
        "3. Decompose into individual distinct food items with realistic gram weights based on standard South Indian & Indian culinary servings.\n"
        "4. Calculate accurate nutritional values (kcal, protein, carbs, fat, fiber) for each item.\n"
        "5. Provide a friendly 1-2 sentence nutritionist comment in simple Tanglish or English as `ai_note`."
    )

    models_to_try = [settings.gemini_model, *settings.gemini_fallback_models]
    last_exc = None

    for model in models_to_try:
        try:
            resp = client.models.generate_content(
                model=model,
                contents=[prompt],
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema),
            )
            raw = json.loads(resp.text or "{}")

            items = [
                VoiceFoodItem(
                    name=i.get("name", "Food Item"),
                    quantity_description=i.get("quantity_description", "1 serving"),
                    grams=float(i.get("grams", 100)),
                    kcal=int(i.get("kcal", 100)),
                    protein=round(float(i.get("protein", 0.0)), 1),
                    carbs=round(float(i.get("carbs", 0.0)), 1),
                    fat=round(float(i.get("fat", 0.0)), 1),
                    fiber=round(float(i.get("fiber", 0.0)), 1),
                )
                for i in raw.get("items", [])
            ]

            if not items:
                return parse_transcript_heuristically(transcript)

            total_kcal = sum(i.kcal for i in items)
            total_protein = round(sum(i.protein for i in items), 1)
            total_carbs = round(sum(i.carbs for i in items), 1)
            total_fat = round(sum(i.fat for i in items), 1)
            total_fiber = round(sum(i.fiber for i in items), 1)

            slot = raw.get("slot")
            if slot not in ("Breakfast", "Lunch", "Evening Snack", "Dinner"):
                slot = _infer_slot_from_text(transcript)

            return VoiceParseResponse(
                raw_transcript=transcript,
                meal_title=raw.get("meal_title") or "Voice Logged Meal",
                slot=slot,  # type: ignore
                items=items,
                total_kcal=total_kcal,
                total_protein=total_protein,
                total_carbs=total_carbs,
                total_fat=total_fat,
                total_fiber=total_fiber,
                ai_note=raw.get("ai_note", "Parsed successfully!"),
            )
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini voice parse failed on %s: %s", model, exc)
            continue

    logger.warning("All Gemini models failed for voice parse, falling back to heuristics: %s", last_exc)
    return parse_transcript_heuristically(transcript)


def confirm_and_log_voice_meal(
    db: Session,
    user_id: int,
    request: ConfirmVoiceMealRequest,
) -> LoggedMeal:
    """Logs the voice-parsed meal directly to user's daily MealLog targets."""
    now = datetime.now()
    meal_id = uuid.uuid4().hex

    items_data = [
        {
            "key": "voice_item",
            "name": item.name,
            "grams": item.grams,
            "qty": item.quantity_description,
            "kcal": item.kcal,
            "protein": item.protein,
        }
        for item in request.items
    ]

    total_grams = sum(item.grams for item in request.items)

    row = MealLog(
        id=meal_id,
        user_id=user_id,
        day=now.date(),
        created_at=now,
        slot=request.slot,
        title=f"🎙️ {request.title}",
        image_url=None,
        items=items_data,
        kcal=request.kcal,
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
        items=[PlateItem(key="voice_item", grams=total_grams)],
        kcal=row.kcal,
        protein=row.protein,
        carbs=row.carbs,
        fat=row.fat,
        fiber=row.fiber,
    )
