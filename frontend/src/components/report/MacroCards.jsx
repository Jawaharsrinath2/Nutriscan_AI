import { fmt } from "../../lib/format";

function MacroCard({ label, value, pct, caption, box, labelColor, pctBadge, captionColor }) {
  return (
    <div className={`p-3.5 rounded-2xl ${box} flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${labelColor}`}>{label}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pctBadge}`}>{pct}</span>
      </div>
      <div className="mt-1">
        <span className="text-2xl font-extrabold text-slate-900">{fmt(value)}</span>
        <span className="text-xs font-semibold text-slate-500"> g</span>
      </div>
      <div className={`text-[11px] ${captionColor} font-medium mt-1`}>{caption}</div>
    </div>
  );
}

export default function MacroCards({ evaluation }) {
  const totals = evaluation?.totals;
  const split = evaluation?.split;
  const pct = (value) => (value == null ? "–" : `${value}%`);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm col-span-2 sm:col-span-1 flex flex-col justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">Calories</div>
        <div className="mt-1">
          <span className="text-2xl sm:text-3xl font-extrabold">{fmt(totals?.kcal)}</span>
          <span className="text-xs font-semibold text-emerald-100"> kcal</span>
        </div>
        <div className="text-[11px] text-emerald-100 mt-1">{pct(evaluation?.share_of_day_pct)} of daily goal</div>
      </div>

      <MacroCard
        label="Protein"
        value={totals?.protein}
        pct={pct(split?.protein_pct)}
        caption="Muscle & satiety"
        box="bg-indigo-50 border border-indigo-100"
        labelColor="text-indigo-700"
        pctBadge="bg-indigo-100 text-indigo-800"
        captionColor="text-indigo-700"
      />
      <MacroCard
        label="Carbs"
        value={totals?.carbs}
        pct={pct(split?.carbs_pct)}
        caption="Energy release"
        box="bg-amber-50 border border-amber-100"
        labelColor="text-amber-700"
        pctBadge="bg-amber-100 text-amber-800"
        captionColor="text-amber-700"
      />
      <MacroCard
        label="Total Fat"
        value={totals?.fat}
        pct={pct(split?.fat_pct)}
        caption="Essential lipids"
        box="bg-rose-50 border border-rose-100"
        labelColor="text-rose-700"
        pctBadge="bg-rose-100 text-rose-800"
        captionColor="text-rose-700"
      />

      <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Dietary Fiber</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">Gut</span>
        </div>
        <div className="mt-1">
          <span className="text-2xl font-extrabold text-slate-900">{fmt(totals?.fiber)}</span>
          <span className="text-xs font-semibold text-slate-500"> g</span>
        </div>
        <div className="text-[11px] text-teal-700 font-medium mt-1">{evaluation?.glycemic ?? "–"}</div>
      </div>
    </div>
  );
}
