import { useAppState } from "../../context/AppState";

function groupByMenu(dishList) {
  const groups = new Map();
  for (const dish of dishList) {
    const group = dish.menu_group ?? "Other Dishes";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(dish);
  }
  return [...groups.entries()];
}

export default function DishProfileSelect() {
  const { catalog, plate, actions } = useAppState();

  return (
    <>
      <div className="flex items-center justify-between">
        <label htmlFor="dishProfileSelect" className="text-xs font-bold text-slate-700">
          Identified Dish Profile (or switch to match your plate):
        </label>
        <span className="text-[11px] text-emerald-600 font-medium">{plate.source === "scan" ? "Auto-detected" : "Selected"}</span>
      </div>
      <select
        id="dishProfileSelect"
        value={plate.dishKey ?? ""}
        onChange={(e) => actions.switchDish(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" disabled>
          Detected plate — pick a dish to override
        </option>
        {groupByMenu(catalog.dishList).map(([group, dishes]) => (
          <optgroup key={group} label={group}>
            {dishes.map((dish) => (
              <option key={dish.key} value={dish.key}>
                {dish.menu_label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </>
  );
}
