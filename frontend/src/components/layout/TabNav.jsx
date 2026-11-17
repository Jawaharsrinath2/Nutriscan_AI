import { NavLink } from "react-router-dom";
import { PATHS } from "../../lib/paths";

const BASE = "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all";
const ACTIVE = `${BASE} bg-white text-emerald-700 shadow-sm`;
const INACTIVE = `${BASE} text-slate-600 hover:text-slate-900`;

const tabClass = ({ isActive }) => (isActive ? ACTIVE : INACTIVE);

/** The three app pages as real links, so the URL, reload, back and forward all follow the tabs. */
export default function TabNav({ mealCount }) {
  return (
    <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
      <NavLink to={PATHS.scan} className={tabClass}>
        📸 Food Scanner
      </NavLink>
      <NavLink to={PATHS.dashboard} className={tabClass}>
        📊 Dashboard{" "}
        <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-xs">{mealCount}</span>
      </NavLink>
      <NavLink to={PATHS.dietPlan} className={tabClass}>
        🎯 Diet Plan & Goals
      </NavLink>
    </nav>
  );
}
