import json
import logging
from datetime import date
from typing import List
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import DailyGoals, MealLog, UserProfile
from app.schemas.chatbot import ChatMessage, ChatResponse, StarterPrompt

logger = logging.getLogger(__name__)

STARTER_PROMPTS = [
    StarterPrompt(
        id="remaining_dinner",
        icon="🍛",
        label="What to eat for dinner?",
        prompt="Enoda balance calories vachu inaiku night healthy-ah enna sapdalam?",
    ),
    StarterPrompt(
        id="protein_boost",
        icon="💪",
        label="Hit protein target",
        prompt="Enoda protein target innum achieve aagala. Best high protein Indian food options sollu machan.",
    ),
    StarterPrompt(
        id="evening_craving",
        icon="🍵",
        label="4 PM Snack Ideas",
        prompt="Saayanthram tea time la biscuit/samosa illama healthy-ah crispy snacks enna sapdalam?",
    ),
    StarterPrompt(
        id="cheat_meal",
        icon="🍕",
        label="Can I cheat today?",
        prompt="Inaiku friends kooda restaurant poren, oru cheat meal eduthukalama? En calorie budget allow pannuma?",
    ),
]


def _build_user_context(db: Session, user_id: int) -> dict:
    today = date.today()

    # User profile & target
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    target = db.query(DailyGoals).filter(DailyGoals.user_id == user_id).first()

    # Today's logged meals
    meals = db.query(MealLog).filter(MealLog.user_id == user_id, MealLog.day == today).all()

    consumed_kcal = sum(m.kcal or 0 for m in meals)
    consumed_protein = sum(m.protein or 0.0 for m in meals)
    consumed_carbs = sum(m.carbs or 0.0 for m in meals)
    consumed_fat = sum(m.fat or 0.0 for m in meals)

    target_kcal = target.kcal if target and target.kcal else 2000
    target_protein = float(target.protein) if target and target.protein else 120.0

    rem_kcal = max(0, target_kcal - consumed_kcal)
    rem_protein = max(0.0, target_protein - consumed_protein)

    meal_summary = []
    for m in meals:
        meal_summary.append(f"{m.slot}: {m.title} ({m.kcal} kcal, {m.protein}g protein)")

    return {
        "weight_kg": profile.weight_kg if profile else "Unknown",
        "height_cm": profile.height_cm if profile else "Unknown",
        "goal": profile.goal if profile else "General Fitness",
        "diet_type": profile.diet_pref if profile else "General",
        "target_kcal": target_kcal,
        "target_protein": target_protein,
        "consumed_kcal": consumed_kcal,
        "consumed_protein": round(consumed_protein, 1),
        "remaining_kcal": rem_kcal,
        "remaining_protein": round(rem_protein, 1),
        "logged_meals": meal_summary or ["No meals logged yet today"],
    }


