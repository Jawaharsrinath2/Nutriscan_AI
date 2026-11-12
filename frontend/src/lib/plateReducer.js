// State of the plate being inspected on the Food Scanner tab.

let rowCounter = 0;
const newRowId = () => `row_${++rowCounter}`;
const toRows = (items) => items.map(({ key, grams }) => ({ id: newRowId(), key, grams, baseGrams: grams }));

const MAX_GRAMS = 2000;
const MIN_STEP_GRAMS = 5;
const STEP_GRAMS = 10;

export const BADGE = {
  preset: "Preset Dish",
  manual: "Manual Pick",
  detected: "AI Detected",
  unrecognized: "Not Recognised",
  failed: "Scan Failed",
  noDetector: "No Detector",
};

// Scans that produced no plate, by backend status. The backend's message says why.
const SCAN_PROBLEM = {
  unrecognized: { title: "Unrecognised Meal — Pick the Dish Below", badge: BADGE.unrecognized },
  detector_error: { title: "Scan Failed — Pick the Dish Below", badge: BADGE.failed },
  detector_unavailable: { title: "No Detector Set Up — Pick the Dish Below", badge: BADGE.noDetector },
};

export const initialPlate = {
  source: "preset", // "preset" | "manual" | "scan"
  dishKey: null,
  title: "",
  cuisine: "",
  badge: "",
  scanNote: null, // why the last scan gave no plate; shown under the photo until a dish or new scan replaces it
  imageUrl: null,
  customPhoto: false, // true when the photo came from a scan rather than a preset
  pins: [],
  baseItems: [],
  items: [],
  portionScale: 1,
};

function detectionPins(result) {
  return result.detections
    .filter((d) => d.ingredient_key && d.box)
    .map((d) => ({ kind: "detection", box: d.box, label: `${d.label} (${d.grams}g)` }));
}

export function plateReducer(state, action) {
  switch (action.type) {
    case "LOAD_DISH": {
      const { dish, usePresetPhoto } = action;
      const keepPhoto = state.customPhoto && !usePresetPhoto;
      return {
        ...state,
        source: keepPhoto ? "manual" : "preset",
        dishKey: dish.key,
        title: dish.title,
        cuisine: dish.cuisine,
        badge: keepPhoto ? BADGE.manual : BADGE.preset,
        scanNote: null,
        imageUrl: keepPhoto ? state.imageUrl : dish.image,
        customPhoto: keepPhoto,
        // Preset pins were placed for the preset's own photo, so they never go on a scanned photo.
        pins: keepPhoto ? [] : dish.hotspots.map((h) => ({ kind: "preset", ...h })),
        baseItems: dish.items,
        items: toRows(dish.items),
        portionScale: 1,
      };
    }

    case "APPLY_SCAN": {
      const { result } = action;
      const scanned = { ...state, source: "scan", imageUrl: result.image_url, customPhoto: true, portionScale: 1 };
      if (result.status !== "recognized") {
        const problem = SCAN_PROBLEM[result.status] ?? SCAN_PROBLEM.unrecognized;
        return {
          ...scanned,
          dishKey: null,
          title: problem.title,
          cuisine: problem.badge,
          badge: problem.badge,
          scanNote: result.message,
          pins: [],
          baseItems: [],
          items: [],
        };
      }
      return {
        ...scanned,
        dishKey: result.matched_dish_key,
        title: result.dish_title,
        cuisine: result.cuisine,
        badge: result.confidence != null ? `${Math.round(result.confidence * 100)}% Match` : BADGE.detected,
        scanNote: null,
        pins: detectionPins(result),
        baseItems: result.items,
        items: toRows(result.items),
      };
    }

    case "SET_GRAMS":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, grams: Math.max(0, Math.min(MAX_GRAMS, action.grams)) } : i
        ),
      };

    case "STEP_GRAMS":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, grams: Math.max(MIN_STEP_GRAMS, i.grams + action.direction * STEP_GRAMS) } : i
        ),
      };

    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case "ADD_ITEM":
      return {
        ...state,
        items: [...state.items, { id: newRowId(), key: action.key, grams: action.grams, baseGrams: action.grams }],
      };

    case "SCALE_PORTION":
      return {
        ...state,
        portionScale: action.scale,
        items: state.items.map((i) => ({ ...i, grams: Math.round(i.baseGrams * action.scale) })),
      };

    case "RESET_PLATE":
      return { ...state, items: toRows(state.baseItems), portionScale: 1 };

    case "SET_CONFIRMED_ITEMS": {
      const items = action.items.map((item) => {
        const grams = Math.max(0, Math.min(MAX_GRAMS, Number(item.grams) || 0));
        return {
          id: item.id || newRowId(),
          key: item.key,
          grams,
          baseGrams: grams,
        };
      });
      return {
        ...state,
        items,
        baseItems: items.map(({ key, grams }) => ({ key, grams })),
        portionScale: 1,
      };
    }

    case "APPLY_AUTO_FIT": {
      const grams = new Map(action.items.map((i) => [i.id, i.grams]));
      return {
        ...state,
        portionScale: 0, // no preset multiplier button is active after auto-fit
        items: state.items.map((i) => (grams.has(i.id) ? { ...i, grams: grams.get(i.id) } : i)),
      };
    }

    default:
      throw new Error(`Unknown plate action: ${action.type}`);
  }
}
