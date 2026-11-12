import { useAppState } from "../../context/AppState";
import { ACTIVITIES, DIET_PREFS, EXPERIENCE, GOALS, SEXES, labelOf } from "../../lib/profileOptions";

// Step index in the onboarding stepper that edits each row.
const STEP = { about: 0, goal: 1, activity: 2, training: 3, food: 4 };

export default function ProfileCard({ onEdit }) {
  const { profile } = useAppState();
  const p = profile.profile;

  const training = !p.gym
    ? p.home_workouts ? "No gym · home workouts" : "No training right now"
    : `${p.gym_days} day${p.gym_days === 1 ? "" : "s"}/week · ${labelOf(EXPERIENCE, p.experience)}`;

  const rows = [
    { step: STEP.about, label: "You", value: `${labelOf(SEXES, p.sex)}, ${p.age} yrs · ${p.height_cm} cm · ${p.weight_kg} kg`, badge: `BMI ${p.bmi} · ${p.bmi_label}` },
    { step: STEP.goal, label: "Goal", value: labelOf(GOALS, p.goal) + (p.target_weight_kg ? ` → ${p.target_weight_kg} kg` : "") },
    { step: STEP.activity, label: "Daily activity", value: labelOf(ACTIVITIES, p.activity) },
    { step: STEP.training, label: "Training", value: training },
    { step: STEP.food, label: "Food", value: labelOf(DIET_PREFS, p.diet_pref) + (p.avoid.length ? ` · avoids ${p.avoid.join(", ")}` : "") },
  ];

  return (
    <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Your Profile</h2>
          <p className="text-xs text-slate-500">Your targets and plans are built from these answers. Update your weight here after a weigh-in.</p>
        </div>
        <button type="button" onClick={() => onEdit(STEP.about)} className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-400 bg-white text-xs font-semibold text-slate-700 hover:text-emerald-700 transition">
          ✏️ Update weight
        </button>
      </div>

      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="py-3 flex items-center justify-between gap-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{row.label}</dt>
              <dd className="text-sm font-bold text-slate-900">
                {row.value}
                {row.badge && <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">{row.badge}</span>}
              </dd>
            </div>
            <button type="button" onClick={() => onEdit(row.step)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 shrink-0" aria-label={`Edit ${row.label}`}>
              Edit
            </button>
          </div>
        ))}
      </dl>
    </div>
  );
}
