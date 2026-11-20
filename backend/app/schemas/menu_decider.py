from typing import List, Optional
from pydantic import BaseModel, Field

class DeciderMenuItem(BaseModel):
    name: str
    price: Optional[str] = None
    category: Optional[str] = "Main"  # Starter, Main, Bread, Beverage, Dessert
    estimated_kcal: int
    estimated_protein: float
    estimated_carbs: float
    estimated_fat: float
    fit_verdict: str  # "green" (Best Fit), "yellow" (Moderate / Share), "red" (Target Breaker)
    verdict_badge: str  # "Best Diet Fit", "Moderate Portion", "Budget Breaker"
    fit_reason: str
    smart_hack: Optional[str] = None

class MenuDeciderRequest(BaseModel):
    menu_text: Optional[str] = None
    remaining_kcal: Optional[int] = 600
    remaining_protein: Optional[float] = 30.0
    diet_preference: Optional[str] = "any"  # "veg", "non_veg", "high_protein", "low_carb"

class MenuDeciderResponse(BaseModel):
    cuisine_detected: str
    remaining_kcal_considered: int
    remaining_protein_considered: float
    dishes: List[DeciderMenuItem]
    top_recommended_dish: str
    ai_verdict_summary: str
    smart_ordering_tips: List[str]

class DeciderSampleMenu(BaseModel):
    id: str
    restaurant_name: str
    cuisine: str
    icon: str
    sample_text: str
