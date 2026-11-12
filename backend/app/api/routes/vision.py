from fastapi import APIRouter

from app.schemas.vision import VisionModeUpdate, VisionStatus
from app.vision import factory

router = APIRouter(prefix="/api/vision", tags=["vision"])


@router.get("", response_model=VisionStatus)
def get_vision_status() -> VisionStatus:
    return factory.vision_status()


@router.put("", response_model=VisionStatus)
def set_vision_mode(body: VisionModeUpdate) -> VisionStatus:
    # Runtime switch only; the startup default stays DETECTOR in backend/.env.
    factory.set_active_mode(body.mode)
    return factory.vision_status()
