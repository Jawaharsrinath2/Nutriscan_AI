import { useAppState } from "../../context/AppState";
import RichText from "../common/RichText";

// Full class strings per level (kept whole so Tailwind's build can find them).
const STYLES = {
  good: {
    icon: "✅",
    card: "p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
    iconBox: "w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm",
    title: "text-sm font-extrabold text-emerald-950",
    text: "text-xs text-emerald-900/90 mt-1 leading-relaxed",
  },
  warn: {
    icon: "💡",
    card: "p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
    iconBox: "w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-sm",
    title: "text-sm font-extrabold text-amber-950",
    text: "text-xs text-amber-900/90 mt-1 leading-relaxed",
  },
  over: {
    icon: "⚠️",
    card: "p-4 rounded-2xl bg-rose-50/90 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
    iconBox: "w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm",
    title: "text-sm font-extrabold text-rose-950",
    text: "text-xs text-rose-900/90 mt-1 leading-relaxed",
  },
  empty: {
    icon: "🍽️",
    card: "p-4 rounded-2xl bg-slate-50/90 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
    iconBox: "w-10 h-10 rounded-xl bg-slate-500 text-white flex items-center justify-center text-lg shrink-0 shadow-sm",
    title: "text-sm font-extrabold text-slate-900",
    text: "text-xs text-slate-600 mt-1 leading-relaxed",
  },
};

export default function DietVerdict({ evaluation }) {
  const { actions } = useAppState();
  if (!evaluation) {
    return <div className={STYLES.empty.card}><p className={STYLES.empty.text}>Evaluating plate…</p></div>;
  }
  const { verdict, score } = evaluation;
  const style = STYLES[verdict.level];

  return (
    <div className={style.card}>
      <div className="flex items-start gap-3">
        <div className={style.iconBox}>{style.icon}</div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={style.title}>{verdict.title}</h3>
            {verdict.level !== "empty" && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                Nutrition Score: {score}/100
              </span>
            )}
          </div>
          <p className={style.text}>
            <RichText text={verdict.message} />
          </p>
        </div>
      </div>
      {verdict.show_auto_fit && (
        <button
          type="button"
          onClick={actions.autoFit}
          className="shrink-0 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition"
        >
          ⚖️ Auto-Fit to Remaining Kcal
        </button>
      )}
    </div>
  );
}
