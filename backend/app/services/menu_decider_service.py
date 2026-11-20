import json
import logging
from typing import List, Optional
from google import genai
from google.genai import types

from app.config import get_settings
from app.schemas.menu_decider import DeciderMenuItem, MenuDeciderResponse, DeciderSampleMenu

logger = logging.getLogger(__name__)

SAMPLE_MENUS = [
    DeciderSampleMenu(
        id="south_indian_veg",
        restaurant_name="Aaryas Veg Delights",
        cuisine="South Indian Vegetarian",
        icon="🍌",
        sample_text="""
- Plain Dosa with Chutney & Sambar (₹70)
- Ghee Podi Masala Dosa (₹130)
- Idli Vada Combo (2 Idli, 1 Medu Vada) (₹80)
- Curd Rice with Pomegranate & Pickle (₹90)
- Paneer Butter Masala with 2 Butter Naan (₹240)
- South Indian Special Thali (Rice, Sambar, Rasam, Kootu, Poriyal, Appalam, Payasam) (₹180)
- Filter Coffee (₹35)
"""
    ),
    DeciderSampleMenu(
        id="chettinad_non_veg",
        restaurant_name="Madurai Muniyandi Vilas",
        cuisine="Chettinad Non-Veg",
        icon="🍗",
        sample_text="""
- Chettinad Chicken Biryani with Boiled Egg & Raita (₹220)
- Tandoori Chicken Half (4 pieces with mint chutney) (₹260)
- Pepper Chicken Dry Fry (₹190)
- Mutton Chukka Varuval (₹290)
- Plain Chapati (2 pcs) with Chicken Salna (₹90)
- Crispy Chicken Lollipop (6 pcs) with Mayo (₹210)
- Kal Dosa (2 pcs) with Fish Curry Gravy (₹110)
"""
    ),
    DeciderSampleMenu(
        id="dhaba_tandoori",
        restaurant_name="Punjab Grill & Tandoor",
        cuisine="North Indian Dhaba",
        icon="🥘",
        sample_text="""
- Tandoori Paneer Tikka (6 skewers) with Green Chutney (₹240)
- Dal Tadka (Yellow Dal with Jeera tadka) (₹160)
- Dal Makhani (Cream & Butter slow cooked) (₹210)
- Tandoori Roti without Butter (₹20)
- Butter Garlic Naan (₹60)
- Murgh Malai Tikka (Boneless Chicken in creamy cashew marinade) (₹310)
- Sweet Punjabi Lassi (₹80)
"""
    ),
    DeciderSampleMenu(
        id="cafe_bites",
        restaurant_name="Urban Cafe & Grill",
        cuisine="Cafe & Fast Casual",
        icon="🥪",
        sample_text="""
- Grilled Chicken Salad with olive oil & honey mustard (₹280)
- Peri Peri French Fries with Cheese Dip (₹160)
- Classic Veggie Burger with Potato Patty & Mayo (₹180)
- Grilled Paneer Sandwich in Brown Bread (₹190)
- Creamy Alfredo White Sauce Pasta with Chicken (₹320)
- Cold Brew Black Coffee / Iced Green Tea (₹140)
- Double Chocolate Brownie with Vanilla Ice Cream (₹190)
"""
    ),
]


