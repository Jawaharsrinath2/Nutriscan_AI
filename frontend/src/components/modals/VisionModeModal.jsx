import { useEffect, useState } from "react";
import { useAppState } from "../../context/AppState";

export default function VisionModeModal({ open, onClose }) {
  const { vision, actions } = useAppState();
  const [selected, setSelected] = useState(vision?.active ?? "none");

  useEffect(() => {
    if (open && vision) setSelected(vision.active);
  }, [open, vision]);

  if (!open || !vision) return null;

  const save = async () => {
    await actions.changeVisionMode(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">🤖 Vision Analysis Mode</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
        </div>
        <div className="p-4 space-y-4 text-xs text-slate-600">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <strong>Detection runs on the backend.</strong> Choose which engine scans your photos. API keys and model
            weights are configured in <code>backend/.env</code>, never in the browser.
          </div>

          <div className="space-y-2">
            {vision.options.map((option) => (
              <label
                key={option.mode}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  selected === option.mode ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                <input
                  type="radio"
                  name="visionMode"
                  value={option.mode}
                  checked={selected === option.mode}
                  onChange={() => setSelected(option.mode)}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{option.label}</span>
                    <span className={`w-2 h-2 rounded-full ${option.ready ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                  </div>
                  {option.reason && <p className="text-[11px] text-amber-700 mt-0.5">{option.reason}</p>}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
              Save Preference
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
