import { useAppState } from "../context/AppState";
import { fmt } from "../lib/format";
import SummaryStrip from "../components/layout/SummaryStrip";
import DailyProgressChart from "../components/tracker/DailyProgressChart";
import HydrationTracker from "../components/tracker/HydrationTracker";
import LoggedMeals from "../components/tracker/LoggedMeals";

function formatDisplayDate(dateStr, todayStr) {
  if (!dateStr) return "";
  if (dateStr === todayStr) return "Today";

  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** /dashboard — summary metrics, today's log, progress chart and water. */
export default function TrackerView() {
  const { day, targets, profile, water, selectedDate, todayDate, actions } = useAppState();
  const isToday = !selectedDate || selectedDate === todayDate;

  const remainingKcal = Math.max(0, (targets?.kcal ?? 0) - (day?.totals?.kcal ?? 0));
  const remainingProtein = Math.max(0, (targets?.protein ?? 0) - (day?.totals?.protein ?? 0));

  const weightKg = profile?.profile?.weight_kg;
  const GLASS_ML = 250;
  const goalGlasses = weightKg
    ? Math.max(6, Math.round((weightKg * 35) / GLASS_ML))
    : (water?.goal || 8);
  const currentGlasses = water?.glasses ?? 0;
  const remainingLitres = Math.max(0, ((goalGlasses - currentGlasses) * GLASS_ML) / 1000).toFixed(1);

  const shiftDay = (delta) => {
    const cur = selectedDate || todayDate;
    const [y, m, d] = cur.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + delta);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const nd = String(dateObj.getDate()).padStart(2, "0");
    const nextStr = `${ny}-${nm}-${nd}`;
    if (nextStr <= todayDate) {
      actions.setSelectedDate(nextStr);
    }
  };

  return (
    <section className="space-y-5">
      {/* Date Navigation & Calendar Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition shadow-sm"
            title="Previous Day"
          >
            <span>←</span>
            <span className="hidden sm:inline">Previous Day</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-sm">📅</span>
            <input
              type="date"
              value={selectedDate || todayDate}
              max={todayDate}
              onChange={(e) => e.target.value && actions.setSelectedDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer"
            />
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isToday ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {formatDisplayDate(selectedDate, todayDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => shiftDay(1)}
            disabled={isToday}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition shadow-sm"
            title="Next Day"
          >
            <span className="hidden sm:inline">Next Day</span>
            <span>→</span>
          </button>
        </div>

        {!isToday && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
              <span>🕒</span>
              <span>Viewing past log: <strong>{formatDisplayDate(selectedDate, todayDate)}</strong></span>
            </span>
            <button
              type="button"
              onClick={() => actions.setSelectedDate(todayDate)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
            >
              Return to Today →
            </button>
          </div>
        )}
      </div>

      {/* Remaining Today & Protein Left Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
            {isToday ? "Daily Budget Status" : `Log for ${formatDisplayDate(selectedDate, todayDate)}`}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {isToday ? "Today's Nutrition Dashboard" : `Nutrition Dashboard (${selectedDate})`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isToday
              ? "Track your logged meals, remaining targets and hydration"
              : `Meals, macros, and hydration logged on ${selectedDate}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
            <span className="text-xl">🔥</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isToday ? "Remaining Today" : "Remaining Target"}
              </div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-700">{fmt(remainingKcal)} kcal</div>
            </div>
          </div>
          <div className="bg-white border border-indigo-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
            <span className="text-xl">💪</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protein Left</div>
              <div className="text-sm sm:text-base font-extrabold text-indigo-700">{fmt(remainingProtein)}g</div>
            </div>
          </div>
          <div className="bg-white border border-sky-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
            <span className="text-xl">💧</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Water Left</div>
              <div className="text-sm sm:text-base font-extrabold text-sky-700">{remainingLitres}L</div>
            </div>
          </div>
        </div>
      </div>

      <SummaryStrip />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <LoggedMeals />
        <div className="lg:col-span-5 space-y-6">
          <DailyProgressChart />
          <HydrationTracker />
        </div>
      </div>
    </section>
  );
}
