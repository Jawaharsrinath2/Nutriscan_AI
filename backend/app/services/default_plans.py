"""Template plans used when the AI writer is unavailable. Built from the person's own targets and the dish catalogue."""

from app.schemas.food import PlateItem
from app.schemas.nutrition import Targets
from app.schemas.plans import DietPlanContent, Exercise, PlanFood, PlanMeal, WorkoutDay, WorkoutPlanContent
from app.schemas.profile import ProfileIn
from app.services.food_repository import FoodRepository
from app.services.nutrition_calculator import meal_totals, round_half_up

NONVEG_KEYS = {"chettinad_chicken", "meen_kuzhambu", "grilled_chicken", "grilled_salmon", "burger_patty_bun"}
EGG_KEYS = {"boiled_egg"}

# Share of the day's calories per meal and the dish presets that suit each slot (first match that fits the diet wins).
SLOTS = [
    ("Breakfast", "8:00 AM", 0.25, ["idli_sambar", "masala_dosa", "ven_pongal", "oats_berry_bowl", "ragi_dosa", "uttapam"]),
    ("Lunch", "1:00 PM", 0.35, ["south_indian_meals", "paneer_thali", "chicken_quinoa_bowl", "sambar_rice", "curd_rice"]),
    ("Evening Snack", "5:00 PM", 0.15, ["oats_berry_bowl", "idli_sambar", "uttapam", "steamed_white_rice"]),
    ("Dinner", "8:00 PM", 0.25, ["idiyappam", "lemon_rice", "chapati_curry", "ragi_dosa", "idli_sambar", "paneer_thali"]),
]


def _allowed(dish: dict, diet_pref: str) -> bool:
    keys = {item["key"] for item in dish["items"]}
    if diet_pref == "veg":
        return not (keys & (NONVEG_KEYS | EGG_KEYS))
    if diet_pref == "eggetarian":
        return not (keys & NONVEG_KEYS)
    return True


def _pick(repo: FoodRepository, candidates: list[str], diet_pref: str) -> tuple[str, dict]:
    for key in candidates:
        dish = repo.dishes.get(key)
        if dish and _allowed(dish, diet_pref):
            return key, dish
    key = next(k for k, d in repo.dishes.items() if _allowed(d, diet_pref))
    return key, repo.dishes[key]


def diet_plan(profile: ProfileIn, targets: Targets, repo: FoodRepository) -> DietPlanContent:
    """Four preset dishes scaled so the day lands on the calorie target."""
    meals = []
    for slot, time, share, candidates in SLOTS:
        _, dish = _pick(repo, candidates, profile.diet_pref)
        base = meal_totals([PlateItem(**i) for i in dish["items"]], repo)
        scale = (targets.kcal * share) / base.kcal if base.kcal else 1.0
        scale = max(0.5, min(2.0, scale))
        items = [
            PlanFood(
                name=repo.ingredient(i["key"])["name"],
                portion=f"{int(round_half_up(i['grams'] * scale / 5) * 5)} g",
                kcal=round_half_up(repo.ingredient(i["key"])["kcal"] * i["grams"] * scale / 100),
                protein=round_half_up(repo.ingredient(i["key"])["protein"] * i["grams"] * scale / 100),
            )
            for i in dish["items"]
        ]
        meals.append(
            PlanMeal(
                slot=slot,
                time=time,
                items=items,
                kcal=sum(f.kcal for f in items),
                protein=sum(f.protein for f in items),
                note=f"Based on '{dish['title']}', portions scaled to {int(share * 100)}% of your day.",
            )
        )
    total_protein = sum(m.protein for m in meals)
    tips = [
        "Weigh rice and dal portions for the first week; eyeballing is usually 30% out.",
        "Fill half the plate with vegetables (poriyal, kootu, salad) before adding rice.",
        "Drink water before meals and keep sweets to one small piece after lunch.",
    ]
    if total_protein < targets.protein:
        tips.insert(0, f"This template reaches about {total_protein} g protein; add curd, dal, paneer, eggs or whey to reach {targets.protein} g.")
    return DietPlanContent(
        summary=f"A {targets.kcal} kcal day built from four familiar South Indian meals, scaled to your targets. "
        "Generate an AI plan for one tailored to your preferences.",
        meals=meals,
        tips=tips,
        swaps=["Swap white rice for brown rice or millets at one meal.", "Swap fried snacks for sundal or roasted chana.", "Swap coconut chutney for tomato or mint chutney to cut fat."],
    )


