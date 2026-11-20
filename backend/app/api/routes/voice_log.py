from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.models import User
from app.db.session import get_db
from app.schemas.meal import LoggedMeal
from app.schemas.voice_log import (
    ConfirmVoiceMealRequest,
    VoiceParseRequest,
    VoiceParseResponse,
)
from app.services import voice_log_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/voice-log", tags=["voice-log"])


@router.post("/parse", response_model=VoiceParseResponse)
async def parse_voice_transcript_endpoint(
    body: VoiceParseRequest,
    settings: Settings = Depends(get_settings),
) -> VoiceParseResponse:
    """Parse spoken Tanglish/Tamil/English meal description into structured items, grams, and macros."""
    try:
        return await voice_log_service.parse_voice_transcript(body, settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice parsing error: {exc}",
        )


@router.post("/confirm", response_model=LoggedMeal, status_code=status.HTTP_201_CREATED)
def confirm_and_log_voice_meal_endpoint(
    body: ConfirmVoiceMealRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LoggedMeal:
    """Save the approved voice-logged meal into the user's daily diary and targets."""
    return voice_log_service.confirm_and_log_voice_meal(db, user.id, body)


@router.get("/samples")
def get_voice_samples():
    """Returns sample Tanglish & English food audio prompts for 1-click testing."""
    return [
        {
            "icon": "🌅",
            "slot": "Breakfast",
            "prompt": "Kaalaila 3 idli, oru cup sambar, aprm filter coffee saapten",
            "label": "Idli, Sambar & Filter Coffee",
        },
        {
            "icon": "☀️",
            "slot": "Lunch",
            "prompt": "Lunch ku 1 plate chicken biryani with boiled egg and onion raita",
            "label": "Chicken Biryani & Egg",
        },
        {
            "icon": "🍵",
            "slot": "Evening Snack",
            "prompt": "Evening snack ku 2 samosa and ginger tea kudichen",
            "label": "2 Samosas & Ginger Chai",
        },
        {
            "icon": "🌙",
            "slot": "Dinner",
            "prompt": "Night dinner ku 3 chapati with paneer butter masala and curd",
            "label": "Chapati & Paneer Curry",
        },
        {
            "icon": "🥞",
            "slot": "Breakfast",
            "prompt": "Morning 2 crispy masala dosa with coconut chutney and tea",
            "label": "Masala Dosa & Chutney",
        },
    ]
