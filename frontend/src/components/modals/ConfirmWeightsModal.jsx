import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../context/AppState";

/* ── Category styling badges ───────────────────────────────────────────── */
const CATEGORY_STYLES = {
  Protein: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Carb: "bg-amber-50 text-amber-700 border-amber-200",
  "Healthy Fat": "bg-rose-50 text-rose-700 border-rose-200",
  Veggie: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/* ── Dynamic quick portion preset recommendations ─────────────────────── */
function getPortionPresets(category, key) {
  const k = (key || "").toLowerCase();

  // Rice, Biryani, Pulao, Quinoa, Grains
  if (k.includes("rice") || k.includes("biryani") || k.includes("quinoa") || k.includes("khichdi") || k.includes("pulao")) {
    return [
      { label: "150g (Small Bowl)", grams: 150 },
      { label: "250g (Standard)", grams: 250 },
      { label: "350g (Medium-Large)", grams: 350 },
      { label: "500g (Double / Large)", grams: 500 },
    ];
  }

  // Breads / Rotis / Chapatis
  if (k.includes("roti") || k.includes("chapati") || k.includes("naan") || k.includes("paratha")) {
    return [
      { label: "40g (1 pc)", grams: 40 },
      { label: "80g (2 pcs)", grams: 80 },
      { label: "120g (3 pcs)", grams: 120 },
      { label: "160g (4 pcs)", grams: 160 },
    ];
  }

  // Idlis / Vadas
  if (k.includes("idli") || k.includes("vada")) {
    return [
      { label: "50g (1 pc)", grams: 50 },
      { label: "100g (2 pcs)", grams: 100 },
      { label: "150g (3 pcs)", grams: 150 },
      { label: "200g (4 pcs)", grams: 200 },
    ];
  }

  // Dosas
  if (k.includes("dosa")) {
    return [
      { label: "100g (1 Dosa)", grams: 100 },
      { label: "200g (2 Dosas)", grams: 200 },
      { label: "300g (3 Dosas)", grams: 300 },
    ];
  }

  // Liquid Dals, Sambars, Curries
  if (k.includes("dal") || k.includes("sambar") || k.includes("curry") || k.includes("rasam") || k.includes("curd") || k.includes("soup")) {
    return [
      { label: "100g (Small Katori)", grams: 100 },
      { label: "150g (Standard Katori)", grams: 150 },
      { label: "200g (Medium Bowl)", grams: 200 },
      { label: "300g (Large Bowl)", grams: 300 },
    ];
  }

  // Proteins: Paneer, Chicken, Eggs, Tofu, Fish
  if (category === "Protein" || k.includes("paneer") || k.includes("chicken") || k.includes("egg") || k.includes("tofu") || k.includes("fish")) {
    return [
      { label: "50g (Snack / Few cubes)", grams: 50 },
      { label: "100g (Standard serving)", grams: 100 },
      { label: "150g (High protein)", grams: 150 },
      { label: "250g (Double portion)", grams: 250 },
    ];
  }

  // Veggies & Salads
  if (category === "Veggie" || k.includes("salad")) {
    return [
      { label: "50g (Side)", grams: 50 },
      { label: "100g (Standard Bowl)", grams: 100 },
      { label: "150g (Large Serving)", grams: 150 },
      { label: "200g (Heaped)", grams: 200 },
    ];
  }

  // Oils, Ghee, Butter
  if (category === "Healthy Fat" || k.includes("ghee") || k.includes("oil") || k.includes("butter")) {
    return [
      { label: "5g (1 tsp)", grams: 5 },
      { label: "10g (1 tbsp)", grams: 10 },
      { label: "15g (Generous)", grams: 15 },
    ];
  }

  // Generic fallback
  return [
    { label: "50g", grams: 50 },
    { label: "100g", grams: 100 },
    { label: "150g", grams: 150 },
    { label: "250g", grams: 250 },
    { label: "500g", grams: 500 },
  ];
}

export default function ConfirmWeightsModal({ open, onClose }) {
  const { catalog, plate, actions } = useAppState();
  const [draftItems, setDraftItems] = useState([]);
  const [addingKey, setAddingKey] = useState("");

  // Sync draft state with plate.items whenever the modal opens
  useEffect(() => {
    if (open) {
      setDraftItems((plate.items || []).map((i) => ({ ...i })));
      setAddingKey("");
    }
  }, [open, plate.items]);

  // Compute live nutrient totals for the draft items
  const totals = useMemo(() => {
    let grams = 0;
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const item of draftItems) {
      const ing = catalog?.ingredients[item.key];
      const g = Math.max(0, Number(item.grams) || 0);
      grams += g;
      if (ing) {
        kcal += Math.round((ing.kcal * g) / 100);
        protein += (ing.protein * g) / 100;
        carbs += (ing.carbs * g) / 100;
        fat += (ing.fat * g) / 100;
      }
    }

    return {
      grams,
      kcal,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [draftItems, catalog]);

  if (!open) return null;

  const updateGrams = (id, newGrams) => {
    const val = Math.max(0, Math.min(2000, Number(newGrams) || 0));
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, grams: val } : item)));
  };

  const stepGrams = (id, delta) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = Number(item.grams) || 0;
        const next = Math.max(0, Math.min(2000, current + delta));
        return { ...item, grams: next };
      })
    );
  };

  const removeItem = (id) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddIngredient = () => {
    if (!addingKey || !catalog?.ingredients[addingKey]) return;
    const ing = catalog.ingredients[addingKey];
    const defaultGrams = ing.category === "Healthy Fat" ? 10 : ing.category === "Protein" ? 100 : 150;
    const newItem = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      key: addingKey,
      grams: defaultGrams,
    };
    setDraftItems((prev) => [...prev, newItem]);
    setAddingKey("");
  };

  const handleSave = () => {
    actions.saveConfirmedWeights(draftItems);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-500/20">
              ⚖️
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Confirm Approximate Weights</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Step 2
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Nutrients scale with weight — e.g. 250g rice has 325 kcal vs 500g has 650 kcal!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* ── Guidance Banner ─────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="text-base mt-0.5 flex-shrink-0">💡</span>
          <div>
            <strong>Why quantity matters:</strong> AI detects <em>what</em> is on your plate, but exact calories depend on <em>how much</em> you eat. Confirm the approximate weights below to get precise nutrition.
          </div>
        </div>

        {/* ── Detected Items List (Scrollable) ─────────────────────────── */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {draftItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <span className="text-4xl">🍽️</span>
              <p className="text-sm font-medium">No items detected or all items removed.</p>
              <p className="text-xs text-slate-400">Add an ingredient using the dropdown below to begin calculation.</p>
            </div>
          ) : (
            draftItems.map((item) => {
              const ing = catalog?.ingredients[item.key];
              if (!ing) return null;
              const g = Math.max(0, Number(item.grams) || 0);
              const rowKcal = Math.round((ing.kcal * g) / 100);
              const rowProtein = Math.round(((ing.protein * g) / 100) * 10) / 10;
              const rowCarbs = Math.round(((ing.carbs * g) / 100) * 10) / 10;
              const presets = getPortionPresets(ing.category, item.key);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white transition space-y-3 shadow-sm"
                >
                  {/* Item title + category + remove button */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{ing.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            CATEGORY_STYLES[ing.category] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ing.category}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {ing.kcal} kcal per 100g
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove this item if not on plate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Weight input controls + live nutrient stats */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {/* Stepper Input */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => stepGrams(item.id, -25)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        title="-25g"
                      >
                        -25
                      </button>
                      <button
                        type="button"
                        onClick={() => stepGrams(item.id, -10)}
                        className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        title="-10g"
                      >
                        -
                      </button>
                      <div className="flex items-center px-2">
                        <input
                          type="number"
                          value={item.grams}
                          min="0"
                          max="2000"
                          step="5"
                          onChange={(e) => updateGrams(item.id, e.target.value)}
                          className="w-16 text-center font-extrabold text-sm text-slate-900 focus:outline-none"
                        />
                        <span className="text-xs font-semibold text-slate-400 ml-0.5">g</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => stepGrams(item.id, 10)}
                        className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        title="+10g"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => stepGrams(item.id, 25)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        title="+25g"
                      >
                        +25
                      </button>
                    </div>

                    {/* Live Row Nutrition Pill */}
                    <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900">
                      <span>≈ {rowKcal} kcal</span>
                      <span className="text-emerald-300">|</span>
                      <span className="text-indigo-700">{rowProtein}g Protein</span>
                      <span className="text-emerald-300">|</span>
                      <span className="text-amber-700">{rowCarbs}g Carbs</span>
                    </div>
                  </div>

                  {/* Quick portion preset pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Select:</span>
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updateGrams(item.id, preset.grams)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                          Math.abs(item.grams - preset.grams) < 3
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* ── Add Missed Ingredient Row ─────────────────────────────── */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={addingKey}
                onChange={(e) => setAddingKey(e.target.value)}
                className="flex-1 min-w-[200px] text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">+ Add missed food item from database…</option>
                {catalog?.ingredientList?.map((ing) => (
                  <option key={ing.key} value={ing.key}>
                    {ing.name} ({ing.category})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={!addingKey}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition"
              >
                + Add Item
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3.5">
          {/* Row 1: Running Totals in a single clean row */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-2.5 px-4 rounded-xl bg-white border border-slate-200/80 text-xs shadow-sm">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-slate-400 font-medium">Total Portion:</span>
              <span className="font-extrabold text-slate-900">{totals.grams}g</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-slate-400 font-medium">Est. Calories:</span>
              <span className="font-extrabold text-emerald-700">{totals.kcal} kcal</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-slate-400 font-medium">Protein:</span>
              <span className="font-extrabold text-indigo-600">{totals.protein}g</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-slate-400 font-medium">Carbs:</span>
              <span className="font-extrabold text-amber-700">{totals.carbs}g</span>
            </div>
          </div>

          {/* Row 2: Action Buttons placed on second line */}
          <div className="flex items-center justify-center gap-3 pt-0.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200/70 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={draftItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Calculate Nutrients &amp; Macros</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
