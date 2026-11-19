import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppState";
import { PATHS } from "../../lib/paths";
import TabNav from "./TabNav";

const MODE_SHORT_LABEL = { gemini: "Gemini Vision", yolo: "YOLO Vision", none: "Manual Mode" };

export default function Header({ onOpenVision }) {
  const { user, isAdmin, logout } = useAuth();
  const { day, vision } = useAppState();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: Brand / Logo */}
        <Link to={PATHS.landing} className="flex items-center gap-2.5 select-none group shrink-0" title="View Landing Page">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                NutriScan <span className="text-emerald-600">AI</span>
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hidden sm:inline-block">Pre-Meal Check</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden xl:block">
              Snap or upload your plate before eating to inspect ingredients, calories, protein &amp; diet fit
            </p>
          </div>
        </Link>

        {/* Right side: Tabs + Vision Button + Admin Button + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <TabNav mealCount={day?.meals.length ?? 0} />

          <button
            type="button"
            onClick={onOpenVision}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Choose the photo detection engine"
          >
            <span className={`w-2 h-2 rounded-full ${vision?.active_ready ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            <span className="hidden sm:inline">{vision ? MODE_SHORT_LABEL[vision.active] : "Smart Vision"}</span>
          </button>

          {isAdmin && (
            <Link
              to={PATHS.admin}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-amber-500/20"
              title="Open Admin Control Panel"
            >
              <span>👑</span>
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* User profile avatar at the right corner side (Click to open Profile & Settings) */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              to={PATHS.profile}
              className="group relative flex items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none"
              title={`View Profile & Settings (${user?.username || "Account"})`}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username || "Profile"}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 transition shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs sm:text-sm font-extrabold shadow-sm ring-2 ring-emerald-500/20 group-hover:ring-emerald-500 transition uppercase">
                  {(user?.username?.[0] || "U").toUpperCase()}
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-red-300 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs font-medium transition"
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
