import { useAppState } from "../../context/AppState";

const GLASS_ML = 250;

export default function HydrationTracker() {
  const { water, actions } = useAppState();
  const litres = ((water.goal * GLASS_ML) / 1000).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">💧 Daily Hydration Tracker</h3>
          <p className="text-xs text-slate-500">Drinking water 20 mins before meals improves satiety</p>
        </div>
        <span className="text-sm font-extrabold text-sky-600">
          <span>{water.glasses}</span> / {water.goal} glasses ({litres}L)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => actions.changeWater(-1)} className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition">
          - 1 Glass
        </button>
        <div className="flex-1 grid grid-cols-8 gap-1.5">
          {Array.from({ length: water.goal }, (_, i) => (
            <div
              key={i}
              className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                i < water.glasses ? "bg-sky-500 text-white shadow-sm" : "bg-slate-100 text-slate-400"
              }`}
            >
              💧
            </div>
          ))}
        </div>
        <button type="button" onClick={() => actions.changeWater(1)} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition">
          + {GLASS_ML}ml
        </button>
      </div>
    </div>
  );
}
