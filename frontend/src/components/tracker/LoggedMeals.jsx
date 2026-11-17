import { useAppState } from "../../context/AppState";

export default function LoggedMeals() {
  const { day, selectedDate, todayDate, actions } = useAppState();
  const isToday = !selectedDate || selectedDate === todayDate;

  return (
    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isToday ? "Today's Logged Meals" : `Logged Meals (${day?.day || selectedDate})`}
          </h2>
          <p className="text-xs text-slate-500">
            {isToday ? "Track every meal you scanned and approved today" : `Past meals recorded on ${day?.day || selectedDate}`}
          </p>
        </div>
        <button
          type="button"
          onClick={actions.clearLog}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
        >
          🗑️ {isToday ? "Reset Today's Log" : "Clear Log for this Day"}
        </button>
      </div>

      <div className="space-y-3">
        {day.meals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-700">
              {isToday ? "No meals logged yet today" : "No meals were recorded on this date"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isToday
                ? 'Scan a food photo in the Food Scanner tab and click "Eat & Add to Today\'s Diet Log".'
                : "Select another date from the calendar above to view your previous logs."}
            </p>
          </div>
        ) : (
          day.meals.map((meal) => (
            <div
              key={meal.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3">
                {meal.image_url ? (
                  <img src={meal.image_url} alt={meal.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 max-w-full" />
                ) : (
                  <div className="w-14 h-14 rounded-xl shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center text-xl">🍽️</div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{meal.slot}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{meal.time}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{meal.title}</h4>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs font-semibold">
                    <span className="text-emerald-700">{meal.kcal} kcal</span>
                    <span className="text-indigo-600">{meal.protein}g Protein</span>
                    <span className="text-amber-700">{meal.carbs}g Carbs</span>
                    <span className="text-rose-600">{meal.fat}g Fat</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => actions.deleteMeal(meal.id)}
                className="self-end sm:self-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
