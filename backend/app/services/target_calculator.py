"""Daily calorie and macro targets from a profile.

Deterministic on purpose: Mifflin-St Jeor BMR x an activity factor gives maintenance (TDEE), the goal
moves it up or down, protein is set per kg of body weight and fat as a share of calories. The AI
writes meal and workout plans *around* these numbers; it never chooses them.
"""

from app.schemas.nutrition import Targets
from app.schemas.profile import ComputedTargets, ProfileIn
from app.services.goals_service import LIMITS
from app.services.nutrition_calculator import round_half_up

# Physical Activity Level for the day job / general movement; each weekly gym day adds a little.
ACTIVITY_FACTORS = {"desk": 1.2, "light": 1.375, "active": 1.55, "very_active": 1.725}
GYM_DAY_FACTOR = 0.025

# kcal relative to maintenance, protein (g per kg body weight), fat (share of calories).
GOAL_RULES = {
    "lose": {"delta": -400, "protein_per_kg": 2.0, "fat_share": 0.25},
    "gain": {"delta": +300, "protein_per_kg": 1.8, "fat_share": 0.30},
    "strength": {"delta": 0, "protein_per_kg": 1.8, "fat_share": 0.28},
}
# Never prescribe below these, whatever the formula says (general dietary guidance floors).
KCAL_FLOOR = {"male": 1500, "female": 1200}
MIN_CARBS_G = 50
KCAL_PER_KG_FAT = 7700

PLAN_KEY = "profile"  # DailyGoals.plan_key when the targets come from the profile


def bmr_mifflin(sex: str, age: int, height_cm: float, weight_kg: float) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "male" else base - 161


def activity_factor(activity: str, gym: bool, gym_days: int) -> float:
    return ACTIVITY_FACTORS[activity] + (GYM_DAY_FACTOR * gym_days if gym else 0)


def bmi(height_cm: float, weight_kg: float) -> tuple[float, str]:
    value = weight_kg / (height_cm / 100) ** 2
    if value < 18.5:
        label = "Underweight"
    elif value < 25:
        label = "Healthy"
    elif value < 30:
        label = "Overweight"
    else:
        label = "Obese"
    return round(value, 1), label


def compute(profile: ProfileIn) -> ComputedTargets:
    rules = GOAL_RULES[profile.goal]
    bmr = bmr_mifflin(profile.sex, profile.age, profile.height_cm, profile.weight_kg)
    tdee = bmr * activity_factor(profile.activity, profile.gym, profile.gym_days)

    kcal = tdee + rules["delta"] + profile.kcal_adjust
    kcal = max(KCAL_FLOOR[profile.sex], kcal)
    kcal = int(round_half_up(kcal / 10) * 10)
    kcal = max(LIMITS["kcal"][0], min(LIMITS["kcal"][1], kcal))

    protein = int(round_half_up(rules["protein_per_kg"] * profile.weight_kg))
    fat = int(round_half_up(kcal * rules["fat_share"] / 9))
    carbs = max(MIN_CARBS_G, int(round_half_up((kcal - protein * 4 - fat * 9) / 4)))
    protein, carbs, fat = (max(LIMITS[n][0], min(LIMITS[n][1], v)) for n, v in (("protein", protein), ("carbs", carbs), ("fat", fat)))

    weekly_change = (kcal - tdee) * 7 / KCAL_PER_KG_FAT
    weeks_to_target = None
    if profile.target_weight_kg is not None and abs(weekly_change) > 0.01:
        gap = profile.target_weight_kg - profile.weight_kg
        if gap * weekly_change > 0:  # the plan moves towards the target
            weeks_to_target = int(round_half_up(gap / weekly_change))

    delta = kcal - tdee
    if abs(delta) < 50:
        note = "At maintenance: your weight should hold steady."
    else:
        direction = "below" if delta < 0 else "above"
        note = f"{abs(int(delta))} kcal {direction} maintenance, about {abs(weekly_change):.2f} kg per week."

    return ComputedTargets(
        bmr=int(round_half_up(bmr)),
        tdee=int(round_half_up(tdee)),
        kcal=kcal,
        protein=protein,
        carbs=carbs,
        fat=fat,
        weekly_change_kg=round(weekly_change, 2),
        weeks_to_target=weeks_to_target,
        note=note,
    )


def as_targets(computed: ComputedTargets) -> Targets:
    return Targets(plan_key=PLAN_KEY, kcal=computed.kcal, protein=computed.protein, carbs=computed.carbs, fat=computed.fat)
