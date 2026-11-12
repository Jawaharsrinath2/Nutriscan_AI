import { useAppState } from "../../context/AppState";
import PlanCardFrame from "./PlanCardFrame";

const SLOT_ICON = { Breakfast: "🌅", Lunch: "🍛", "Evening Snack": "🍵", Dinner: "🌙" };

export function DietPlanBody({ content, compact = false }) {
  const dayKcal = content.meals.reduce((s, m) => s + m.kcal, 0);
  const dayProtein = content.meals.reduce((s, m) => s + m.protein, 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">{content.summary}</p>
      <div className="space-y-3">
        {content.meals.map((meal) => (
          <div key={meal.slot} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
              <div className="text-sm font-bold text-slate-900">
                {SLOT_ICON[meal.slot]} {meal.slot} <span className="text-xs font-medium text-slate-500">· {meal.time}</span>
              </div>
              <div className="text-xs font-bold">
                <span className="text-emerald-700">{meal.kcal} kcal</span> <span className="text-slate-300">|</span> <span className="text-indigo-600">{meal.protein} g P</span>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {meal.items.map((food, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="text-slate-800">
                    <span className="font-semibold">{food.name}</span> <span className="text-slate-500">— {food.portion}</span>
                  </span>
                  <span className="text-slate-500 shrink-0 ml-2">{food.kcal} kcal · {food.protein} g</span>
                </li>
              ))}
            </ul>
            {meal.note && !compact && <p className="px-3 py-1.5 text-[11px] text-slate-500 bg-slate-50/60">{meal.note}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Day total: <strong className="text-slate-800">{dayKcal.toLocaleString()} kcal</strong>, <strong className="text-slate-800">{dayProtein} g protein</strong>.
      </p>
      {!compact && content.tips.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tips</h3>
          <ul className="list-disc pl-5 text-xs text-slate-700 space-y-0.5">{content.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {!compact && content.swaps.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Easy swaps</h3>
          <ul className="list-disc pl-5 text-xs text-slate-700 space-y-0.5">{content.swaps.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function DietPlanCard() {
  const { plans } = useAppState();
  const plan = plans?.diet;
  return (
    <PlanCardFrame kind="diet" title="Diet Plan" icon="🥗" plan={plan}>
      {plan && <DietPlanBody content={plan.content} />}
    </PlanCardFrame>
  );
}
