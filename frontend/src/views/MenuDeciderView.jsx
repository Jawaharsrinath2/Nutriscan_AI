import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../context/AppState";
import { PATHS } from "../lib/paths";
import {
  fetchMenuSamples,
  analyzeMenuText,
  analyzeMenuPhoto,
  logRestaurantDish,
} from "../api/menuDeciderApi";

const VERDICT_STYLES = {
  green: {
    border: "border-emerald-300",
    bg: "bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "🟢",
    label: "Best Diet Fit",
  },
  yellow: {
    border: "border-amber-300",
    bg: "bg-amber-50/70",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "🟡",
    label: "Moderate / Share",
  },
  red: {
    border: "border-rose-300",
    bg: "bg-rose-50/70",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    icon: "🔴",
    label: "Budget Breaker",
  },
};

export default function MenuDeciderView() {
  const { day, targets, actions } = useAppState();

  const remainingKcal = Math.max(0, (targets?.kcal ?? 0) - (day?.totals?.kcal ?? 0));
  const remainingProtein = Math.max(0, (targets?.protein ?? 0) - (day?.totals?.protein ?? 0));

  // Tabs: "photo" | "text" | "samples"
  const [activeTab, setActiveTab] = useState("samples");
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [menuText, setMenuText] = useState("");
  const [dietPref, setDietPref] = useState("any");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Filter state for dishes
  const [verdictFilter, setVerdictFilter] = useState("all");

  // Logging state
  const [loggingDishIndex, setLoggingDishIndex] = useState(null);
  const [logSuccess, setLogSuccess] = useState(null);
  const [logSlot, setLogSlot] = useState("Dinner");

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMenuSamples()
      .then((data) => {
        if (data && data.length) {
          setSamples(data);
          setSelectedSampleId(data[0].id);
          setMenuText(data[0].sample_text);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectSample = (sample) => {
    setSelectedSampleId(sample.id);
    setMenuText(sample.sample_text);
    setError(null);
  };

  const handleRunTextAnalysis = async () => {
    if (!menuText.trim()) {
      setError("Please select a sample or paste restaurant menu dishes.");
      return;
    }

    setLoading(true);
    setError(null);
    setLogSuccess(null);

    try {
      const res = await analyzeMenuText({
        menu_text: menuText.trim(),
        remaining_kcal: remainingKcal || 600,
        remaining_protein: remainingProtein || 30.0,
        diet_preference: dietPref,
      });
      setAnalysisResult(res);
    } catch (err) {
      setError(err.message || "Failed to analyze menu text.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setLogSuccess(null);

    try {
      const res = await analyzeMenuPhoto(
        file,
        remainingKcal || 600,
        remainingProtein || 30.0,
        dietPref
      );
      setAnalysisResult(res);
    } catch (err) {
      setError(err.message || "Failed to analyze menu photo.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogDish = async (dish, index) => {
    setLoggingDishIndex(index);
    setLogSuccess(null);
    setError(null);

    try {
      const logged = await logRestaurantDish({
        name: dish.name,
        slot: logSlot,
        estimated_kcal: dish.estimated_kcal,
        estimated_protein: dish.estimated_protein,
        estimated_carbs: dish.estimated_carbs,
        estimated_fat: dish.estimated_fat,
        estimated_fiber: dish.estimated_fiber,
      });

      setLogSuccess({
        dishName: dish.name,
        slot: logSlot,
        kcal: dish.estimated_kcal,
        protein: dish.estimated_protein,
      });

      // Refresh app state to immediately update dashboard totals
      if (actions?.refresh) {
        actions.refresh();
      }
    } catch (err) {
      setError(err.message || "Could not log dish to diary.");
    } finally {
      setLoggingDishIndex(null);
    }
  };

  const filteredDishes = (analysisResult?.dishes || []).filter((d) => {
    if (verdictFilter === "all") return true;
    return d.fit_verdict === verdictFilter;
  });

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Sleek, Compact Restaurant Decider & Diet Budget Header (Original Emerald/Teal Gradient) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white px-4 sm:px-5 py-3.5 shadow-md border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur border border-white/25 p-0.5 shrink-0 flex items-center justify-center text-xl shadow-inner">
            🍽️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                Restaurant Menu Decider
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 shrink-0">
                🟢 Green • 🟡 Yellow • 🔴 Red AI Fit
              </span>
            </div>
            <p className="text-xs text-emerald-100 truncate max-w-xl">
              Snap a menu or paste dishes to instantly verify what fits your daily calorie budget.
            </p>
          </div>
        </div>

        {/* Right side: Live remaining budget pills + Diet Preference filter */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-white font-bold flex items-center gap-1.5 shadow-xs">
            <span>🔥</span>
            <span>{remainingKcal} kcal left</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-white font-bold flex items-center gap-1.5 shadow-xs">
            <span>💪</span>
            <span>{remainingProtein}g protein</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur border border-white/30 rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-emerald-100 font-semibold">Diet:</span>
            <select
              value={dietPref}
              onChange={(e) => setDietPref(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="any" className="bg-teal-900 text-white">Any Food</option>
              <option value="veg" className="bg-teal-900 text-white">Veg Only</option>
              <option value="high_protein" className="bg-teal-900 text-white">High Protein</option>
              <option value="low_carb" className="bg-teal-900 text-white">Low Carb</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Input Control Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        {/* Input Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("samples")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "samples"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>⚡ 1-Click Restaurant Samples</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("photo")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "photo"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>📸 Snap / Upload Menu Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "text"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>✍️ Paste Menu Dishes</span>
          </button>
        </div>

        {/* TAB 1: SAMPLES */}
        {activeTab === "samples" && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-600">
              Select an authentic Indian restaurant sample menu to test instant AI decision making:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {samples.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedSampleId === s.id
                      ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/30"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 leading-tight">
                        {s.restaurant_name}
                      </div>
                      <div className="text-[11px] text-slate-500">{s.cuisine}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <span>{selectedSampleId === s.id ? "✓ Selected" : "Click to load"}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Menu Preview Textbox */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700">
                Menu Items Preview (editable):
              </label>
              <textarea
                rows={5}
                value={menuText}
                onChange={(e) => setMenuText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            <button
              type="button"
              onClick={handleRunTextAnalysis}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Auditing Menu with Gemini AI...</span>
              ) : (
                <>
                  <span>🍽️ Run AI Restaurant Menu Decision</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: PHOTO UPLOAD */}
        {activeTab === "photo" && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-8 sm:p-12 text-center bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xs">
                📸
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Click to Snap or Upload Restaurant Menu Card
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Upload a photo of a physical restaurant paper menu or a screenshot from Swiggy / Zomato / UberEats.
                </p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                Choose Image File
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM TEXT */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Paste or Type Menu Dishes:
              </label>
              <textarea
                rows={6}
                value={menuText}
                onChange={(e) => setMenuText(e.target.value)}
                placeholder="Paste dishes here, e.g.:&#10;Tandoori Chicken Half&#10;Paneer Butter Masala with 2 Naan&#10;Dal Tadka with Phulka&#10;Chicken Biryani"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            <button
              type="button"
              onClick={handleRunTextAnalysis}
              disabled={loading || !menuText.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Auditing Menu with Gemini AI...</span>
              ) : (
                <>
                  <span>🍽️ Run AI Restaurant Menu Decision</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* LOG SUCCESS BANNER */}
      {logSuccess && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="text-sm font-extrabold text-emerald-900">
                Logged to {logSuccess.slot}!
              </div>
              <div className="text-xs text-emerald-700">
                Added <strong>{logSuccess.dishName}</strong> ({logSuccess.kcal} kcal, {logSuccess.protein}g protein) directly into today&apos;s diet targets.
              </div>
            </div>
          </div>
          <Link
            to={PATHS.dashboard}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
          >
            View Dashboard →
          </Link>
        </div>
      )}

      {/* ANALYSIS RESULTS SECTION */}
      {analysisResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Recommendation & Overall Verdict Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                  👑 Top Diet Fit
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  Cuisine: {analysisResult.cuisine_detected}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-400">
                {analysisResult.top_recommended_dish}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysisResult.ai_verdict_summary}
              </p>
            </div>

            {/* Smart Ordering Tips */}
            <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                <span>💡</span>
                <span>Smart Restaurant Hacks</span>
              </div>
              <ul className="text-xs text-amber-900/90 space-y-1.5 list-disc list-inside">
                {(analysisResult.smart_ordering_tips || []).map((tip, idx) => (
                  <li key={idx} className="leading-snug">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Dish Cards Header with Verdict Filters & Slot Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setVerdictFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  verdictFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Dishes ({analysisResult.dishes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setVerdictFilter("green")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  verdictFilter === "green"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>🟢</span>
                <span>Best Fit ({analysisResult.dishes?.filter((d) => d.fit_verdict === "green").length})</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdictFilter("yellow")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  verdictFilter === "yellow"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span>🟡</span>
                <span>Moderate ({analysisResult.dishes?.filter((d) => d.fit_verdict === "yellow").length})</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdictFilter("red")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  verdictFilter === "red"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span>🔴</span>
                <span>Target Breakers ({analysisResult.dishes?.filter((d) => d.fit_verdict === "red").length})</span>
              </button>
            </div>

            {/* Meal Slot Selector for 1-click Logging */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Log to:</span>
              <select
                value={logSlot}
                onChange={(e) => setLogSlot(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Evening Snack">Evening Snack</option>
                <option value="Breakfast">Breakfast</option>
              </select>
            </div>
          </div>

          {/* Dish Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDishes.map((dish, idx) => {
              const style = VERDICT_STYLES[dish.fit_verdict] || VERDICT_STYLES.yellow;
              const isLogging = loggingDishIndex === idx;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-3xl border ${style.border} ${style.bg} transition-all shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Title, Price, Verdict Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {dish.name}
                        </h3>
                        {dish.price && (
                          <span className="text-xs font-bold text-slate-500">
                            {dish.price}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border flex items-center gap-1 shrink-0 ${style.badge}`}
                      >
                        <span>{style.icon}</span>
                        <span>{dish.verdict_badge || style.label}</span>
                      </span>
                    </div>

                    {/* Macros Pill Bar */}
                    <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-white/90 border border-slate-200 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Calories</div>
                        <div className="text-sm font-black text-slate-800">{dish.estimated_kcal}</div>
                        <div className="text-[9px] text-slate-400">kcal</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Protein</div>
                        <div className="text-sm font-black text-emerald-600">{dish.estimated_protein}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Carbs</div>
                        <div className="text-sm font-black text-cyan-600">{dish.estimated_carbs}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Fat</div>
                        <div className="text-sm font-black text-rose-600">{dish.estimated_fat}g</div>
                      </div>
                    </div>

                    {/* Fit Reason */}
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {dish.fit_reason}
                    </p>

                    {/* Smart Hack / Pro Tip */}
                    {dish.smart_hack && (
                      <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-800 flex items-start gap-2">
                        <span className="text-sm shrink-0">✨</span>
                        <div>
                          <strong className="text-slate-900">Pro Hack: </strong>
                          <span>{dish.smart_hack}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 1-Click "Log to Diary" Action */}
                  <button
                    type="button"
                    onClick={() => handleLogDish(dish, idx)}
                    disabled={isLogging}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 ${
                      dish.fit_verdict === "green"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : dish.fit_verdict === "yellow"
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-slate-700 hover:bg-slate-800 text-white"
                    } disabled:opacity-50`}
                  >
                    {isLogging ? (
                      <span>Adding to {logSlot}...</span>
                    ) : (
                      <>
                        <span>✅ I&apos;m Ordering This (Log to {logSlot})</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
