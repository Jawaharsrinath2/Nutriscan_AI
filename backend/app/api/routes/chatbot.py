import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.chatbot import ChatRequest, ChatResponse, StarterPrompt
from app.services.auth_service import get_current_user
from app.services.chatbot_service import (
    STARTER_PROMPTS,
    generate_nutritionist_reply,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["ai-nutritionist-chatbot"])


@router.get("/starter-prompts", response_model=List[StarterPrompt])
def get_starter_prompts():
    """Retrieve quick prompt chips for common Indian fitness & nutrition questions."""
    return STARTER_PROMPTS


@router.post("/message", response_model=ChatResponse)
def post_chatbot_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Context-aware 24/7 AI Dietitian responding in Tanglish or English based on user biometrics."""
    return generate_nutritionist_reply(
        db=db,
        user_id=current_user.id,
        messages=req.messages,
        language=req.language or "tanglish",
    )
