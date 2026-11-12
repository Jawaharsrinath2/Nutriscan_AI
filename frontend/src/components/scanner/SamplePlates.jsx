import { useAppState } from "../../context/AppState";

const SAMPLES = [
  ["steamed_white_rice", "Steamed White Rice"],
  ["south_indian_meals", "South Indian Meals"],
  ["masala_dosa", "Masala Dosa & Vada"],
  ["idli_sambar", "Idli Sambar Platter"],
  ["chicken_quinoa_bowl", "Chicken Quinoa Bowl"],
  ["paneer_thali", "Paneer Protein Thali"],
  ["oats_berry_bowl", "Oats & Berry Bowl"],
];

const ACTIVE = "sample-meal-btn group text-left p-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition flex items-center gap-2.5";
const INACTIVE = "sample-meal-btn group text-left p-2 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-slate-50 transition flex items-center gap-2.5";

export default function SamplePlates() {
  const { catalog, plate, actions } = useAppState();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Instant Demo Plates (Click to Load)</h3>
          <p className="text-xs text-slate-500">Includes Steamed White Rice, South Indian Meals, Tiffin & Protein Bowls</p>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{SAMPLES.length} Presets</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
        {SAMPLES.map(([key, name]) => {
          const dish = catalog.dishes[key];
          if (!dish) return null;
          const active = plate.dishKey === key && !plate.customPhoto;
          return (
            <button key={key} type="button" onClick={() => actions.loadSample(key)} className={active ? ACTIVE : INACTIVE}>
              <img src={dish.image} alt={name} className="w-12 h-12 rounded-lg object-cover shrink-0 max-w-full" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{name}</div>
                <div className={active ? "text-[11px] text-emerald-700 font-semibold" : "text-[11px] text-slate-500 font-semibold"}>
                  {dish.totals.kcal} kcal • {dish.totals.protein}g P
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
