"""Gemini prompt templates, kept as plain text files in this folder so they can be edited without touching code.

Placeholders use ``${name}`` (string.Template). Rendering is strict in both directions: a placeholder the code
does not supply, or a supplied value the file no longer mentions, raises PromptError instead of sending Gemini a
half-filled or data-less prompt. Files are read on every render, so an edit takes effect on the next request
without restarting the backend. See README.md in this folder for the placeholders.
"""

from pathlib import Path
from string import Template

PROMPTS_DIR = Path(__file__).parent

PROMPT_FILES = {
    "food_detection": "food_detection.txt",
    "diet_plan": "diet_plan.txt",
    "workout_plan": "workout_plan.txt",
}


class PromptError(ValueError):
    """A prompt file and the code disagree about placeholders (after someone edited the file)."""


def read(name: str) -> str:
    """The raw template text (``${placeholders}`` not yet filled)."""
    return (PROMPTS_DIR / PROMPT_FILES[name]).read_text(encoding="utf-8")


def render(name: str, **values: object) -> str:
    """Fill a template. Every ``${placeholder}`` in the file must be supplied and every supplied value must be
    used; a literal ``$`` in a file must be written ``$$``."""
    template = Template(read(name))
    wanted = set(template.get_identifiers())
    unknown, unused = wanted - values.keys(), values.keys() - wanted
    if unknown or unused:
        problems = []
        if unknown:
            problems.append(f"uses placeholders the code does not fill: {sorted(unknown)}")
        if unused:
            problems.append(f"no longer uses: {sorted(unused)}")
        raise PromptError(f"{PROMPT_FILES[name]} {'; '.join(problems)}. See app/prompts/README.md.")
    try:
        return template.substitute(**{k: str(v) for k, v in values.items()})
    except ValueError as exc:  # a stray "$" that is not a placeholder (write it as "$$")
        raise PromptError(f"{PROMPT_FILES[name]}: {exc}") from exc
