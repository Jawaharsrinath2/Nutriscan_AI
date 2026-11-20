from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.models import User
from app.db.session import get_db
from app.schemas.audit import LogPackagedFoodRequest, ProductAuditResponse
from app.schemas.meal import LoggedMeal
from app.services import audit_service
from app.services.auth_service import get_current_user
from app.vision.preprocess import load_image, to_jpeg_bytes

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/barcode/{barcode}", response_model=ProductAuditResponse)
async def audit_by_barcode(barcode: str) -> ProductAuditResponse:
    """Lookup a product barcode in Open Food Facts (or preset cache) and return a detailed health audit."""
    try:
        return await audit_service.lookup_barcode(barcode)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch food product details: {exc}",
        )


@router.post("/photo", response_model=ProductAuditResponse)
async def audit_by_photo(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> ProductAuditResponse:
    """Analyze a photo of a food package or nutrition facts table using Gemini Vision."""
    raw = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large ({len(raw)} bytes; max is {settings.max_upload_mb} MB).",
        )

    try:
        image = load_image(raw, max_bytes)
        jpeg_bytes = to_jpeg_bytes(image)
        return await audit_service.audit_image_with_gemini(jpeg_bytes, settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Label vision analysis failed: {exc}",
        )


@router.post("/log", response_model=LoggedMeal, status_code=status.HTTP_201_CREATED)
def log_audit_product(
    body: LogPackagedFoodRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LoggedMeal:
    """Log an audited packaged food item to the user's daily meal diary and target budget."""
    return audit_service.log_audit_to_meals(db, user.id, body)


@router.get("/presets")
def get_sample_presets():
    """Return pre-configured popular items for instant testing without scanning a physical barcode."""
    return [
        {
            "barcode": "8901719101038",
            "name": "Parle-G Gluco Biscuits",
            "brand": "Parle",
            "category": "Biscuits / Snacks",
            "icon": "🍪",
        },
        {
            "barcode": "5449000000996",
            "name": "Coca-Cola Original",
            "brand": "Coca-Cola",
            "category": "Beverages / Soda",
            "icon": "🥤",
        },
        {
            "barcode": "7622210287471",
            "name": "Cadbury Dairy Milk",
            "brand": "Cadbury",
            "category": "Chocolates / Sweets",
            "icon": "🍫",
        },
        {
            "barcode": "8901499008800",
            "name": "Kellogg's Corn Flakes",
            "brand": "Kellogg's",
            "category": "Breakfast Cereals",
            "icon": "🥣",
        },
        {
            "barcode": "8901030383709",
            "name": "Knorr Classic Veg Soup",
            "brand": "Knorr",
            "category": "Instant Soups",
            "icon": "🍲",
        },
    ]
