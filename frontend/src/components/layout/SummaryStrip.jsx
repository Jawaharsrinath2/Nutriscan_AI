import { useAppState } from "../../context/AppState";

const TILES = [
  { key: "kcal", label: "Logged Today", icon: "🔥", unit: "kcal", box: "bg-emerald-50/70 border border-emerald-100", iconBg: "bg-emerald-500" },
  { key: "protein", label: "Protein Logged", icon: "💪", unit: "g", box: "bg-indigo-50/70 border border-indigo-100", iconBg: "bg-indigo-500" },
  { key: "carbs", label: "Carbs Logged", icon: "🌾", unit: "g", box: "bg-amber-50/70 border border-amber-100", iconBg: "bg-amber-500" },
  { key: "fat", label: "Fats Logged", icon: "🥑", unit: "g", box: "bg-rose-50/70 border border-rose-100", iconBg: "bg-rose-500" },
];

export default function SummaryStrip() {
  const { day, targets } = useAppState();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
      {TILES.map((tile) => (
        <div key={tile.key} className={`flex items-center gap-3 p-2 rounded-xl ${tile.box}`}>
          <div className={`w-9 h-9 rounded-lg ${tile.iconBg} text-white flex items-center justify-center font-bold text-sm`}>{tile.icon}</div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{tile.label}</div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900">
              <span>{day.totals[tile.key]}</span> / <span>{targets[tile.key]}</span> {tile.unit}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
