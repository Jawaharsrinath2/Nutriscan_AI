import { useState } from "react";
import { useAppState } from "../../context/AppState";
import { fmt } from "../../lib/format";
import DietVerdict from "./DietVerdict";
import ImpactBars from "./ImpactBars";
import LogMealBar from "./LogMealBar";
import MacroCards from "./MacroCards";
import MacroDoughnut from "./MacroDoughnut";
import PortionScale from "./PortionScale";
import SocialShareCardModal from "../share/SocialShareCardModal";

export default function NutritionReport() {
  const { plate, evaluation, actions } = useAppState();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">2. Pre-Meal Nutrition Report</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {fmt(evaluation?.totals.total_grams)}g Total Portion
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{plate.title || "No Meal Selected"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {evaluation && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Generate high-res social share card for Instagram / WhatsApp"
            >
              <span>📸</span>
              <span className="hidden sm:inline">Share Card</span>
            </button>
          )}
          <button
            type="button"
            onClick={actions.openConfirmWeights}
            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            title="Adjust approximate portion weights for each food item"
          >
            <span>⚖️</span>
            <span>Set Approx Weights</span>
          </button>
          <PortionScale />
        </div>
      </div>

      <MacroCards evaluation={evaluation} />
      <DietVerdict evaluation={evaluation} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 items-center">
        <ImpactBars impact={evaluation?.impact} />
        <MacroDoughnut split={evaluation?.split} />
      </div>

      <LogMealBar />

      <SocialShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        type="meal"
        data={{
          title: plate.title,
          image_url: plate.image_url,
          kcal: evaluation?.totals?.kcal,
          protein: evaluation?.totals?.protein,
          carbs: evaluation?.totals?.carbs,
          fat: evaluation?.totals?.fat,
          fiber: evaluation?.totals?.fiber,
          total_grams: evaluation?.totals?.total_grams,
          verdict: evaluation?.verdict?.summary || evaluation?.verdict?.notes,
        }}
      />
    </div>
  );
}