# ── workouts ─────────────────────────────────────────────────────────────────

WARMUP = Exercise(name="Warm-up: 5 min brisk walk or cycling + arm/leg swings", sets=1, reps="5 min", rest="")

GYM_DAYS = {
    "Full body": ["Goblet squat", "Dumbbell bench press", "Seated cable row", "Romanian deadlift", "Plank"],
    "Upper": ["Barbell bench press", "Lat pulldown", "Overhead dumbbell press", "Seated row", "Bicep curl + tricep pushdown"],
    "Lower": ["Back squat", "Leg press", "Romanian deadlift", "Walking lunges", "Calf raise"],
    "Push": ["Barbell bench press", "Incline dumbbell press", "Overhead press", "Lateral raise", "Tricep pushdown"],
    "Pull": ["Deadlift", "Pull-up or lat pulldown", "Barbell row", "Face pull", "Hammer curl"],
    "Legs": ["Back squat", "Leg press", "Leg curl", "Bulgarian split squat", "Calf raise"],
}
HOME_DAYS = {
    "Full body (home)": ["Bodyweight squat", "Push-up (knees if needed)", "Reverse lunge", "Glute bridge", "Plank"],
    "Core & cardio (home)": ["Jumping jacks", "Mountain climbers", "Dead bug", "Bird dog", "Side plank"],
}
SPLITS = {1: ["Full body"], 2: ["Full body", "Full body"], 3: ["Full body", "Full body", "Full body"],
          4: ["Upper", "Lower", "Upper", "Lower"], 5: ["Push", "Pull", "Legs", "Upper", "Lower"],
          6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"], 7: ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Full body"]}
LEVEL = {"beginner": (3, "8-12", "90 sec", 45), "intermediate": (4, "6-10", "75 sec", 60), "advanced": (4, "5-8", "90 sec", 70)}
WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _spread(n: int) -> list[int]:
    """Indices of training days spread through the week (3 -> Mon/Wed/Fri)."""
    return [round(i * 7 / n) for i in range(n)] if n else []


def workout_plan(profile: ProfileIn) -> WorkoutPlanContent:
    if profile.gym:
        focuses, sets, reps, rest, minutes = SPLITS[max(1, profile.gym_days)], *LEVEL[profile.experience or "beginner"]
        menu = GYM_DAYS
        summary = f"A {profile.gym_days}-day {'/'.join(dict.fromkeys(focuses))} split for a {profile.experience} lifter aiming for {profile.goal}."
    elif profile.home_workouts:
        focuses, (sets, reps, rest, minutes), menu = ["Full body (home)", "Core & cardio (home)", "Full body (home)"], (3, "10-15", "45 sec", 25), HOME_DAYS
        summary = "Three short no-equipment sessions a week to build the habit; add a daily walk."
    else:
        focuses, (sets, reps, rest, minutes), menu = ["Full body (home)", "Core & cardio (home)"], (2, "8-12", "60 sec", 20), HOME_DAYS
        summary = "Two gentle sessions plus daily walking to start moving; progress to three when it feels easy."

    training = dict(zip(_spread(len(focuses)), focuses))
    days = []
    for i, name in enumerate(WEEK):
        if i in training:
            focus = training[i]
            exercises = [WARMUP] + [Exercise(name=e, sets=sets, reps=reps, rest=rest) for e in menu[focus]]
            days.append(WorkoutDay(day=name, focus=focus, duration_min=minutes, exercises=exercises))
        else:
            days.append(WorkoutDay(day=name, focus="Rest", duration_min=0, note="Walk 20-30 minutes if you can."))
    return WorkoutPlanContent(
        summary=summary + " Generate an AI plan for exercise choices tailored to you.",
        days=days,
        tips=["Add a little weight or a rep each week.", "Sleep 7-8 hours; that is where muscle is built.", "Stop a set with 1-2 reps left in the tank."],
        safety="Learn the squat and hinge pattern with light weight first; stop if you feel sharp joint pain.",
    )
