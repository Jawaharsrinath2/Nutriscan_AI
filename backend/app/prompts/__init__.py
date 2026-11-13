"""Gemini prompt templates, kept as plain text files in this folder so they can be edited without touching code.

Placeholders use ``${name}`` (string.Template). Every placeholder must be supplied by the caller; a missing one
raises at render time rather than reaching Gemini half-filled. Files are read on every render, so an edit takes
effect on the next request without restarting the backend. See README.md in this folder for the placeholders.
"""

from pathlib import Path
from string import Template

PROMPTS_DIR = Path(__file__).parent

PROMPT_FILES = {
    "food_detection": "food_detection.txt",
    "diet_plan": "diet_plan.txt",
    "workout_plan": "workout_plan.txt",
}


def read(name: str) -> str:
    """The raw template text (``${placeholders}`` not yet filled)."""
    return (PROMPTS_DIR / PROMPT_FILES[name]).read_text(encoding="utf-8")


def render(name: str, **values: object) -> str:
    """Fill a template. ``KeyError`` names a placeholder the caller forgot; literal ``$`` must be written ``$$``."""
    return Template(read(name)).substitute(**{k: str(v) for k, v in values.items()})
