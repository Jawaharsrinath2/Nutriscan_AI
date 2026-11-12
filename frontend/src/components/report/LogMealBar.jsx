import { useState } from "react";
import { useAppState } from "../../context/AppState";

const SLOTS = [
  ["Breakfast", "🌅 Breakfast"],
  ["Lunch", "☀️ Lunch"],
  ["Evening Snack", "🍵 Evening Snack"],
  ["Dinner", "🌙 Dinner"],
];

export default function LogMealBar() {
  const { actions } = useAppState();
  const [slot, setSlot] = useState("Lunch");

  return (
    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="mealSlotSelect" className="text-xs font-bold text-slate-700">Meal Time:</label>
        <select
          id="mealSlotSelect"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {SLOTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => actions.logMeal(slot)}
        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition"
      >
        <span>✅ Eat & Add to Today's Diet Log</span>
      </button>
    </div>
  );
}
