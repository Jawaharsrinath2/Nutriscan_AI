from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.profile import ComputedTargets, ProfileIn, ProfileResponse
from app.services import profile_service, target_calculator
from app.services.auth_service import get_current_user
from app.services.food_repository import FoodRepository, get_food_repository

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> ProfileResponse:
    """`profile` is null until onboarding has been completed."""
    return profile_service.build_response(db, user.id, repo)


@router.put("", response_model=ProfileResponse)
def save_profile(
    body: ProfileIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> ProfileResponse:
    profile_service.save_profile(db, user.id, body)
    return profile_service.build_response(db, user.id, repo)


@router.post("/targets/preview", response_model=ComputedTargets, dependencies=[Depends(get_current_user)])
def preview_targets(body: ProfileIn) -> ComputedTargets:
    """The numbers for a set of answers, without saving anything (the 'Your numbers' step)."""
    return target_calculator.compute(body)


@router.post("/targets/recalculate", response_model=ProfileResponse)
def recalculate_targets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> ProfileResponse:
    try:
        profile_service.recalculate(db, user.id)
    except profile_service.NoProfileError:
        raise HTTPException(status_code=404, detail="Complete onboarding first.") from None
    return profile_service.build_response(db, user.id, repo)
