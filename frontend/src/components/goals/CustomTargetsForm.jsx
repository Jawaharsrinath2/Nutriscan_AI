import { useEffect, useState } from "react";
import { useAppState } from "../../context/AppState";

const FIELDS = [
  { name: "kcal", label: "Daily Calories (kcal)", min: 1000, max: 5000, step: 50 },
  { name: "protein", label: "Daily Protein (g)", min: 40, max: 350, step: 5 },
  { name: "carbs", label: "Daily Carbohydrates (g)", min: 20, max: 500, step: 5 },
  { name: "fat", label: "Daily Fat (g)", min: 20, max: 200, step: 5 },
];

const toDraft = (targets) => Object.fromEntries(FIELDS.map((f) => [f.name, String(targets[f.name])]));

export default function CustomTargetsForm() {
  const { targets, actions } = useAppState();
  const [draft, setDraft] = useState(() => toDraft(targets));

  // Picking a preset plan refills the inputs, as before.
  useEffect(() => setDraft(toDraft(targets)), [targets]);

  const save = () =>
    actions.saveCustomTargets(
      Object.fromEntries(FIELDS.map((f) => [f.name, parseInt(draft[f.name], 10) || targets[f.name]]))
    );

  return (
    <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Custom Daily Targets</h2>
        <p className="text-xs text-slate-500">Fine-tune your exact daily calorie, protein, carb, and fat goals</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={`target-${field.name}`} className="block text-xs font-bold text-slate-700 mb-1">{field.label}</label>
            <input
              id={`target-${field.name}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={draft[field.name]}
              onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={save} className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition">
        💾 Save Daily Diet Targets
      </button>
    </div>
  );
}
