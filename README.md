# NutriScan AI

Pre-meal food photo analyzer and diet planner. Snap or upload a plate, see the detected items with
calories and macros, check how the meal fits today's targets, then log it.

- **backend/** — Python · FastAPI. Detection, nutrition maths, diet verdicts, meal/water/goal storage (SQLite).
- **frontend/** — React · Vite · Tailwind. Same UI as the original single-file app, split into components.
- **legacy/** — the original single HTML file, kept for reference.

## Quick start (Windows / PowerShell)

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          # then put your GEMINI_API_KEY in .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend (development)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5175. Vite forwards `/api` and `/uploads` to the backend.
If port 8000 is already used, run the backend on another port and point Vite at it:

```powershell
$env:NUTRISCAN_API_URL="http://127.0.0.1:8010"; npm run dev
```

### Single-server mode

`npm run build` in `frontend/` creates `frontend/dist`. The backend then serves the whole app at
http://127.0.0.1:8000/ — no Node needed to run it.

## Accounts

Meals, water and daily targets belong to the signed-in user (`/api/meals`, `/api/water`, `/api/goals`,
`/api/nutrition` and `/api/scan` need a bearer token; the food catalogue is public). Databases created
before accounts existed had shared tables; those are dropped and recreated per-user on startup.

## Onboarding and targets

After signup a six-step questionnaire (body stats, goal, activity, training, food preferences) feeds
`backend/app/services/target_calculator.py`: Mifflin-St Jeor BMR × activity factor → maintenance,
then the goal's deficit/surplus, protein per kg and fat share. The numbers are deterministic and
unit-tested; AI never picks them. Targets can be overridden by hand on the Goals tab and restored
with "Use formula". Profile edits (e.g. a weigh-in) recompute targets unless they were overridden.

**Diet and workout plans** (`/api/plans`): after onboarding, Gemini writes a one-day South Indian
diet plan around the fixed targets and a weekly workout plan from the training answers
(`backend/app/services/plan_writer.py`, structured JSON output, `GEMINI_PLAN_TIMEOUT_S` per model
with the same fallback models). Without a key, or when the AI fails, a template plan built from the
person's targets and the dish catalogue is stored instead (`default_plans.py`) and the card says so.
Plans are regenerated manually from the Goals tab (6 AI generations per hour per user); a plan is
flagged stale when weight changes by ≥ 2 kg, the goal changes, or the calorie target moves ≥ 100 kcal.

## Photo detection

The old app guessed dishes from file names and pixel colours, and its pins were hard-coded.
Now a real detector finds each food item and returns a bounding box for it. Pick the engine with
`DETECTOR` in `backend/.env` (or switch at runtime from the "Vision" button in the header):

| `DETECTOR` | What it needs | Notes |
|---|---|---|
| `gemini` (default) | `GEMINI_API_KEY`, internet | Recognises South Indian dishes (idli, dosa, sambar...) out of the box. Model set by `GEMINI_MODEL`; if it times out (`GEMINI_TIMEOUT_S`), is overloaded or rate-limited, `GEMINI_FALLBACK_MODELS` are tried in order. |
| `yolo` | `pip install -r requirements-ml.txt` (~2 GB) + weights in `backend/models/` | Fully offline. Needs a model trained on Indian food: see `backend/training/`. |
| `none` | nothing | No detection; pick the dish from the list. |

The key must go in `backend/.env` (not `.env.example`, which is only the template). Restart the
backend after editing `.env`; `--reload` only watches `.py` files.

If nothing is recognised, or the scan fails, the app says why under the photo instead of guessing;
choose the dish from the dropdown (your photo is kept) or add ingredients by hand.

**Portion grams are estimates.** One photo cannot give true weight, so correct them in the
ingredient table; every change re-evaluates the meal on the backend.

## Project layout

```
backend/app/
  main.py, config.py        app setup, settings from .env
  api/routes/               scan, foods, nutrition, meals, water, goals, vision
  schemas/                  request/response models
  vision/                   detector interface, Gemini + YOLO detectors, label mapping,
                            portion estimation, dish matching, image preprocessing
  services/                 nutrition calculator, diet evaluator, meal log, goals, scan pipeline
  db/                       SQLite models and session
  data/                     ingredients, dish presets, diet plans, label aliases (JSON)
backend/scripts/extract_legacy.py   one-time migration from the old HTML (already run)
backend/tests/              pytest suite

frontend/src/
  api/                      one module per backend route group
  context/AppState.jsx      app state + actions
  lib/plateReducer.js       plate editing logic
  hooks/                    useEvaluate (debounced), useCamera, useToast
  views/                    ScannerView, TrackerView, GoalsView
  components/               layout, scanner, report, ingredients, tracker, goals, modals, common
```

## Tests

```powershell
cd backend
pip install -r requirements-dev.txt
pytest
```

## Known data notes

- The 28 dish presets share 7 photos (as in the original). Presets without their own photo show no pins.
- `frontend/public/samples/steamed_white_rice.jpg` is a screenshot of the old app, not a rice photo.
  Replace it with a real photo if you like (same file name).
