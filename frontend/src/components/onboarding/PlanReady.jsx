import { useState } from "react";
import { useAppState } from "../../context/AppState";
import { DietPlanBody } from "../plans/DietPlanCard";
import { WorkoutPlanBody } from "../plans/WorkoutPlanCard";

/** Last onboarding screen: a loader while the AI writes, then both plans in brief. */
export default function PlanReady({ onDone }) {
  const { plans, generating, targets } = useAppState();
  const [tab, setTab] = useState("diet");
  const writing = generating !== null;
  const plan = plans?.[tab];
  const templateNote = plan && plan.source !== "ai";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex-1">
          {writing ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <h1 className="text-2xl font-extrabold text-slate-900">Writing your plan…</h1>
              <p className="text-sm text-slate-500 mt-2">
                A {targets?.kcal.toLocaleString()} kcal diet plan and a weekly workout plan, built around your targets. This takes about 20–40 seconds.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-slate-900">Your plan is ready 🎉</h1>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Daily target <strong className="text-slate-800">{targets?.kcal.toLocaleString()} kcal</strong>, {targets?.protein} g protein. You can regenerate either plan any time from the Goals tab.
              </p>
              {templateNote && (
                <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {plans.ai_ready
                    ? "The AI couldn't answer just now, so this is a template plan. Use Regenerate on the Goals tab in a minute for one written for you."
                    : "No AI key is set, so this is a template plan built from your targets."}
                </p>
              )}
              <div className="flex gap-2 mb-4">
                {["diet", "workout"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"}`}
                  >
                    {k === "diet" ? "🥗 Diet plan" : "🏋️ Workout plan"}
                  </button>
                ))}
              </div>
              {plan ? (
                tab === "diet" ? <DietPlanBody content={plan.content} compact /> : <WorkoutPlanBody content={plan.content} compact />
              ) : (
                <p className="text-sm text-slate-500">No plan was created. You can generate one from the Goals tab.</p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end mt-5">
          <button
            type="button"
            onClick={onDone}
            disabled={writing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 transition"
          >
            Start tracking →
          </button>
        </div>
      </div>
    </div>
  );
}
