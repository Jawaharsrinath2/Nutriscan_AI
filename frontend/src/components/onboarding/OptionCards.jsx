const SELECTED = "text-left p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 shadow-sm transition";
const IDLE = "text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 bg-white transition";

/** A grid of big tappable choices. `options`: [{ key, label, icon?, desc? }]. */
export default function OptionCards({ options, value, onChange, columns = 1, name }) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" }[columns];
  return (
    <div role="radiogroup" aria-label={name} className={`grid ${cols} gap-3`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={value === opt.key ? SELECTED : IDLE}
        >
          <div className="flex items-start gap-3">
            {opt.icon && <span className="text-2xl leading-none mt-0.5">{opt.icon}</span>}
            <div>
              <div className="text-sm font-extrabold text-slate-900">{opt.label}</div>
              {opt.desc && <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export const INPUT =
  "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";
