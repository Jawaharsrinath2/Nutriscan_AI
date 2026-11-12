from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.schemas.scan import ScanResponse
from app.services.food_repository import FoodRepository, get_food_repository
from app.services.scan_service import run_scan
from app.vision.factory import DetectorChoice, get_detector_choice
from app.vision.preprocess import InvalidImageError

router = APIRouter(prefix="/api/scan", tags=["scan"])


@router.post("", response_model=ScanResponse)
def scan_photo(
    photo: UploadFile = File(...),
    choice: DetectorChoice = Depends(get_detector_choice),
    repo: FoodRepository = Depends(get_food_repository),
    settings: Settings = Depends(get_settings),
) -> ScanResponse:
    # Sync route: FastAPI runs it in a worker thread, so the blocking detector call is fine.
    max_bytes = settings.max_upload_mb * 1024 * 1024
    raw = photo.file.read(max_bytes + 1)
    try:
        return run_scan(raw, choice, repo, settings.resolve(settings.uploads_dir), max_bytes)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