def _heuristic_classify_dish(name: str, remaining_kcal: int, remaining_protein: float) -> DeciderMenuItem:
    """Offline heuristic engine when Gemini is unavailable or for rapid parsing."""
    nl = name.lower()
    kcal = 350
    protein = 12.0
    carbs = 40.0
    fat = 14.0
    category = "Main"
    hack = None

    if "tandoori chicken" in nl or "chicken tikka" in nl:
        kcal = 320
        protein = 38.0
        carbs = 6.0
        fat = 12.0
        category = "Starter"
        hack = "Rich in lean protein and grilled without heavy batter!"
    elif "biryani" in nl:
        kcal = 680
        protein = 24.0
        carbs = 78.0
        fat = 28.0
        hack = "Eat half the rice portion, finish the chicken piece and raita for protein."
    elif "idli" in nl and "vada" not in nl:
        kcal = 180
        protein = 6.0
        carbs = 36.0
        fat = 2.0
        category = "Main"
        hack = "Steamed, virtually zero oil. Double up on sambar for lentil protein."
    elif "vada" in nl:
        kcal = 320
        protein = 7.0
        carbs = 26.0
        fat = 22.0
        category = "Starter"
        hack = "Deep fried in oil; limit to 1 piece or skip for steamed idli."
    elif "paneer tikka" in nl:
        kcal = 360
        protein = 22.0
        carbs = 10.0
        fat = 24.0
        category = "Starter"
        hack = "Excellent vegetarian protein choice, grilled with spices."
    elif "paneer butter masala" in nl or "dal makhani" in nl or "alfredo" in nl:
        kcal = 580
        protein = 14.0
        carbs = 28.0
        fat = 44.0
        hack = "High saturated butter/cream. Ask for Dal Tadka or Roti instead."
    elif "dosa" in nl and ("ghee" in nl or "masala" in nl):
        kcal = 460
        protein = 7.0
        carbs = 58.0
        fat = 22.0
        hack = "Opt for plain or Kal Dosa without excess ghee."
    elif "dosa" in nl:
        kcal = 310
        protein = 6.0
        carbs = 46.0
        fat = 10.0
        hack = "Enjoy with vegetable sambar."
    elif "salad" in nl:
        kcal = 280
        protein = 26.0
        carbs = 14.0
        fat = 12.0
        category = "Main"
        hack = "Request dressing on the side to save 120+ kcal."
    elif "fries" in nl or "lollipop" in nl or "burger" in nl:
        kcal = 520
        protein = 10.0
        carbs = 60.0
        fat = 28.0
        category = "Starter"
        hack = "Deep fried item with processed mayo. Share with friends."
    elif "roti" in nl or "chapati" in nl:
        kcal = 160
        protein = 5.0
        carbs = 30.0
        fat = 3.0
        category = "Bread"
        hack = "Whole wheat fiber without butter; pair with protein curry."
    elif "naan" in nl:
        kcal = 320
        protein = 7.0
        carbs = 52.0
        fat = 11.0
        category = "Bread"
        hack = "Refined flour (maida). Swap for Tandoori Roti to cut carbs."
    elif "coffee" in nl or "tea" in nl or "lassi" in nl:
        kcal = 140 if "lassi" in nl else 80
        protein = 3.0
        carbs = 18.0
        fat = 4.0
        category = "Beverage"
        hack = "Ask for less sugar or buttermilk (chaas)."
    elif "thali" in nl:
        kcal = 750
        protein = 18.0
        carbs = 110.0
        fat = 26.0
        hack = "Control rice quantity; eat kootu, poriyal and rasam first."

    # Fit Verdict calculation relative to user remaining budget
    if kcal <= remaining_kcal and (protein >= 15 or kcal < 300):
        verdict = "green"
        badge = "Best Diet Fit"
        reason = f"Fits comfortably inside your {remaining_kcal} kcal remaining budget with good nutrition profile."
    elif kcal <= remaining_kcal + 150:
        verdict = "yellow"
        badge = "Moderate Portion"
        reason = f"Slightly calorie dense ({kcal} kcal). Eat mindful portion or share half to stay within target."
    else:
        verdict = "red"
        badge = "Budget Breaker"
        reason = f"High calorie density ({kcal} kcal) exceeding or exhausting your {remaining_kcal} kcal remaining limit."

    return DeciderMenuItem(
        name=name.strip("- *•"),
        category=category,
        estimated_kcal=kcal,
        estimated_protein=protein,
        estimated_carbs=carbs,
        estimated_fat=fat,
        fit_verdict=verdict,
        verdict_badge=badge,
        fit_reason=reason,
        smart_hack=hack,
    )


