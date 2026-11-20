import logging
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.models import MealLog, User
from app.db.session import get_db
from app.schemas.meal import LoggedMeal, PlateItem
from app.schemas.menu_decider import (
    DeciderSampleMenu,
    MenuDeciderRequest,
    MenuDeciderResponse,
)
from app.services.auth_service import get_current_user
from app.services.menu_decider_service import (
    SAMPLE_MENUS,
    analyze_menu_with_ai,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/menu-decider", tags=["restaurant-menu-decider"])


@router.get("/samples", response_model=List[DeciderSampleMenu])
def get_sample_menus():
    """Retrieve pre-built realistic Indian restaurant menus for quick testing."""
    return SAMPLE_MENUS


@router.post("/analyze", response_model=MenuDeciderResponse)
def analyze_menu_text_route(
    req: MenuDeciderRequest,
    current_user: User = Depends(get_current_user),
):
    """Analyze pasted menu text or dish list against user's remaining diet targets."""
    return analyze_menu_with_ai(
        menu_text=req.menu_text,
        remaining_kcal=req.remaining_kcal or 600,
        remaining_protein=req.remaining_protein or 30.0,
        diet_pref=req.diet_preference or "any",
    )


@router.post("/photo", response_model=MenuDeciderResponse)
async def analyze_menu_photo_route(
    file: UploadFile = File(...),
    remaining_kcal: int = Form(600),
    remaining_protein: float = Form(30.0),
    diet_pref: str = Form("any"),
    current_user: User = Depends(get_current_user),
):
    """Upload a restaurant menu photo or Swiggy/Zomato screenshot for AI vision OCR analysis."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit.")

    return analyze_menu_with_ai(
        menu_text=None,
        image_bytes=content,
        mime_type=file.content_type,
        remaining_kcal=remaining_kcal,
        remaining_protein=remaining_protein,
        diet_pref=diet_pref,
    )


@router.post("/log")
def log_restaurant_dish_route(
    dish_name: str = Form(...),
    slot: str = Form("Dinner"),
    kcal: int = Form(...),
    protein: float = Form(...),
    carbs: float = Form(0.0),
    fat: float = Form(0.0),
    fiber: float = Form(0.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log an approved green/moderate restaurant dish directly into today's diary."""
    now = datetime.now()
    meal_id = uuid.uuid4().hex

    items_data = [
        {
            "key": "restaurant_dish",
            "name": dish_name,
            "grams": 250.0,
            "qty": "1 serving",
            "kcal": kcal,
            "protein": protein,
            "carbs": carbs,
            "fat": fat,
            "fiber": fiber,
        }
    ]

    row = MealLog(
        id=meal_id,
        user_id=current_user.id,
        day=now.date(),
        created_at=now,
        slot=slot,
        title=f"🍽️ {dish_name}",
        image_url=None,
        items=items_data,
        kcal=kcal,
        protein=round(float(protein), 1),
        carbs=round(float(carbs), 1),
        fat=round(float(fat), 1),
        fiber=round(float(fiber), 1),
    )
    db.add(row)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully logged {dish_name} to {slot}!",
        "logged_id": row.id,
        "slot": slot,
        "title": row.title,
        "kcal": kcal,
        "protein": protein,
    }
