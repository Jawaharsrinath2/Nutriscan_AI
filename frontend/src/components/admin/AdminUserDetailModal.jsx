import { useEffect, useState } from "react";
import { fetchAdminUserDetail, fetchAdminUserMeals, fetchAdminUserPlans } from "../../api/adminApi";

export default function AdminUserDetailModal({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState("meals"); // "meals" | "plans" | "profile"
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Meals state
  const [selectedDay, setSelectedDay] = useState("");
  const [mealsData, setMealsData] = useState(null);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Plans state
  const [plansData, setPlansData] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planSubTab, setPlanSubTab] = useState("diet"); // "diet" | "workout" | "history"

  const [error, setError] = useState(null);

  // 1. Load User Detail
  useEffect(() => {
    if (!userId) return;
    setLoadingDetail(true);
    setError(null);

    fetchAdminUserDetail(userId)
      .then((data) => {
        setDetailData(data);
        // Default selected day to the most recent day with meals, if any
        if (data.logged_days && data.logged_days.length > 0) {
          setSelectedDay(data.logged_days[0].day);
        } else {
          setSelectedDay(new Date().toISOString().split("T")[0]);
        }
      })
      .catch((err) => setError(err.message || "Failed to load user details"))
      .finally(() => setLoadingDetail(false));
  }, [userId]);

  // 2. Load Meals when selectedDay changes
  useEffect(() => {
    if (!userId || !selectedDay) return;
    setLoadingMeals(true);
    fetchAdminUserMeals(userId, selectedDay)
      .then((res) => setMealsData(res))
      .catch((err) => console.error("Failed to load meals:", err))
      .finally(() => setLoadingMeals(false));
  }, [userId, selectedDay]);

  // 3. Load all plans when switching to "plans" tab
  useEffect(() => {
    if (activeTab === "plans" && userId && plansData.length === 0) {
      setLoadingPlans(true);
      fetchAdminUserPlans(userId)
        .then((res) => setPlansData(res.plans || []))
        .catch((err) => console.error("Failed to load plans:", err))
        .finally(() => setLoadingPlans(false));
    }
  }, [activeTab, userId]);

  if (!userId) return null;

  const u = detailData?.user;
  const prof = detailData?.profile;
  const targets = detailData?.targets;
  const activeDiet = detailData?.active_diet_plan;
  const activeWorkout = detailData?.active_workout_plan;
  const loggedDays = detailData?.logged_days || [];

  // Calculate BMI if profile available
  let bmi = null;
  let bmiLabel = "";
  if (prof && prof.height_cm && prof.weight_kg) {
    const hM = prof.height_cm / 100;
    bmi = (prof.weight_kg / (hM * hM)).toFixed(1);
    if (bmi < 18.5) bmiLabel = "Underweight";
    else if (bmi < 25) bmiLabel = "Healthy";
    else if (bmi < 30) bmiLabel = "Overweight";
    else bmiLabel = "Obese";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            {u?.avatar_url ? (
              <img
                src={u.avatar_url}
                alt=""
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold text-base flex items-center justify-center shadow-sm uppercase">
                {u?.username?.[0] || "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{u?.username || "User Details"}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u?.role === "admin"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {u?.role === "admin" ? "👑 Admin" : "User"}
                </span>
                {u?.is_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                    Suspended
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>{u?.email}</span>
                <span>•</span>
                <span>ID: #{u?.id}</span>
                <span>•</span>
                <span className="capitalize">{u?.provider} auth</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 hover:bg-slate-300 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition"
            title="Close modal (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("meals")}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "meals"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>🥗 Meals & Logs</span>
            {loggedDays.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {loggedDays.length} days
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "plans"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>✨ AI Plans</span>
            {(activeDiet || activeWorkout) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>👤 Biometrics & Targets</span>
            {prof && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
                Setup done
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          {loadingDetail ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading user information…</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
          ) : (
            <>
              {/* TAB 1: MEALS BY DATE */}
              {activeTab === "meals" && (
                <div className="space-y-5">
                  {/* Date Selector Header */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Date Inspector
                        </h4>
                        <p className="text-xs text-slate-500">
                          Select a date to view all meals, food photos, and portion weights logged by this user.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700">Jump to Date:</label>
                        <input
                          type="date"
                          value={selectedDay}
                          onChange={(e) => setSelectedDay(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Quick Day Chips */}
                    {loggedDays.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Dates with Logged Meals:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {loggedDays.map((ld) => {
                            const isSelected = selectedDay === ld.day;
                            return (
                              <button
                                key={ld.day}
                                type="button"
                                onClick={() => setSelectedDay(ld.day)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                <span>📅 {ld.day}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                                  }`}
                                >
                                  {ld.meals_count} meals • {ld.total_kcal} kcal
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Day Totals Banner */}
                  {mealsData && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Calories</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {mealsData.totals.kcal}{" "}
                          <span className="text-xs font-medium text-slate-400">kcal</span>
                        </div>
                        {targets?.kcal && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Target: {targets.kcal} kcal
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-emerald-600 uppercase">Protein</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {mealsData.totals.protein}{" "}
                          <span className="text-xs font-medium text-slate-400">g</span>
                        </div>
                        {targets?.protein && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Target: {targets.protein}g
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-amber-600 uppercase">Carbs</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {mealsData.totals.carbs}{" "}
                          <span className="text-xs font-medium text-slate-400">g</span>
                        </div>
                        {targets?.carbs && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Target: {targets.carbs}g
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-rose-600 uppercase">Fat</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {mealsData.totals.fat}{" "}
                          <span className="text-xs font-medium text-slate-400">g</span>
                        </div>
                        {targets?.fat && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Target: {targets.fat}g
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-teal-600 uppercase">Fiber</div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {mealsData.totals.fiber}{" "}
                          <span className="text-xs font-medium text-slate-400">g</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Digestion</div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm text-center">
                        <div className="text-[11px] font-bold text-sky-600 uppercase">Water Intake</div>
                        <div className="text-lg font-extrabold text-sky-600 mt-0.5">
                          {mealsData.water_glasses}{" "}
                          <span className="text-xs font-medium text-slate-400">glasses</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          ≈ {mealsData.water_glasses * 250} ml
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Meals List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Logged Meals on {selectedDay} ({mealsData?.meals?.length || 0})
                    </h4>

                    {loadingMeals ? (
                      <div className="py-12 text-center text-slate-400 text-xs">Loading meals for {selectedDay}…</div>
                    ) : !mealsData || mealsData.meals.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                        <div className="text-3xl">🍽️</div>
                        <div className="text-sm font-bold text-slate-800">No meals logged on this date</div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          This user did not log any food for {selectedDay}. You can pick an active date from the chips above.
                        </p>
                        {loggedDays.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedDay(loggedDays[0].day)}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
                          >
                            Jump to Latest Log ({loggedDays[0].day})
                          </button>
                        )}
                      </div>
                    ) : (
                      mealsData.meals.map((m) => (
                        <div
                          key={m.id}
                          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row gap-4"
                        >
                          {/* Meal Photo / Thumbnail */}
                          <div className="shrink-0">
                            {m.image_url ? (
                              <button
                                type="button"
                                onClick={() => setZoomedImage(m.image_url)}
                                className="group relative block w-full md:w-32 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner"
                                title="Click to enlarge food photo"
                              >
                                <img
                                  src={m.image_url}
                                  alt={m.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                  🔍 Zoom
                                </div>
                              </button>
                            ) : (
                              <div className="w-full md:w-32 h-28 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                                <span className="text-2xl">🍲</span>
                                <span className="text-[10px]">No Photo</span>
                              </div>
                            )}
                          </div>

                          {/* Meal Info & Breakdown */}
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                                  {m.slot}
                                </span>
                                <h5 className="font-extrabold text-slate-900 text-sm">{m.title}</h5>
                              </div>
                              <span className="text-xs text-slate-400 font-semibold">{m.time}</span>
                            </div>

                            {/* Nutrition Pills */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                                🔥 {m.kcal} kcal
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                                🍗 {m.protein}g protein
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                                🍞 {m.carbs}g carbs
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold">
                                🥑 {m.fat}g fat
                              </span>
                              {m.fiber > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold">
                                  🌾 {m.fiber}g fiber
                                </span>
                              )}
                            </div>

                            {/* Plate Items breakdown */}
                            {m.items && m.items.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Detected Ingredients & Portion:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {m.items.map((it, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium"
                                    >
                                      {it.key || it.name || "Item"}:{" "}
                                      <strong className="text-slate-900">{it.grams || it.portion || 0}g</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AI GENERATED PLANS */}
              {activeTab === "plans" && (
                <div className="space-y-5">
                  {/* Plan Subtab switcher */}
                  <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPlanSubTab("diet")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        planSubTab === "diet"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🥗 AI Diet Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanSubTab("workout")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        planSubTab === "workout"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🏋️ AI Workout Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanSubTab("history")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        planSubTab === "history"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      📜 History ({plansData.length})
                    </button>
                  </div>

                  {/* DIET SUBTAB */}
                  {planSubTab === "diet" && (
                    <div className="space-y-4">
                      {!activeDiet ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                          <div className="text-3xl">🥗</div>
                          <div className="text-sm font-bold text-slate-800">No AI Diet Plan Generated Yet</div>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            This user has not generated an AI diet plan yet or completed the onboarding flow.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                          {/* Metadata Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-slate-900">Active AI Diet Plan</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                  {activeDiet.source}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Generated on {new Date(activeDiet.created_at).toLocaleString()} • Model:{" "}
                                <code className="bg-slate-100 px-1 rounded text-slate-800">
                                  {activeDiet.model || "gemini-flash"}
                                </code>
                              </p>
                            </div>

                            {activeDiet.inputs && (
                              <div className="text-right text-xs text-slate-500">
                                <div>Target: <strong>{activeDiet.inputs.kcal || targets?.kcal} kcal</strong></div>
                                <div>Goal: <strong className="capitalize">{activeDiet.inputs.goal || prof?.goal}</strong></div>
                              </div>
                            )}
                          </div>

                          {/* Summary Note */}
                          {activeDiet.content?.summary && (
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 text-xs font-medium leading-relaxed">
                              💡 {activeDiet.content.summary}
                            </div>
                          )}

                          {/* Meals Breakdown */}
                          {activeDiet.content?.meals && activeDiet.content.meals.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Planned Daily Meal Structure:
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeDiet.content.meals.map((pm, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        {pm.slot} ({pm.time || "Daily"})
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-600">
                                        {pm.kcal} kcal • {pm.protein}g P
                                      </span>
                                    </div>

                                    {pm.items && pm.items.length > 0 && (
                                      <ul className="text-xs text-slate-700 space-y-1">
                                        {pm.items.map((it, i) => (
                                          <li key={i} className="flex items-center justify-between text-[11px]">
                                            <span>• {it.name}</span>
                                            <span className="text-slate-400 font-medium">{it.portion}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}

                                    {pm.note && (
                                      <p className="text-[10px] text-slate-500 italic border-t border-slate-200/60 pt-1">
                                        Note: {pm.note}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tips & Swaps */}
                          {activeDiet.content?.tips && activeDiet.content.tips.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                AI Tips & Recommendations:
                              </span>
                              <ul className="space-y-1 text-xs text-slate-600">
                                {activeDiet.content.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* WORKOUT SUBTAB */}
                  {planSubTab === "workout" && (
                    <div className="space-y-4">
                      {!activeWorkout ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                          <div className="text-3xl">🏋️</div>
                          <div className="text-sm font-bold text-slate-800">No AI Workout Plan Generated Yet</div>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            This user has not generated an AI workout routine yet.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                          {/* Metadata Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-slate-900">Active AI Workout Plan</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                                  {activeWorkout.source}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Generated on {new Date(activeWorkout.created_at).toLocaleString()} • Model:{" "}
                                <code className="bg-slate-100 px-1 rounded text-slate-800">
                                  {activeWorkout.model || "gemini-flash"}
                                </code>
                              </p>
                            </div>

                            {activeWorkout.inputs && (
                              <div className="text-right text-xs text-slate-500">
                                <div>Gym Frequency: <strong>{activeWorkout.inputs.gym_days || prof?.gym_days || 0} days/wk</strong></div>
                                <div>Goal: <strong className="capitalize">{activeWorkout.inputs.goal || prof?.goal}</strong></div>
                              </div>
                            )}
                          </div>

                          {/* Summary Note */}
                          {activeWorkout.content?.summary && (
                            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs font-medium leading-relaxed">
                              🎯 {activeWorkout.content.summary}
                            </div>
                          )}

                          {/* Days / Routine */}
                          {activeWorkout.content?.days && activeWorkout.content.days.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Weekly Exercise Schedule:
                              </h5>
                              <div className="space-y-3">
                                {activeWorkout.content.days.map((wd, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-xs text-slate-900">
                                        📅 {wd.day}: {wd.focus}
                                      </span>
                                      {wd.duration_min > 0 && (
                                        <span className="text-[11px] font-semibold text-slate-500">
                                          ⏱️ {wd.duration_min} mins
                                        </span>
                                      )}
                                    </div>

                                    {wd.exercises && wd.exercises.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200/60">
                                              <th className="py-1">Exercise</th>
                                              <th className="py-1">Sets</th>
                                              <th className="py-1">Reps</th>
                                              <th className="py-1">Rest</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                                            {wd.exercises.map((ex, i) => (
                                              <tr key={i}>
                                                <td className="py-1.5 font-bold text-slate-900">{ex.name}</td>
                                                <td className="py-1.5">{ex.sets} sets</td>
                                                <td className="py-1.5">{ex.reps}</td>
                                                <td className="py-1.5 text-slate-500">{ex.rest || "60s"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-500 italic">Rest / Recovery Day</div>
                                    )}

                                    {wd.note && (
                                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                                        Tip: {wd.note}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Safety tips */}
                          {activeWorkout.content?.safety && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                              ⚠️ <strong>Safety note:</strong> {activeWorkout.content.safety}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* HISTORY SUBTAB */}
                  {planSubTab === "history" && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Generated Plan History ({plansData.length} records):
                      </h5>
                      {loadingPlans ? (
                        <div className="py-8 text-center text-slate-400 text-xs">Loading plan archives…</div>
                      ) : plansData.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">No historical plans found.</div>
                      ) : (
                        <div className="space-y-2">
                          {plansData.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    p.kind === "diet"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-indigo-100 text-indigo-800"
                                  }`}
                                >
                                  {p.kind}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900">
                                    {p.kind === "diet" ? "Diet Nutrition Plan" : "Workout Training Routine"} (v#{p.id})
                                  </div>
                                  <div className="text-slate-400 text-[11px]">
                                    Created {new Date(p.created_at).toLocaleString()} • Model: {p.model || "default"}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                                {p.source}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BIOMETRICS & TARGETS */}
              {activeTab === "profile" && (
                <div className="space-y-5">
                  {!prof ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                      <div className="text-3xl">👤</div>
                      <div className="text-sm font-bold text-slate-800">Onboarding Not Completed</div>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This user has registered but has not completed the onboarding questionnaire yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Biometrics Card */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Biometrics & Body Composition
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Gender & Age</span>
                            <span className="font-extrabold text-slate-900 text-sm capitalize">
                              {prof.sex}, {prof.age} yrs
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Height</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {prof.height_cm} cm
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Current Weight</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {prof.weight_kg} kg
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Target Weight</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {prof.target_weight_kg ? `${prof.target_weight_kg} kg` : "Maintenance"}
                            </span>
                          </div>
                        </div>

                        {/* BMI Badge */}
                        {bmi && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              Body Mass Index (BMI): <strong className="text-slate-900 text-sm">{bmi}</strong>
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                bmiLabel === "Healthy"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : bmiLabel === "Overweight"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {bmiLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Lifestyle & Fitness Card */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Lifestyle & Dietary Preferences
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Primary Goal</span>
                            <span className="font-extrabold text-slate-900 text-sm capitalize">
                              {prof.goal}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Activity Level</span>
                            <span className="font-extrabold text-slate-900 text-sm capitalize">
                              {prof.activity.replace("_", " ")}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Diet Preference</span>
                            <span className="font-extrabold text-slate-900 text-sm capitalize">
                              {prof.diet_pref}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Gym Access</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {prof.gym ? `Yes (${prof.gym_days} days/wk)` : "No Gym"}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Experience</span>
                            <span className="font-extrabold text-slate-900 text-sm capitalize">
                              {prof.experience || "Beginner"}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold block text-[11px]">Home Workouts</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {prof.home_workouts ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>

                        {prof.avoid && prof.avoid.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Foods to Avoid / Allergies:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {prof.avoid.map((av, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100"
                                >
                                  ✕ {av}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Daily Targets */}
                      {targets && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Active Daily Macro Targets (Plan: {targets.plan_key})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-xl">
                              <span className="text-[11px] font-bold text-slate-400 uppercase">Calories</span>
                              <div className="text-lg font-extrabold text-slate-900">{targets.kcal} kcal</div>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-xl">
                              <span className="text-[11px] font-bold text-emerald-600 uppercase">Protein</span>
                              <div className="text-lg font-extrabold text-emerald-800">{targets.protein}g</div>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl">
                              <span className="text-[11px] font-bold text-amber-600 uppercase">Carbs</span>
                              <div className="text-lg font-extrabold text-amber-800">{targets.carbs}g</div>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-xl">
                              <span className="text-[11px] font-bold text-rose-600 uppercase">Fat</span>
                              <div className="text-lg font-extrabold text-rose-800">{targets.fat}g</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>User #{u?.id} details synced live from PostgreSQL</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-white/10">
            <img src={zoomedImage} alt="Food closeup" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
