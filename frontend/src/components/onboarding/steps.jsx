import { useEffect, useRef, useState } from "react";
import { useAppState } from "../../context/AppState";
import {
  ACTIVITIES,
  AVOID_OPTIONS,
  DIET_PREFS,
  EXPERIENCE,
  GOALS,
  SEXES,
  bmiOf,
  toApiProfile,
} from "../../lib/profileOptions";
import OptionCards, { Field, INPUT } from "./OptionCards";

/* Each step: { key, title, subtitle, Component, valid(form) } — used by OnboardingView. */

function AboutStep({ form, set }) {
  const bmi = bmiOf(form.height_cm, form.weight_kg);
  return (
    <div className="space-y-5">
      <OptionCards name="Sex" options={SEXES} value={form.sex} onChange={(v) => set("sex", v)} columns={2} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field id="ob-age" label="Age (years)">
          <input id="ob-age" type="number" min="13" max="100" className={INPUT} value={form.age} onChange={(e) => set("age", e.target.value)} />
        </Field>
        <Field id="ob-height" label="Height (cm)">
          <input id="ob-height" type="number" min="100" max="250" className={INPUT} value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
        </Field>
        <Field id="ob-weight" label="Weight (kg)">
          <input id="ob-weight" type="number" min="25" max="300" step="0.5" className={INPUT} value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
        </Field>
      </div>
      {bmi && (
        <p className="text-xs text-slate-500">
          BMI <strong className="text-slate-900">{bmi}</strong> — {bmi < 18.5 ? "underweight" : bmi < 25 ? "healthy range" : bmi < 30 ? "overweight" : "obese range"}
        </p>
      )}
    </div>
  );
}

function GoalStep({ form, set }) {
  return (
    <div className="space-y-5">
      <OptionCards name="Goal" options={GOALS} value={form.goal} onChange={(v) => set("goal", v)} />
      <Field id="ob-target" label="Target weight (kg) — optional" hint="Used to estimate how long your plan will take.">
        <input id="ob-target" type="number" min="25" max="300" step="0.5" className={INPUT} value={form.target_weight_kg} onChange={(e) => set("target_weight_kg", e.target.value)} />
      </Field>
    </div>
  );
}

function ActivityStep({ form, set }) {
  return <OptionCards name="Daily activity" options={ACTIVITIES} value={form.activity} onChange={(v) => set("activity", v)} />;
}

function TrainingStep({ form, set }) {
  return (
    <div className="space-y-5">
      <OptionCards
        name="Gym"
        columns={2}
        options={[
          { key: "yes", label: "Yes, I train", icon: "🏋️", desc: "Gym, home weights or classes" },
          { key: "no", label: "Not right now", icon: "🛋️", desc: "I can still get a plan to start with" },
        ]}
        value={form.gym === null ? null : form.gym ? "yes" : "no"}
        onChange={(v) => set("gym", v === "yes")}
      />
      {form.gym === true && (
        <>
          <Field id="ob-days" label={`Days per week: ${form.gym_days}`}>
            <input id="ob-days" type="range" min="1" max="7" value={form.gym_days} onChange={(e) => set("gym_days", Number(e.target.value))} className="w-full accent-emerald-600" />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>1</span><span>7</span></div>
          </Field>
          <OptionCards name="Experience" options={EXPERIENCE} value={form.experience} onChange={(v) => set("experience", v)} columns={3} />
        </>
      )}
      {form.gym === false && (
        <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-white cursor-pointer">
          <input type="checkbox" checked={form.home_workouts} onChange={(e) => set("home_workouts", e.target.checked)} className="w-4 h-4 accent-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">Include short home workouts in my plan (no equipment)</span>
        </label>
      )}
    </div>
  );
}

