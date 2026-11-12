from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.plans import GenerateRequest, PlansResponse
from app.services import plan_service, profile_service
from app.services.auth_service import get_current_user
from app.services.food_repository import FoodRepository, get_food_repository
from app.services.plan_writer import PlanWriter, get_plan_writer

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("", response_model=PlansResponse)
def get_plans(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
) -> PlansResponse:
    return plan_service.latest(db, user.id, repo)


@router.post("/generate", response_model=PlansResponse)
def generate_plans(
    body: GenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: FoodRepository = Depends(get_food_repository),
    writer: PlanWriter | None = Depends(get_plan_writer),
) -> PlansResponse:
    """Sync route (runs in a worker thread): each AI call can take 10-20 s."""
    kinds = ["diet", "workout"] if body.kind == "both" else [body.kind]
    try:
        return plan_service.generate(db, user.id, kinds, repo, writer)
    except profile_service.NoProfileError:
        raise HTTPException(status_code=404, detail="Complete onboarding first.") from None
