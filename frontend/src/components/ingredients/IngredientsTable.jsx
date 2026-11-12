import { useAppState } from "../../context/AppState";
import AddIngredientBar from "./AddIngredientBar";
import IngredientRow from "./IngredientRow";

export default function IngredientsTable() {
  const { catalog, plate, evaluation, actions } = useAppState();
  const nutritionById = new Map((evaluation?.items ?? []).map((row) => [row.id, row]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">3. Detected Ingredients & Portion Weights</h3>
          <p className="text-xs text-slate-500">
            Adjust grams, remove items, or add extra toppings/oil to see live calorie & protein changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={actions.openConfirmWeights}
            className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 shadow-sm"
          >
            <span>⚖️</span>
            <span>Approx Weight Wizard</span>
          </button>
          <button
            type="button"
            onClick={actions.resetPlate}
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-200 transition"
          >
            ↺ Reset Defaults
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-2.5 pr-2">Ingredient</th>
              <th className="py-2.5 px-2 text-center">Portion (g)</th>
              <th className="py-2.5 px-2 text-right">Calories</th>
              <th className="py-2.5 px-2 text-right">Protein</th>
              <th className="py-2.5 px-2 text-right hidden sm:table-cell">Carbs</th>
              <th className="py-2.5 px-2 text-right hidden sm:table-cell">Fat</th>
              <th className="py-2.5 pl-2 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {plate.items.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-xs text-slate-400">
                  No ingredients on plate. Use "+ Add to Plate" below or click "Reset Plate Defaults".
                </td>
              </tr>
            ) : (
              plate.items.map((item) => (
                <IngredientRow
                  key={item.id}
                  item={item}
                  ingredient={catalog.ingredients[item.key]}
                  nutrition={nutritionById.get(item.id)}
                  onStep={(direction) => actions.stepGrams(item.id, direction)}
                  onSetGrams={(grams) => actions.setGrams(item.id, grams)}
                  onRemove={() => actions.removeItem(item.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddIngredientBar />
    </div>
  );
}
