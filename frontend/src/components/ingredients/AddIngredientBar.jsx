import { useState } from "react";
import { useAppState } from "../../context/AppState";

const DEFAULT_GRAMS = 50;
const MIN_GRAMS = 5;

export default function AddIngredientBar() {
  const { catalog, actions } = useAppState();
  const [key, setKey] = useState(catalog.ingredientList[0].key);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));

  const add = () => actions.addItem(key, Math.max(MIN_GRAMS, parseInt(grams, 10) || DEFAULT_GRAMS));

  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
      <div className="text-xs font-bold text-slate-700">➕ Add Missing Ingredient or Cooking Oil / Side Dish</div>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-6">
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {catalog.ingredientList.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name} ({item.kcal} kcal, {item.protein}g P per 100g)
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3 flex items-center gap-1.5">
          <input
            type="number"
            min="5"
            max="1000"
            step="5"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-xs font-semibold text-slate-500">grams</span>
        </div>
        <div className="sm:col-span-3">
          <button type="button" onClick={add} className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition">
            + Add to Plate
          </button>
        </div>
      </div>
    </div>
  );
}
