"""FastAPI entry point: `uvicorn app.main:app --reload` from the backend folder."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import ALL_ROUTERS
from app.config import FRONTEND_DIST, get_settings
from app.db.session import init_db
from app.services.food_repository import UnknownIngredientError


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="NutriScan AI", version="2.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(UnknownIngredientError)
    async def unknown_ingredient(_: Request, exc: UnknownIngredientError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": f"Unknown ingredient: {exc.key}"})

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok"}

    for router in ALL_ROUTERS:
        app.include_router(router)

    uploads_dir = settings.resolve(settings.uploads_dir)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # After `npm run build`, the backend can serve the whole app from one port.
    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

    return app


app = create_app()