function FoodStep({ form, set }) {
  const toggle = (item) => set("avoid", form.avoid.includes(item) ? form.avoid.filter((a) => a !== item) : [...form.avoid, item]);
  return (
    <div className="space-y-5">
      <OptionCards name="Diet preference" options={DIET_PREFS} value={form.diet_pref} onChange={(v) => set("diet_pref", v)} columns={3} />
      <div>
        <p className="text-xs font-bold text-slate-700 mb-2">Anything to avoid? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {AVOID_OPTIONS.map((item) => {
            const on = form.avoid.includes(item);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${on ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const MACROS = [
  { key: "protein", label: "Protein", color: "text-indigo-600" },
  { key: "carbs", label: "Carbs", color: "text-amber-600" },
  { key: "fat", label: "Fat", color: "text-rose-600" },
];

function NumbersStep({ form, set }) {
  const { actions } = useAppState();
  const [computed, setComputed] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Re-compute on the server whenever an answer (or the ±kcal nudge) changes; debounced.
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => {
      actions
        .previewTargets(toApiProfile(form), controller.signal)
        .then((c) => c && setComputed(c))
        .catch((err) => err.name !== "AbortError" && setError(err.message));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form, actions]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!computed) return <p className="text-sm text-slate-500">Working out your numbers…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 text-center shadow">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Daily calories</div>
        <div className="text-4xl font-extrabold mt-1" data-testid="ob-kcal">{computed.kcal.toLocaleString()} kcal</div>
        <p className="text-xs mt-2 opacity-90">{computed.note}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {MACROS.map((m) => (
          <div key={m.key} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{m.label}</div>
            <div className={`text-xl font-extrabold ${m.color}`}>{computed[m.key]} g</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 space-y-1">
        <p>Maintenance (what you burn) ≈ <strong className="text-slate-800">{computed.tdee.toLocaleString()} kcal</strong>, resting ≈ {computed.bmr.toLocaleString()} kcal.</p>
        {computed.weeks_to_target && (
          <p>At this pace you'd reach <strong className="text-slate-800">{form.target_weight_kg} kg</strong> in about <strong className="text-slate-800">{computed.weeks_to_target} weeks</strong>.</p>
        )}
      </div>
      <Field id="ob-adjust" label={`Fine-tune: ${form.kcal_adjust > 0 ? "+" : ""}${form.kcal_adjust} kcal`} hint="Nudge the target if you know you need a little more or less. You can change this any time.">
        <input id="ob-adjust" type="range" min="-200" max="200" step="25" value={form.kcal_adjust} onChange={(e) => set("kcal_adjust", Number(e.target.value))} className="w-full accent-emerald-600" />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>−200</span><span>0</span><span>+200</span></div>
      </Field>
    </div>
  );
}

const inRange = (v, lo, hi) => v !== "" && v !== null && Number(v) >= lo && Number(v) <= hi;

export const STEPS = [
  { key: "about", title: "About you", subtitle: "We use this to work out what your body burns in a day.", Component: AboutStep,
    valid: (f) => inRange(f.age, 13, 100) && inRange(f.height_cm, 100, 250) && inRange(f.weight_kg, 25, 300) },
  { key: "goal", title: "Your goal", subtitle: "What should the plan aim for?", Component: GoalStep,
    valid: (f) => Boolean(f.goal) && (f.target_weight_kg === "" || inRange(f.target_weight_kg, 25, 300)) },
  { key: "activity", title: "Daily activity", subtitle: "Outside of workouts, how much do you move?", Component: ActivityStep,
    valid: (f) => Boolean(f.activity) },
  { key: "training", title: "Training", subtitle: "This shapes your workout plan.", Component: TrainingStep,
    valid: (f) => f.gym === false || (f.gym === true && Boolean(f.experience)) },
  { key: "food", title: "Food preferences", subtitle: "So the diet plan suggests food you'll actually eat.", Component: FoodStep,
    valid: (f) => Boolean(f.diet_pref) },
  { key: "numbers", title: "Your numbers", subtitle: "Calculated from your answers — no guesswork.", Component: NumbersStep,
    valid: () => true },
];
