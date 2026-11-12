import { useAppState } from "../../context/AppState";

const fmtDate = (iso) => new Date(iso.endsWith("Z") ? iso : iso + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Shared chrome for the diet and workout plan cards: title, source badge, stale notice, Regenerate. */
export default function PlanCardFrame({ kind, title, icon, plan, children }) {
  const { plans, generating, actions } = useAppState();
  const busy = generating === kind || generating === "both";
  const isAi = plan?.source === "ai";

  return (
    <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {icon} {title}
          </h2>
          {plan ? (
            <p className="text-xs text-slate-500">
              {isAi ? `Written by AI (${plan.model})` : "Template plan"} · {fmtDate(plan.generated_at)} · for {plan.inputs.weight_kg} kg, {plan.inputs.kcal.toLocaleString()} kcal
            </p>
          ) : (
            <p className="text-xs text-slate-500">No plan yet.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => actions.generatePlans(kind)}
          disabled={busy || generating !== null}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition"
        >
          {busy ? "Writing…" : plan ? "↻ Regenerate" : "✨ Generate"}
        </button>
      </div>

      {plan?.stale && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <strong>Out of date:</strong> {plan.stale_reason} Regenerate to update the plan.
        </div>
      )}
      {!isAi && plans?.ai_ready && plan && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          This is a template. {plans.ai_error ? `The AI could not answer (${plans.ai_error.slice(0, 120)}…). ` : ""}Tap Regenerate for a plan written for you.
        </div>
      )}
      {!plans?.ai_ready && plan && <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">{plans.ai_reason}</div>}

      {busy ? (
        <div className="py-10 text-center text-sm text-slate-500">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          Writing your {kind} plan… this takes 10–30 seconds.
        </div>
      ) : (
        plan && children
      )}
    </div>
  );
}