def analyze_menu_with_ai(
    menu_text: Optional[str],
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/jpeg",
    remaining_kcal: int = 600,
    remaining_protein: float = 30.0,
    diet_pref: str = "any",
) -> MenuDeciderResponse:
    """Analyze restaurant menu using Gemini 3.6 Flash Vision / NLP or heuristic fallback."""
    settings = get_settings()
    api_key = settings.gemini_api_key

    if not api_key:
        logger.info("Gemini key not configured; using heuristic restaurant menu decider.")
        return _fallback_decider(menu_text, remaining_kcal, remaining_protein)

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_s * 1000),
        )

        prompt = f"""
You are NutriScan AI's Expert Restaurant Diet Decider & Menu Auditor.
The user is at a restaurant or ordering food online.
Their current remaining nutrition budget for today is:
- Remaining Calories: {remaining_kcal} kcal
- Remaining Protein Target: {remaining_protein}g
- Diet Preference: {diet_pref}

TASK:
1. Extract dishes from the provided menu (image or text).
2. For each dish, provide accurate estimated calories, protein (g), carbs (g), and fat (g).
3. Assign a strict traffic-light classification based on their remaining budget of {remaining_kcal} kcal:
   - "green": Best Diet Fit (comfortably fits in budget, high protein/micronutrients, low junk)
   - "yellow": Moderate / Share (calorie dense, okay if eaten in half portion or shared)
   - "red": Budget Breaker (exceeds budget, deep-fried, excessive butter/sugar/oil)
4. Give a practical Indian restaurant ordering tip/hack for that dish.
5. Provide top 3 overall restaurant ordering hacks (e.g. asking for gravies separately, swapping naan with tandoori roti).

OUTPUT FORMAT: Strict valid JSON only, without markdown fences:
{{
  "cuisine_detected": "South Indian / North Indian / Chettinad / Cafe / etc.",
  "dishes": [
    {{
      "name": "Tandoori Chicken Half",
      "price": "₹260",
      "category": "Starter",
      "estimated_kcal": 320,
      "estimated_protein": 38.0,
      "estimated_carbs": 6.0,
      "estimated_fat": 12.0,
      "fit_verdict": "green",
      "verdict_badge": "Best Diet Fit",
      "fit_reason": "High lean protein, fits your remaining budget with 280 kcal to spare.",
      "smart_hack": "Ask for mint chutney without heavy mayo; skinless cuts save fat."
    }}
  ],
  "top_recommended_dish": "Tandoori Chicken Half with side green salad",
  "ai_verdict_summary": "Great options available! Stick to grilled starters and tandoori breads to stay well under your daily limit.",
  "smart_ordering_tips": [
    "Ask for gravies and dressings on the side to prevent excess oil consumption.",
    "Swap butter naan for plain tandoori roti or phulka to save 160 kcal per bread.",
    "Choose salted mint buttermilk (chaas) instead of sweet lassi or sugary soda."
  ]
}}
"""

        contents = []
        if image_bytes:
            contents.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                )
            )
        if menu_text:
            contents.append(f"MENU TEXT:\n{menu_text}\n")
        contents.append(prompt)

        model_name = settings.gemini_model or "gemini-3.6-flash"
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw.rsplit("\n", 1)[0]
            raw = raw.strip()

        data = json.loads(raw)
        dishes = [DeciderMenuItem(**d) for d in data.get("dishes", [])]

        return MenuDeciderResponse(
            cuisine_detected=data.get("cuisine_detected", "Multi-Cuisine"),
            remaining_kcal_considered=remaining_kcal,
            remaining_protein_considered=remaining_protein,
            dishes=dishes,
            top_recommended_dish=data.get("top_recommended_dish", dishes[0].name if dishes else "Salad / Tandoori"),
            ai_verdict_summary=data.get("ai_verdict_summary", "Review your menu options below."),
            smart_ordering_tips=data.get("smart_ordering_tips", [
                "Swap white rice with phulka or millet.",
                "Order grilled/tandoori dishes over deep fried items.",
                "Drink water before the meal to prevent overeating.",
            ]),
        )

    except Exception as e:
        logger.warning("Gemini menu decider failed: %s; falling back to heuristic engine", e)
        return _fallback_decider(menu_text, remaining_kcal, remaining_protein)


def _fallback_decider(menu_text: Optional[str], remaining_kcal: int, remaining_protein: float) -> MenuDeciderResponse:
    lines = [l.strip() for l in (menu_text or "").split("\n") if l.strip()]
    if not lines:
        lines = [
            "Tandoori Chicken Half (4 pcs)",
            "Paneer Butter Masala with 2 Naan",
            "Dal Tadka with 2 Tandoori Roti",
            "Chicken Biryani with Raita",
            "Medu Vada (2 pcs) with Chutney",
        ]

    dishes = [_heuristic_classify_dish(line, remaining_kcal, remaining_protein) for line in lines[:10]]

    # Find the top green dish or best dish
    green_dishes = [d for d in dishes if d.fit_verdict == "green"]
    top_dish = green_dishes[0].name if green_dishes else dishes[0].name

    return MenuDeciderResponse(
        cuisine_detected="Indian Restaurant Specials",
        remaining_kcal_considered=remaining_kcal,
        remaining_protein_considered=remaining_protein,
        dishes=dishes,
        top_recommended_dish=top_dish,
        ai_verdict_summary=f"Found {len(green_dishes)} ideal dishes that fit inside your {remaining_kcal} kcal remaining target!",
        smart_ordering_tips=[
            "Ask the server for gravies/sauces on the side to cut hidden butter & oil.",
            "Choose tandoori/grilled items instead of batter-fried appetizers.",
            "Swap refined maida naans with whole wheat tandoori rotis or phulkas.",
            "Start with clear soup, cucumber salad, or buttermilk to control hunger.",
        ],
    )
