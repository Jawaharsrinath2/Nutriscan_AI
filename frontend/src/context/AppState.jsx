import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { fetchDishes, fetchIngredients } from "../api/foodsApi";
import { fetchPlans, saveCustomGoals } from "../api/goalsApi";
import { clearToday, deleteMeal, fetchToday, logMeal } from "../api/mealsApi";
import { autoFitPlate } from "../api/nutritionApi";
import { fetchPlans as fetchAiPlans, generatePlans } from "../api/plansApi"; // goalsApi's fetchPlans = preset diet plans
import { fetchProfile, previewTargets, recalculateTargets, saveProfile } from "../api/profileApi";
import { scanPhoto } from "../api/scanApi";
import { fetchVision, setVisionMode } from "../api/visionApi";
import { fetchWater, setWater } from "../api/waterApi";
import { useEvaluate } from "../hooks/useEvaluate";
import { useToast } from "../hooks/useToast";
import { initialPlate, plateReducer } from "../lib/plateReducer";
import { useAuth } from "./AuthContext";

const AppStateContext = createContext(null);

const DEFAULT_DISH = "steamed_white_rice";
const WATER_MAX_GLASSES = 12;

const byKey = (list) => Object.fromEntries(list.map((item) => [item.key, item]));

export function AppStateProvider({ children }) {
  const showToast = useToast();
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [targets, setTargets] = useState(null);
  const [profile, setProfile] = useState(null); // ProfileResponse; profile.profile is null until onboarded
  const [plans, setPlans] = useState(null); // PlansResponse
  const [generating, setGenerating] = useState(null); // "diet" | "workout" | "both" | null
  const [day, setDay] = useState(null);
  const [water, setWaterState] = useState(null);
  const [vision, setVision] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [confirmWeightsOpen, setConfirmWeightsOpen] = useState(false);
  const [plate, dispatch] = useReducer(plateReducer, initialPlate);

  // Actions read the latest plate/water through refs so they don't need to be rebuilt on every change.
  const plateRef = useRef(plate);
  plateRef.current = plate;
  const waterRef = useRef(water);
  waterRef.current = water;

  // The food catalogue and detector status are public: load them once.
  useEffect(() => {
    Promise.all([fetchIngredients(), fetchDishes(), fetchPlans(), fetchVision()])
      .then(([ingredientList, dishList, plans, visionStatus]) => {
        const dishes = byKey(dishList);
        setCatalog({ ingredientList, ingredients: byKey(ingredientList), dishList, dishes, plans });
        setVision(visionStatus);
        dispatch({ type: "LOAD_DISH", dish: dishes[DEFAULT_DISH] ?? dishList[0], usePresetPhoto: true });
      })
      .catch(setLoadError);
  }, []);

  // Targets, today's meals and water belong to the signed-in user: (re)load on login, clear on logout.
  useEffect(() => {
    if (!user) {
      setTargets(null);
      setProfile(null);
      setPlans(null);
      setDay(null);
      setWaterState(null);
      // The plate is client-side state; the next person to sign in must not inherit it.
      if (catalog) dispatch({ type: "LOAD_DISH", dish: catalog.dishes[DEFAULT_DISH] ?? catalog.dishList[0], usePresetPhoto: true });
      return;
    }
    let cancelled = false;
    Promise.all([fetchProfile(), fetchAiPlans(), fetchToday(), fetchWater()])
      .then(([profileState, planState, today, waterState]) => {
        if (cancelled) return;
        setProfile(profileState);
        setPlans(planState);
        setTargets(profileState.targets);
        setDay(today);
        setWaterState(waterState);
      })
      .catch((err) => !cancelled && setLoadError(err));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const ready = catalog !== null && profile !== null && plans !== null && day !== null && water !== null;
  const needsOnboarding = ready && profile.profile === null;
  const { evaluation } = useEvaluate(plate.items, ready, [day, targets]);

  const actions = useMemo(() => {
    const guarded = (fn) => async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        showToast(err.message, "⚠️");
        return undefined;
      }
    };
    const refreshDay = async () => setDay(await fetchToday());

    const loadDish = (key, { usePresetPhoto = false, toast } = {}) => {
      const dish = catalog?.dishes[key];
      if (!dish) return;
      dispatch({ type: "LOAD_DISH", dish, usePresetPhoto });
      if (toast) showToast(`${toast.prefix} ${dish.title}`, toast.icon);
    };

    const scan = guarded(async (blob, filename) => {
      setScanning(true);
      try {
        const result = await scanPhoto(blob, filename);
        dispatch({ type: "APPLY_SCAN", result });
        if (result.status === "recognized") {
          const missing = result.unmatched_labels.length
            ? ` Not in database: ${result.unmatched_labels.join(", ")}.`
            : "";
          showToast(`Photo scanned! Confirm approximate portion weights to calculate exact macros.${missing}`, "📸");
          setConfirmWeightsOpen(true);
        } else {
          showToast(result.message, "⚠️");
        }
      } finally {
        setScanning(false);
      }
    });

    return {
      loadSample: (key) => loadDish(key, { usePresetPhoto: true, toast: { prefix: "Loaded preset:", icon: "✨" } }),
      switchDish: (key) => loadDish(key, { toast: { prefix: "Switched profile to", icon: "🍽️" } }),
      quickDish: (key) => loadDish(key, { toast: { prefix: "Loaded", icon: "🇮🇳" } }),

      scanFile: (file) => scan(file, file.name || "photo.jpg"),
      scanBlob: (blob) => scan(blob, "camera_capture.jpg"),
      // Re-runs real detection on whatever photo is showing (an upload or a sample photo).
      rescan: guarded(async () => {
        const url = plateRef.current.imageUrl;
        if (!url) return;
        const response = await fetch(url);
        await scan(await response.blob(), url.split("/").pop());
      }),

      setGrams: (id, grams) => dispatch({ type: "SET_GRAMS", id, grams }),
      stepGrams: (id, direction) => dispatch({ type: "STEP_GRAMS", id, direction }),
      removeItem: (id) => dispatch({ type: "REMOVE_ITEM", id }),
      addItem: (key, grams) => {
        dispatch({ type: "ADD_ITEM", key, grams });
        showToast(`Added ${grams}g ${catalog.ingredients[key].name}`, "➕");
      },
      scalePortion: (scale) => {
        dispatch({ type: "SCALE_PORTION", scale });
        showToast(`Portion scaled to ${scale}x`, "⚖️");
      },
      resetPlate: () => {
        dispatch({ type: "RESET_PLATE" });
        showToast("Plate ingredients reset to default weights", "↺");
      },
      autoFit: guarded(async () => {
        const result = await autoFitPlate(plateRef.current.items);
        dispatch({ type: "APPLY_AUTO_FIT", items: result.items });
        showToast(`Portion auto-adjusted to fit your ${result.target_kcal} remaining kcal!`, "🎯");
      }),

      logMeal: guarded(async (slot) => {
        const current = plateRef.current;
        const items = current.items.filter((i) => i.grams > 0).map(({ key, grams }) => ({ key, grams }));
        if (items.length === 0) {
          showToast("Add at least one ingredient before logging this meal.", "⚠️");
          return;
        }
        const meal = await logMeal({ slot, title: current.title, image_url: current.imageUrl, items });
        await refreshDay();
        showToast(`Logged ${meal.title} (${meal.kcal} kcal) to ${slot}!`, "✅");
      }),
      deleteMeal: guarded(async (id) => {
        await deleteMeal(id);
        await refreshDay();
        showToast("Meal removed from today's log", "🗑️");
      }),
      clearLog: guarded(async () => {
        await clearToday();
        await refreshDay();
        showToast("Reset today's meal log", "🗑️");
      }),

      changeWater: guarded(async (delta) => {
        const glasses = Math.max(0, Math.min(WATER_MAX_GLASSES, waterRef.current.glasses + delta));
        if (glasses === waterRef.current.glasses) return;
        setWaterState(await setWater(glasses));
        if (delta > 0) showToast("Logged +250ml water!", "💧");
      }),

      saveProfile: guarded(async (data) => {
        const state = await saveProfile(data);
        setProfile(state);
        setTargets(state.targets);
        showToast(`Profile saved — daily target ${state.targets.kcal.toLocaleString()} kcal`, "🎯");
        return state;
      }),
      // No toast: the "Your numbers" step calls this on every slider move.
      previewTargets: (data, signal) => previewTargets(data, signal),
      generatePlans: guarded(async (kind = "both") => {
        setGenerating(kind);
        try {
          const state = await generatePlans(kind);
          setPlans(state);
          if (state.ai_error) showToast("The AI couldn't answer, so a template plan is shown. Try Regenerate in a minute.", "⚠️");
          else showToast(state.ai_ready ? "Your plan is ready!" : "Template plan created (no AI key set).", "✨");
          return state;
        } finally {
          setGenerating(null);
        }
      }),
      recalculateTargets: guarded(async () => {
        const state = await recalculateTargets();
        setProfile(state);
        setTargets(state.targets);
        showToast("Targets recalculated from your profile", "🧮");
      }),
      saveCustomTargets: guarded(async (values) => {
        const saved = await saveCustomGoals(values);
        setTargets(saved);
        setProfile((p) => (p ? { ...p, targets: saved, targets_overridden: true } : p));
        showToast("Saved custom daily calorie & macro goals!", "💾");
      }),

      changeVisionMode: guarded(async (mode) => {
        const status = await setVisionMode(mode);
        setVision(status);
        const option = status.options.find((o) => o.mode === mode);
        showToast(option.ready ? `Using ${option.label}` : option.reason, option.ready ? "🤖" : "⚠️");
      }),

      openConfirmWeights: () => setConfirmWeightsOpen(true),
      closeConfirmWeights: () => setConfirmWeightsOpen(false),
      saveConfirmedWeights: (items) => {
        dispatch({ type: "SET_CONFIRMED_ITEMS", items });
        setConfirmWeightsOpen(false);
        const total = items.reduce((sum, i) => sum + (Number(i.grams) || 0), 0);
        showToast(`Calculated nutrition for your ${total}g portion!`, "⚖️");
      },
    };
  }, [catalog, showToast]);

  const value = {
    ready, needsOnboarding, loadError, catalog, targets, profile, plans, generating, day, water, vision, plate, evaluation, scanning, confirmWeightsOpen, actions,
  };
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
