const ROWS = [
  { key: "kcal", label: "Calories", unit: " kcal", gramSuffix: "", strong: "text-emerald-600", bar: "bg-emerald-500" },
  { key: "protein", label: "Protein", unit: "g", gramSuffix: "g", strong: "text-indigo-600", bar: "bg-indigo-500" },
  { key: "carbs", label: "Carbohydrates", unit: "g", gramSuffix: "g", strong: "text-amber-600", bar: "bg-amber-500" },
  { key: "fat", label: "Fats", unit: "g", gramSuffix: "g", strong: "text-rose-600", bar: "bg-rose-500" },
];

export default function ImpactBars({ impact }) {
  return (
    <div className="md:col-span-7 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span>How This Meal Impacts Today's Budget</span>
        <span className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block"></span> Already Eaten</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> + This Meal</span>
        </span>
      </div>

      {ROWS.map((row) => {
        const r = impact?.[row.key];
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">{row.label}</span>
              <span className="text-slate-600 font-medium">
                {r ? (
                  <>
                    {r.consumed}{row.gramSuffix} + <strong className={row.strong}>{r.meal}{row.gramSuffix}</strong> = {r.after} / {r.target}{row.unit}
                  </>
                ) : (
                  "–"
                )}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${r?.base_pct ?? 0}%` }}></div>
              <div className={`${row.bar} h-full transition-all duration-300`} style={{ width: `${r?.add_pct ?? 0}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
