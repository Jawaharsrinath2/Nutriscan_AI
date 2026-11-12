from pydantic import BaseModel

from app.config import DetectorMode


class DetectorOption(BaseModel):
    mode: DetectorMode
    label: str
    ready: bool
    reason: str | None


class VisionStatus(BaseModel):
    active: DetectorMode
    active_ready: bool
    options: list[DetectorOption]


class VisionModeUpdate(BaseModel):
    mode: DetectorMode
