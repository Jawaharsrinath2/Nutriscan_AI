import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppState";
import { fmt } from "../../lib/format";
import TabNav from "./TabNav";

const MODE_SHORT_LABEL = { gemini: "Gemini Vision", yolo: "YOLO Vision", none: "Manual Mode" };

export default function Header({ activeTab, onTabChange, onOpenVision }) {
  const { user, logout } = useAuth();
  const { day, evaluation, vision } = useAppState();
  const remaining = evaluation?.remaining;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => onTabChange(activeTab === "landing" ? "scanner" : "landing")}
          title={activeTab === "landing" ? "Back to Dashboard" : "View Landing Page"}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                NutriScan <span className="text-emerald-600">AI</span>
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Pre-Meal Check</span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Snap or upload your plate before eating to inspect ingredients, calories, protein &amp; diet fit
            </p>
          </div>
        </div>

        <TabNav activeTab={activeTab} onChange={onTabChange} mealCount={day?.meals.length ?? 0} />

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 font-medium">Remaining Today:</span>
              <span className="ml-1 font-bold text-emerald-700">{fmt(remaining?.kcal)} kcal</span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400 font-medium">Protein Left:</span>
              <span className="ml-1 font-bold text-indigo-600">{fmt(remaining?.protein)}g</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenVision}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Choose the photo detection engine"
          >
            <span className={`w-2 h-2 rounded-full ${vision?.active_ready ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            <span>{vision ? MODE_SHORT_LABEL[vision.active] : "Smart Vision"}</span>
          </button>

          {/* User menu */}
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-200">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                {(user?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 hidden lg:inline max-w-[100px] truncate">{user?.username}</span>
            <button
              type="button"
              onClick={logout}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-medium transition"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
