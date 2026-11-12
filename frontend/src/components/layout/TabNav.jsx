const ACTIVE = "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-white text-emerald-700 shadow-sm";
const INACTIVE = "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all text-slate-600 hover:text-slate-900";

export default function TabNav({ activeTab, onChange, mealCount }) {
  const tabClass = (tab) => (activeTab === tab ? ACTIVE : INACTIVE);
  return (
    <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
      <button type="button" className={tabClass("scanner")} onClick={() => onChange("scanner")}>
        📸 Food Scanner
      </button>
      <button type="button" className={tabClass("tracker")} onClick={() => onChange("tracker")}>
        📊 Daily Diet Log{" "}
        <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-xs">{mealCount}</span>
      </button>
      <button type="button" className={tabClass("goals")} onClick={() => onChange("goals")}>
        🎯 Diet Plan & Goals
      </button>
    </nav>
  );
}
