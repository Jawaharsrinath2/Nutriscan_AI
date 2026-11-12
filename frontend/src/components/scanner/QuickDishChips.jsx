import { useAppState } from "../../context/AppState";

const CHIPS = [
  ["steamed_white_rice", "🍚 White Rice"],
  ["south_indian_meals", "🍃 Full Meals"],
  ["idli_sambar", "⚪ Idli Sambar"],
  ["masala_dosa", "🥞 Masala Dosa"],
  ["ven_pongal_vada", "🍲 Ven Pongal"],
  ["sambar_rice", "🍛 Sambar Sadam"],
  ["curd_rice", "🥣 Curd Rice"],
  ["lemon_rice", "🍋 Lemon Rice"],
  ["tamarind_rice", "🌶️ Puliyodharai"],
  ["ragi_dosa_platter", "🌾 Ragi Dosa"],
  ["uttapam_platter", "🧅 Uttapam"],
  ["idiyappam_kurma", "🍜 Idiyappam"],
  ["parotta_salna", "🫓 Parotta Salna"],
  ["chettinad_chicken_meal", "🍗 Chettinad Chicken"],
];

const ACTIVE = "quick-dish-chip px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-sm transition";
const INACTIVE = "quick-dish-chip px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 transition";

export default function QuickDishChips() {
  const { plate, actions } = useAppState();
  return (
    <div className="pt-1">
      <div className="text-[11px] font-bold text-slate-500 mb-1.5">🇮🇳 Quick Select South Indian Dish (keeps your uploaded photo):</div>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => actions.quickDish(key)} className={plate.dishKey === key ? ACTIVE : INACTIVE}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
