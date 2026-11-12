import { useState } from "react";
import { STEPS } from "../components/onboarding/steps";
import { useAppState } from "../context/AppState";
import { EMPTY_PROFILE, toApiProfile } from "../lib/profileOptions";

// Pre-fill from a saved profile when editing; numbers become strings for the inputs.
function fromSaved(profile) {
  if (!profile) return EMPTY_PROFILE;
  const str = (v) => (v === null || v === undefined ? "" : String(v));
  return {
    ...EMPTY_PROFILE,
    ...profile,
    age: str(profile.age),
    height_cm: str(profile.height_cm),
    weight_kg: str(profile.weight_kg),
    target_weight_kg: str(profile.target_weight_kg),
    gym_days: profile.gym ? profile.gym_days : 3,
  };
}

export default function OnboardingView({ initialStep = 0, editing = false, onDone, onCancel }) {
  const { profile, actions } = useAppState();
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1));
  const [form, setForm] = useState(() => fromSaved(profile?.profile));
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const canContinue = current.valid(form);
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const finish = async () => {
    setSaving(true);
    const saved = await actions.saveProfile(toApiProfile(form));
    setSaving(false);
    if (saved) onDone();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <span className="font-extrabold text-slate-900">
              NutriScan <span className="text-emerald-600">AI</span>
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-6" aria-hidden="true">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900">{current.title}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{current.subtitle}</p>
          <current.Component form={form} set={set} />
        </div>

        <div className="flex items-center justify-between gap-3 mt-5">
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                ← Back
              </button>
            )}
            {editing && (
              <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-slate-500 text-sm font-semibold hover:text-slate-800 transition">
                Cancel
              </button>
            )}
          </div>
          {last ? (
            <button
              type="button"
              onClick={finish}
              disabled={saving || !canContinue}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 transition"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Start tracking →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 transition"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