def generate_nutritionist_reply(
    db: Session,
    user_id: int,
    messages: List[ChatMessage],
    language: str = "tanglish",
) -> ChatResponse:
    ctx = _build_user_context(db, user_id)
    last_user_query = messages[-1].content if messages else ""

    settings = get_settings()
    api_key = settings.gemini_api_key

    if not api_key:
        logger.info("Gemini key not configured; using smart offline nutritionist coach.")
        return _offline_nutritionist_reply(ctx, last_user_query)

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_s * 1000),
        )

        system_instruction = f"""
You are "NutriScan AI 24/7 Nutritionist & Diet Coach".
You speak in friendly, warm, knowledgeable TANGLISH (Tamil written strictly using English Latin letters, NO Tamil script characters) mixed naturally with English, like a friendly fitness bro/coach talking to a close friend ("machan", "super bro", "kavalaiye padatha"). If the user asks in pure English, respond in clean, empathetic English with subtle Indian warmth.

USER'S LIVE BIOMETRICS & TODAY'S LOGS:
- Goal: {ctx['goal']}
- Weight: {ctx['weight_kg']} kg | Height: {ctx['height_cm']} cm
- Diet Preference: {ctx['diet_type']}
- Daily Target: {ctx['target_kcal']} kcal, {ctx['target_protein']}g protein
- Consumed Today: {ctx['consumed_kcal']} kcal, {ctx['consumed_protein']}g protein
- Remaining Budget: {ctx['remaining_kcal']} kcal, {ctx['remaining_protein']}g protein
- Meals Logged Today: {', '.join(ctx['logged_meals'])}

RULES:
1. Always ground your advice on their REMAINING {ctx['remaining_kcal']} kcal and {ctx['remaining_protein']}g protein.
2. Recommend realistic Indian and South Indian food choices (e.g. boiled eggs, curd, paneer, chana sundal, idli, tandoori chicken, moong dal chilla, roasted makhana, buttermilk).
3. Be supportive, motivating, never harsh or robotic. Keep paragraphs short and easy to read on mobile.
4. Provide 2-3 short, relevant follow-up prompt questions the user can tap next.

OUTPUT JSON FORMAT (strictly valid JSON without markdown fences):
{{
  "reply": "Your response in natural Tanglish...",
  "suggested_followups": [
    "Follow-up question 1?",
    "Follow-up question 2?"
  ]
}}
"""

        conversation_history = "\n".join(
            f"{m.role.upper()}: {m.content}" for m in messages
        )

        model_name = settings.gemini_model or "gemini-3.6-flash"
        response = client.models.generate_content(
            model=model_name,
            contents=[system_instruction, f"\nConversation:\n{conversation_history}\nASSISTANT:"],
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw.rsplit("\n", 1)[0]
            raw = raw.strip()

        data = json.loads(raw)
        return ChatResponse(
            reply=data.get("reply", "Machan, super question! Your diet targets are on track."),
            suggested_followups=data.get("suggested_followups", [
                "Inaiku water target achieve panna tips sollu?",
                "Next meal enna plan pannalam?",
            ]),
        )

    except Exception as e:
        logger.warning("Gemini nutritionist chat failed: %s; using fallback coach.", e)
        return _offline_nutritionist_reply(ctx, last_user_query)


def _offline_nutritionist_reply(ctx: dict, query: str) -> ChatResponse:
    ql = query.lower()
    rem_k = ctx["remaining_kcal"]
    rem_p = ctx["remaining_protein"]

    if "dinner" in ql or "night" in ql:
        reply = (
            f"Machan, inaiku unaku remaining {rem_k} kcal and {rem_p}g protein iruku! "
            f"Night ku best dinner option: 2 Phulkas with Dal Tadka or 150g Grilled Paneer/Chicken tikka. "
            f"Idhula carb control-ah irukum, and unoda {rem_p}g protein target-um easily reach aaidum. "
            f"Thoongurathuku 2 hours munnadiye saaptu mudichiru!"
        )
        followups = [
            "Paneer ku badhila soya chunks edukalama?",
            "Late night cravings vandha enna pannalam?",
        ]
    elif "protein" in ql:
        reply = (
            f"Bro, unoda protein target ku innum {rem_p}g balance iruku! "
            f"Best options: 3 Boiled Egg whites + 1 Whole egg (20g protein, ~170 kcal), "
            f"illana 1 cup Greek Yogurt / Hung Curd or 150g Paneer/Tofu. "
            f"Non-veg na Tandoori Chicken breast is ultimate—zero oil, pure protein!"
        )
        followups = [
            "Vegetarian la high protein snacks enna?",
            "Protein shake eppo kudikanum?",
        ]
    elif "snack" in ql or "cravings" in ql:
        reply = (
            f"Saayanthram tea time la deep-fried bajjis skip pannitu, "
            f"1 cup Roasted Makhana (Foxnuts) with turmeric and pink salt, or "
            f"Boiled Chana / Peanuts sundal eduthuko machan. "
            f"High fiber, super crunch, and only ~120 calories dhaan varum!"
        )
        followups = [
            "Black coffee with jaggery healthy ah?",
            "Night dinner ku light ah enna sapdalam?",
        ]
    elif "cheat" in ql:
        if rem_k >= 700:
            reply = (
                f"Machan, today unaku {rem_k} kcal budget iruku, so moderate-ah oru single cheat dish "
                f"(like 2 slices pizza or biryani) enjoy pannalam! But heavy dessert and sugary soda skip pannidu, "
                f"and balance meal la salad/protein add pannu."
            )
        else:
            reply = (
                f"Bro, inaiku unaku remaining {rem_k} kcal dhaan iruku. "
                f"Heavy cheat meal poita calorie surplus aaidum. Better to take a clean high-protein cheat "
                f"like Grilled Chicken Biryani in small portion or Paneer Tikka wrap!"
            )
        followups = [
            "Cheat meal ku aprm water intake evlo irukanum?",
            "Tomorrow workout la extra burn pannalama?",
        ]
    else:
        reply = (
            f"Machan, unoda current status: Today consumed {ctx['consumed_kcal']} kcal, "
            f"remaining budget {rem_k} kcal and {rem_p}g protein! "
            f"Goal: {ctx['goal']}. Enna doubt unaku? Meal planning, food swaps, or craving hacks edhavadhu kekalama!"
        )
        followups = [
            "Inaiku dinner ku enna sapdalam?",
            "High protein veg snacks sollu?",
            "Water target eppadi complete panradhu?",
        ]

    return ChatResponse(reply=reply, suggested_followups=followups)
