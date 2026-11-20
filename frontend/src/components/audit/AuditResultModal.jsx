import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { PATHS } from "../../lib/paths";
import { logPackagedFoodToDiary } from "../../api/auditApi";

const GRADE_STYLES = {
  A: {
    bg: "from-emerald-500 to-green-600",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    label: "Grade A - Excellent Health Quality",
  },
  B: {
    bg: "from-green-500 to-lime-600",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800 border-green-200",
    label: "Grade B - Good Nutritional Quality",
  },
  C: {
    bg: "from-amber-400 to-yellow-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Grade C - Moderate / Mindful Portions",
  },
  D: {
    bg: "from-orange-500 to-amber-600",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Grade D - Poor Nutritional Profile",
  },
  E: {
    bg: "from-rose-500 to-red-600",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    label: "Grade E - Highly Processed / Unhealthy",
  },
};

const NOVA_LABELS = {
  1: { text: "NOVA 1: Unprocessed / Natural", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  2: { text: "NOVA 2: Culinary Ingredient", color: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { text: "NOVA 3: Processed Food", color: "bg-amber-50 text-amber-700 border-amber-200" },
  4: { text: "NOVA 4: Ultra-Processed Food (UPF)", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function AuditResultModal({
  isOpen,
  onClose,
  loading = false,
  error = null,
  auditResult = null,
  onOpenShareCard,
}) {
  const [viewServing, setViewServing] = useState(true);
  const [consumedGrams, setConsumedGrams] = useState(50);
  const [selectedSlot, setSelectedSlot] = useState("Evening Snack");
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccess, setLogSuccess] = useState(null);
  const [logError, setLogError] = useState(null);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Update default grams when auditResult arrives
  useEffect(() => {
    if (auditResult?.nutriments?.serving_grams) {
      setConsumedGrams(auditResult.nutriments.serving_grams);
    }
    setLogSuccess(null);
    setLogError(null);
  }, [auditResult]);

  if (!isOpen) return null;

  const gradeStyle = GRADE_STYLES[auditResult?.nutriscore_grade] || GRADE_STYLES.C;
  const novaStyle = NOVA_LABELS[auditResult?.nova_group] || NOVA_LABELS[4];

  // Compute live portion macros
  const computePortionMacros = (grams) => {
    if (!auditResult?.nutriments) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const n = auditResult.nutriments;
    const ratio = (grams || 0) / 100;
    return {
      kcal: Math.round(n.kcal_100g * ratio),
      protein: +(n.protein_100g * ratio).toFixed(1),
      carbs: +(n.carbs_100g * ratio).toFixed(1),
      fat: +(n.fat_100g * ratio).toFixed(1),
      fiber: +(n.fiber_100g * ratio).toFixed(1),
    };
  };

  const portionMacros = computePortionMacros(consumedGrams);

  const handleLogToDiary = async () => {
    if (!auditResult) return;
    setLogLoading(true);
    setLogError(null);
    setLogSuccess(null);

    const payload = {
      product_name: auditResult.product_name,
      brand: auditResult.brand,
      image_url: auditResult.image_url,
      grams: parseFloat(consumedGrams),
      slot: selectedSlot,
      kcal: portionMacros.kcal,
      protein: portionMacros.protein,
      carbs: portionMacros.carbs,
      fat: portionMacros.fat,
      fiber: portionMacros.fiber,
    };

    try {
      const logged = await logPackagedFoodToDiary(payload);
      setLogSuccess({
        slot: logged.slot,
        title: logged.title,
        kcal: logged.kcal,
        protein: logged.protein,
      });
    } catch (err) {
      setLogError(err.message || "Failed to log packaged food to today's diary.");
    } finally {
      setLogLoading(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CASE 1: LOADING STATE (Instant futuristic scanning HUD) */}
        {loading && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Spinning animated outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              {/* Pulsing inner glow */}
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-4xl animate-pulse">
                🔍
              </div>
              {/* Laser scan line effect */}
              <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />
            </div>

            <div className="space-y-2 max-w-md">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold tracking-wider uppercase border border-emerald-200">
                ⚡ Gemini Vision &amp; Food Intelligence
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Auditing Packaged Food Label...
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Inspecting nutrition facts table, detecting palm oil, hidden sugars &amp; additives, and computing NutriScore grade.
              </p>
            </div>

            {/* Stepper indicators */}
            <div className="w-full max-w-xs space-y-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Image received &amp; normalized</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin shrink-0" />
                <span>Decoding ingredients &amp; additives (INS/E-codes)...</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">3</span>
                <span>Generating NutriScore &amp; Health Verdict</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Cancel Inspection
            </button>
          </div>
        )}

        {/* CASE 2: ERROR STATE */}
        {!loading && error && (
          <div className="p-8 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-900">Product Not Found</h3>
              <p className="text-xs sm:text-sm text-slate-600">{error}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-sm transition"
              >
                Close &amp; Try Another Item
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: AUDIT RESULT LOADED */}
        {!loading && !error && auditResult && (
          <>
            {/* Modal Top Sticky Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/90 sticky top-0 z-10 backdrop-blur">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {auditResult.image_url ? (
                  <img
                    src={auditResult.image_url}
                    alt={auditResult.product_name}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl border border-slate-200 p-1 bg-white shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                    📦
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {auditResult.brand && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        {auditResult.brand}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${novaStyle.color}`}>
                      {novaStyle.text}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate leading-snug">
                    {auditResult.product_name}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Barcode: {auditResult.barcode}
                  </p>
                </div>
              </div>

              {/* Right Header: Score Badge + Share + Close */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* NutriScore badge */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${gradeStyle.bg} text-white flex flex-col items-center justify-center shadow-md shrink-0`}
                >
                  <span className="text-xl sm:text-2xl font-black leading-none">{auditResult.nutriscore_grade}</span>
                  <span className="text-[8px] uppercase tracking-wider font-bold">NutriScore</span>
                </div>

                {/* Health Score */}
                <div className="hidden sm:block text-right">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Health Score</div>
                  <div className="text-lg font-black text-slate-800 leading-none">
                    {auditResult.health_score} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                  </div>
                </div>

                {/* Share Card Button */}
                <button
                  type="button"
                  onClick={onOpenShareCard}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  title="Generate shareable social card"
                >
                  <span>📸</span>
                  <span className="hidden sm:inline">Share</span>
                </button>

                {/* Close Modal Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition font-bold text-sm"
                  title="Close Inspection"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Success Banner if Logged */}
              {logSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                      ✓
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold">
                        Successfully added to your {logSuccess.slot}!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        {logSuccess.kcal} kcal &amp; {logSuccess.protein}g protein logged into today&apos;s nutrition dashboard.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={PATHS.dashboard}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm whitespace-nowrap"
                  >
                    View on Dashboard →
                  </Link>
                </div>
              )}

              {/* Error Banner if Log Failed */}
              {logError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  ⚠️ {logError}
                </div>
              )}

              {/* AI Health Verdict Callout */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 border border-emerald-200/60 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <span>🤖 AI Nutritionist Verdict</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                  {auditResult.verdict}
                </p>
              </div>

              {/* Red Flags & Green Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Flags */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                    <span>🚨 Red Flags &amp; Watchouts</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                      {auditResult.red_flags.length}
                    </span>
                  </div>
                  {auditResult.red_flags.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs italic">
                      No critical red flags detected.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {auditResult.red_flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs font-medium flex items-start gap-2"
                        >
                          <span className="text-rose-500 text-xs mt-0.5">⚠️</span>
                          <span className="leading-snug">{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Green Highlights */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <span>🌿 Positive Highlights</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                      {auditResult.green_flags.length}
                    </span>
                  </div>
                  {auditResult.green_flags.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs italic">
                      No significant positive highlights.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {auditResult.green_flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2"
                        >
                          <span className="text-emerald-500 text-xs mt-0.5">✓</span>
                          <span className="leading-snug">{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrition Facts Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Nutrition Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Official values verified per pack
                    </p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setViewServing(true)}
                      className={`px-3 py-1 rounded-lg transition ${
                        viewServing ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Per Serving ({auditResult.nutriments?.serving_size || `${auditResult.nutriments?.serving_grams}g`})
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewServing(false)}
                      className={`px-3 py-1 rounded-lg transition ${
                        !viewServing ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Per 100g
                    </button>
                  </div>
                </div>

                {/* Macro Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-medium">Calories</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {viewServing ? auditResult.nutriments.serving_kcal : auditResult.nutriments.kcal_100g}
                      <span className="text-[10px] font-normal text-slate-400"> kcal</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
                    <span className="text-[11px] text-blue-700 font-medium">Protein</span>
                    <div className="text-base font-black text-blue-900 mt-0.5">
                      {viewServing ? auditResult.nutriments.serving_protein : auditResult.nutriments.protein_100g}
                      <span className="text-[10px] font-normal text-blue-500"> g</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
                    <span className="text-[11px] text-amber-700 font-medium">Carbohydrates</span>
                    <div className="text-base font-black text-amber-900 mt-0.5">
                      {viewServing ? auditResult.nutriments.serving_carbs : auditResult.nutriments.carbs_100g}
                      <span className="text-[10px] font-normal text-amber-500"> g</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-center">
                    <span className="text-[11px] text-rose-700 font-medium">Fats</span>
                    <div className="text-base font-black text-rose-900 mt-0.5">
                      {viewServing ? auditResult.nutriments.serving_fat : auditResult.nutriments.fat_100g}
                      <span className="text-[10px] font-normal text-rose-500"> g</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-center">
                    <span className="text-[11px] text-purple-700 font-medium">Sugars</span>
                    <div className="text-base font-black text-purple-900 mt-0.5">
                      {viewServing ? auditResult.nutriments.serving_sugars : auditResult.nutriments.sugars_100g}
                      <span className="text-[10px] font-normal text-purple-500"> g</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <span className="text-[11px] text-emerald-700 font-medium">Fiber</span>
                    <div className="text-base font-black text-emerald-900 mt-0.5">
                      {viewServing
                        ? (auditResult.nutriments.fiber_100g * (auditResult.nutriments.serving_grams / 100)).toFixed(1)
                        : auditResult.nutriments.fiber_100g}
                      <span className="text-[10px] font-normal text-emerald-500"> g</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-medium">Sodium</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {Math.round(
                        (viewServing
                          ? auditResult.nutriments.sodium_100g * (auditResult.nutriments.serving_grams / 100)
                          : auditResult.nutriments.sodium_100g) * 1000
                      )}
                      <span className="text-[10px] font-normal text-slate-400"> mg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Ingredients List */}
              {auditResult.ingredients_text && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ingredients List
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    {auditResult.ingredients_text}
                  </p>
                </div>
              )}

              {/* Healthy Swaps */}
              <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-2xl border border-emerald-200/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <span>💡 Better Clean Food Alternatives</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {auditResult.healthy_swaps.map((swap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-emerald-200/80 shadow-2xs text-xs font-medium text-slate-800 flex items-start gap-2"
                    >
                      <span className="text-emerald-600 text-sm shrink-0">✨</span>
                      <span className="leading-snug">{swap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DIARY INTEGRATION SECTION */}
              <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                      <span>🍽️ Daily Budget Integration</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black mt-1">
                      Did you eat this? Add to today&apos;s diet diary
                    </h3>
                  </div>

                  {/* Portion summary tag */}
                  <div className="bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 rounded-xl shrink-0 text-right">
                    <span className="text-xs text-emerald-100 font-bold block">{portionMacros.kcal} kcal</span>
                    <span className="text-[10px] text-emerald-200 block">
                      {portionMacros.protein}g Protein • {portionMacros.carbs}g Carbs
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/15">
                  {/* Grams Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-100">
                      <span>Portion Consumed:</span>
                      <span className="font-mono text-white">{consumedGrams} grams</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={consumedGrams}
                      onChange={(e) => setConsumedGrams(Number(e.target.value))}
                      className="w-full accent-white h-2 bg-white/20 rounded-lg cursor-pointer"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setConsumedGrams(auditResult.nutriments?.serving_grams || 25)}
                        className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white"
                      >
                        1 Serving ({auditResult.nutriments?.serving_grams || 25}g)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsumedGrams(50)}
                        className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white"
                      >
                        50g
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsumedGrams(100)}
                        className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white"
                      >
                        Full Pack (100g)
                      </button>
                    </div>
                  </div>

                  {/* Slot & Add Button */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-100">
                      Select Meal Slot:
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["Breakfast", "Lunch", "Evening Snack", "Dinner"].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition text-center truncate ${
                            selectedSlot === slot
                              ? "bg-white text-emerald-900 shadow-md font-extrabold"
                              : "bg-white/15 hover:bg-white/25 text-white"
                          }`}
                        >
                          {slot === "Evening Snack" ? "Snack" : slot}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={logLoading}
                      onClick={handleLogToDiary}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 mt-1"
                    >
                      {logLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                          <span>Logging to Diet Diary...</span>
                        </>
                      ) : (
                        <>
                          <span>🍽️ Add {portionMacros.kcal} kcal to Today&apos;s Target</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
