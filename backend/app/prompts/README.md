# Prompts

Plain-text templates sent to Gemini. Edit the `.txt` files directly; they are read on every request,
so changes apply to the next scan or plan without restarting the backend. Everything in a file is
sent to the model, so do not add comments inside the prompts.

Placeholders are `${name}` and are filled by the code listed below. Do not rename or remove them
(the backend raises `KeyError` if one it supplies is missing from the file, or `ValueError` if the
file uses one it does not supply). A literal dollar sign must be written `$$`.

| File | Used by | Placeholders |
|---|---|---|
| `food_detection.txt` | `app/vision/gemini_detector.py` (photo scan) | `catalogue` — one `- key: name` line per ingredient; `no_match_key` — the key the model returns when nothing fits (`other`); `box_scale` — bounding-box grid size (`1000`). These two come from code so the prompt and the parser cannot drift. |
| `diet_plan.txt` | `app/services/plan_writer.py` (`diet_prompt`) | `profile` — the person in words (sex, age, height, weight, goal, activity, training, diet preference, avoid list); `kcal`, `protein`, `carbs`, `fat` — the fixed daily targets; `foods` — comma-separated catalogue dish names. |
| `workout_plan.txt` | `app/services/plan_writer.py` (`workout_prompt`) | `profile` — as above; `setting` — gym / home / not-training sentence; `goal` — goal in words. |

The short phrases that build `profile`, `setting` and `goal` (for example "fat loss", "desk job",
"vegetarian plus eggs") live in `plan_writer.py` next to the code that chooses them.

`backend/tests/test_prompts.py` renders every template with the placeholders the code supplies and
fails if one is missing or unfilled, so a broken edit is caught by `pytest` rather than by Gemini.
