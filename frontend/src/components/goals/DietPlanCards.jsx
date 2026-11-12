import { useAppState } from "../../context/AppState";

const ACTIVE = "diet-plan-card w-full text-left p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 transition flex items-start justify-between gap-3";
const INACTIVE = "diet-plan-card w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 transition flex items-start justify-between gap-3";

export default function DietPlanCards() {
  const { catalog, targets, actions } = useAppState();

  return (
    <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Choose Your Diet Plan Mode</h2>
        <p className="text-xs text-slate-500">Select a diet plan so pre-meal scans evaluate your food against the right macro targets</p>
      </div>

      <div className="space-y-3">
        {catalog.plans.map((plan) => (
          <button
            key={plan.key}
            type="button"
            onClick={() => actions.choosePlan(plan.key)}
            className={targets.plan_key === plan.key ? ACTIVE : INACTIVE}
          >
            <div>
              <div className="text-sm font-extrabold text-slate-900">{plan.title}</div>
              <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{plan.kcal.toLocaleString()} kcal</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">{plan.protein}g Protein</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">{plan.carbs}g Carbs</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800">{plan.fat}g Fat</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
