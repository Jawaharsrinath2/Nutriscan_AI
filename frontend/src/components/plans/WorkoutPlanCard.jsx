import { useAppState } from "../../context/AppState";
import PlanCardFrame from "./PlanCardFrame";

export function WorkoutPlanBody({ content, compact = false }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">{content.summary}</p>
      <div className="space-y-2">
        {content.days.map((day) => {
          const rest = day.focus.toLowerCase() === "rest";
          return (
            <div key={day.day} className={`rounded-xl border ${rest ? "border-slate-100 bg-slate-50/60" : "border-slate-200"} px-3 py-2`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">
                  {day.day} <span className={`ml-1 text-xs font-semibold ${rest ? "text-slate-400" : "text-emerald-700"}`}>· {day.focus}</span>
                </div>
                {!rest && <span className="text-xs text-slate-500">{day.duration_min} min</span>}
              </div>
              {!rest && !compact && (
                <ul className="mt-1.5 space-y-0.5">
                  {day.exercises.map((ex, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-800">{ex.name}</span>
                      <span className="text-slate-500 shrink-0 ml-2">
                        {ex.sets} × {ex.reps}
                        {ex.rest ? ` · rest ${ex.rest}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!rest && compact && <p className="text-[11px] text-slate-500 mt-0.5">{day.exercises.slice(1, 4).map((e) => e.name).join(" · ")}</p>}
              {day.note && <p className="text-[11px] text-slate-500 mt-1">{day.note}</p>}
            </div>
          );
        })}
      </div>
      {!compact && content.tips.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tips</h3>
          <ul className="list-disc pl-5 text-xs text-slate-700 space-y-0.5">{content.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {!compact && content.safety && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ {content.safety}</p>}
    </div>
  );
}

export default function WorkoutPlanCard() {
  const { plans } = useAppState();
  const plan = plans?.workout;
  return (
    <PlanCardFrame kind="workout" title="Workout Plan" icon="🏋️" plan={plan}>
      {plan && <WorkoutPlanBody content={plan.content} />}
    </PlanCardFrame>
  );
}
