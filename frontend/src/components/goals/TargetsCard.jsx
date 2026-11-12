import { useAppState } from "../../context/AppState";

const TILES = [
  { key: "kcal", label: "Calories", unit: "kcal", cls: "bg-emerald-50 border-emerald-100 text-emerald-800" },
  { key: "protein", label: "Protein", unit: "g", cls: "bg-indigo-50 border-indigo-100 text-indigo-800" },
  { key: "carbs", label: "Carbs", unit: "g", cls: "bg-amber-50 border-amber-100 text-amber-800" },
  { key: "fat", label: "Fat", unit: "g", cls: "bg-rose-50 border-rose-100 text-rose-800" },
];

export default function TargetsCard() {
  const { profile, targets, actions } = useAppState();
  const { computed, targets_overridden: overridden } = profile;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Daily Targets</h2>
          <p className="text-xs text-slate-500">What every pre-meal check and the daily log measure against.</p>
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${overridden ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
          {overridden ? "Edited manually" : "From your profile"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TILES.map((t) => (
          <div key={t.key} className={`rounded-xl border p-3 text-center ${t.cls}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{t.label}</div>
            <div className="text-xl font-extrabold">
              {targets[t.key].toLocaleString()} <span className="text-xs font-semibold">{t.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Formula: maintenance ≈ <strong className="text-slate-800">{computed.tdee.toLocaleString()} kcal</strong> → {computed.note.charAt(0).toLowerCase() + computed.note.slice(1)}
        {computed.weeks_to_target ? ` Target weight in about ${computed.weeks_to_target} weeks.` : ""}
      </p>

      {overridden && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800">
            The formula now suggests <strong>{computed.kcal.toLocaleString()} kcal</strong>; you're using your own numbers.
          </p>
          <button type="button" onClick={actions.recalculateTargets} className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition">
            Use formula
          </button>
        </div>
      )}
    </div>
  );
}
