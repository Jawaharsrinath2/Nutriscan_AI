import { useAppState } from "../../context/AppState";

const GLASS_ML = 250;

export default function SummaryStrip() {
  const { day, targets, profile, water } = useAppState();
  if (!day || !targets) return null;

  const weightKg = profile?.profile?.weight_kg;
  const goalGlasses = weightKg
    ? Math.max(6, Math.round((weightKg * 35) / GLASS_ML))
    : (water?.goal || 8);
  const currentGlasses = water?.glasses ?? 0;
  const currentLitres = ((currentGlasses * GLASS_ML) / 1000).toFixed(1);
  const targetLitres = ((goalGlasses * GLASS_ML) / 1000).toFixed(1);
  const remainingGlasses = Math.max(0, goalGlasses - currentGlasses);

  const tiles = [
    {
      key: "kcal",
      label: "Logged Today",
      icon: "🔥",
      unit: "kcal",
      box: "bg-emerald-50/70 border border-emerald-100",
      iconBg: "bg-emerald-500",
      logged: day.totals?.kcal ?? 0,
      target: targets?.kcal ?? 0,
      leftText: (left) => (left > 0 ? `${left} kcal left` : "Goal reached ✅"),
    },
    {
      key: "protein",
      label: "Protein Logged",
      icon: "💪",
      unit: "g",
      box: "bg-indigo-50/70 border border-indigo-100",
      iconBg: "bg-indigo-500",
      logged: day.totals?.protein ?? 0,
      target: targets?.protein ?? 0,
      leftText: (left) => (left > 0 ? `${left}g left` : "Goal reached ✅"),
    },
    {
      key: "carbs",
      label: "Carbs Logged",
      icon: "🌾",
      unit: "g",
      box: "bg-amber-50/70 border border-amber-100",
      iconBg: "bg-amber-500",
      logged: day.totals?.carbs ?? 0,
      target: targets?.carbs ?? 0,
      leftText: (left) => (left > 0 ? `${left}g left` : "Goal reached ✅"),
    },
    {
      key: "fat",
      label: "Fats Logged",
      icon: "🥑",
      unit: "g",
      box: "bg-rose-50/70 border border-rose-100",
      iconBg: "bg-rose-500",
      logged: day.totals?.fat ?? 0,
      target: targets?.fat ?? 0,
      leftText: (left) => (left > 0 ? `${left}g left` : "Goal reached ✅"),
    },
    {
      key: "water",
      label: "Water Logged",
      icon: "💧",
      unit: "L",
      box: "bg-sky-50/70 border border-sky-100",
      iconBg: "bg-sky-500",
      logged: currentLitres,
      target: targetLitres,
      leftText: () => (remainingGlasses > 0 ? `${remainingGlasses} glasses left` : "Hydrated! 🎉"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
      {tiles.map((tile) => {
        const left =
          typeof tile.target === "number" && typeof tile.logged === "number"
            ? Math.max(0, tile.target - tile.logged)
            : 0;
        return (
          <div key={tile.key} className={`flex items-center gap-3 p-2.5 rounded-xl ${tile.box}`}>
            <div className={`w-9 h-9 rounded-lg ${tile.iconBg} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
              {tile.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">{tile.label}</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                <span>{tile.logged}</span> / <span>{tile.target}</span> {tile.unit}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                {tile.leftText(left)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
