import { useEffect, useState } from "react";

const CATEGORY_STYLES = {
  Protein: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Carb: "bg-amber-50 text-amber-700 border-amber-200",
  "Healthy Fat": "bg-rose-50 text-rose-700 border-rose-200",
  Veggie: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// `nutrition` comes from the backend evaluation and can briefly lag behind a gram edit.
export default function IngredientRow({ item, ingredient, nutrition, onStep, onSetGrams, onRemove }) {
  const [draft, setDraft] = useState(String(item.grams));
  useEffect(() => setDraft(String(item.grams)), [item.grams]);

  const commit = () => onSetGrams(parseInt(draft, 10) || 0);
  const show = (value, suffix) => (nutrition ? `${nutrition[value]}${suffix}` : "…");

  return (
    <tr className="hover:bg-slate-50/80 transition">
      <td className="py-2.5 pr-2">
        <div className="font-semibold text-slate-900">{ingredient.name}</div>
        <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded border ${CATEGORY_STYLES[ingredient.category] || "bg-slate-100 text-slate-700"}`}>
          {ingredient.category}
        </span>
      </td>
      <td className="py-2.5 px-2">
        <div className="flex items-center justify-center gap-1">
          <button type="button" onClick={() => onStep(-1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">-</button>
          <input
            type="number"
            value={draft}
            min="0"
            max="1500"
            step="5"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-14 text-center rounded-md border border-slate-200 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button type="button" onClick={() => onStep(1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">+</button>
        </div>
      </td>
      <td className="py-2.5 px-2 text-right font-bold text-slate-900">{show("kcal", " kcal")}</td>
      <td className="py-2.5 px-2 text-right font-semibold text-indigo-600">{show("protein", "g")}</td>
      <td className="py-2.5 px-2 text-right text-amber-700 hidden sm:table-cell">{show("carbs", "g")}</td>
      <td className="py-2.5 px-2 text-right text-rose-600 hidden sm:table-cell">{show("fat", "g")}</td>
      <td className="py-2.5 pl-2 text-right">
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-600 font-bold text-xs px-2 py-1 rounded hover:bg-rose-50 transition" title="Remove ingredient">✕</button>
      </td>
    </tr>
  );
}
