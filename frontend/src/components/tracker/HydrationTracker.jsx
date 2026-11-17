import { useAppState, WATER_MAX_GLASSES } from "../../context/AppState";

const GLASS_ML = 250;

export default function HydrationTracker() {
  const { profile, water, actions } = useAppState();

  const weightKg = profile?.profile?.weight_kg;
  // Recommended hydration: ~35ml per kg of body weight; 1 glass = 250ml
  const goalGlasses = weightKg
    ? Math.max(6, Math.round((weightKg * 35) / GLASS_ML))
    : (water?.goal || 8);
  const currentGlasses = water?.glasses ?? 0;

  const currentMl = currentGlasses * GLASS_ML;
  const targetMl = goalGlasses * GLASS_ML;
  const currentLitres = (currentMl / 1000).toFixed(1);
  const targetLitres = (targetMl / 1000).toFixed(1);

  const remainingGlasses = Math.max(0, goalGlasses - currentGlasses);
  const pct = Math.min(100, Math.round((currentGlasses / goalGlasses) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>💧</span>
              <span>Daily Hydration Tracker</span>
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pct >= 100
                  ? "bg-emerald-100 text-emerald-800"
                  : pct >= 50
                  ? "bg-sky-100 text-sky-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {pct >= 100 ? "Goal Met! 🎉" : `${pct}%`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {weightKg ? (
              <span>
                Personalized target for your weight (<strong>{weightKg} kg</strong> × 35ml):{" "}
                <strong className="text-slate-700">{targetLitres}L / day</strong>
              </span>
            ) : (
              <span>Recommended baseline intake: <strong>{targetLitres}L / day</strong></span>
            )}
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm sm:text-base font-extrabold text-sky-600">
            {currentLitres}L <span className="text-slate-400 font-semibold text-xs">/ {targetLitres}L</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {currentGlasses} of {goalGlasses} glasses
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
          <span>0L</span>
          <span>{remainingGlasses > 0 ? `${remainingGlasses} glasses left (${((remainingGlasses * GLASS_ML) / 1000).toFixed(1)}L)` : "Daily Goal Completed! ✨"}</span>
          <span>{targetLitres}L</span>
        </div>
      </div>

      {/* Interactive Water Drops Grid */}
      <div className="flex flex-wrap gap-1.5 justify-center py-1">
        {Array.from({ length: Math.min(WATER_MAX_GLASSES, Math.max(goalGlasses, currentGlasses)) }, (_, i) => {
          const filled = i < currentGlasses;
          const isTarget = i === goalGlasses - 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => actions.setWaterGlasses(i + 1 === currentGlasses ? i : i + 1)}
              title={`Click to set ${i + 1} glasses (${((i + 1) * GLASS_ML) / 1000}L)`}
              className={`w-7 h-8 sm:w-8 sm:h-9 rounded-xl flex flex-col items-center justify-center transition-all ${
                filled
                  ? "bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-sm shadow-sky-500/30 scale-100 hover:scale-105"
                  : isTarget
                  ? "bg-sky-50/80 border-2 border-dashed border-sky-300 text-sky-400 hover:bg-sky-100/70"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-xs">💧</span>
              <span className="text-[9px] font-bold mt-[-2px]">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => actions.changeWater(-1)}
            disabled={currentGlasses === 0}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition"
            title="Minus 1 Glass"
          >
            - 1 Glass
          </button>
          {currentGlasses > 0 && (
            <button
              type="button"
              onClick={actions.resetWater}
              className="px-2 py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
              title="Reset Water to 0"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => actions.changeWater(1)}
            disabled={currentGlasses >= WATER_MAX_GLASSES}
            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed text-sky-800 border border-sky-200 text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <span>+ 250ml</span>
            <span className="text-[10px] text-sky-600 font-medium">(1 Glass)</span>
          </button>
          <button
            type="button"
            onClick={() => actions.changeWater(Math.min(2, WATER_MAX_GLASSES - currentGlasses))}
            disabled={currentGlasses >= WATER_MAX_GLASSES}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-sky-500/20"
          >
            <span>+ 500ml</span>
            <span className="text-[10px] text-sky-100 font-medium">(Bottle)</span>
          </button>
        </div>
      </div>

      {/* Health Tip */}
      <div className="bg-sky-50/60 border border-sky-100 rounded-xl px-3 py-2 text-[11px] text-sky-900 flex items-center gap-2">
        <span className="text-sm">💡</span>
        <span>
          {currentGlasses >= WATER_MAX_GLASSES
            ? "Daily maximum water limit reached (5.0L). Excellent job staying well hydrated!"
            : currentGlasses >= goalGlasses
            ? "Awesome! You have met your body's fluid requirement for today."
            : "Tip: Drink water 20 minutes before meals to improve satiety and digestion."}
        </span>
      </div>
    </div>
  );
}
