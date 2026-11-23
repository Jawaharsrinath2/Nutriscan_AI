import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppState";
import { PATHS } from "../../lib/paths";

const PAGE_METADATA = {
  [PATHS.scan]: {
    title: "Food Plate Scanner",
    icon: "📸",
    subtitle: "Snap or upload your meal to inspect calories, protein & diet fit",
  },
  [PATHS.audit]: {
    title: "Packaged Food & Barcode Health Audit",
    icon: "🔍",
    subtitle: "Inspect supermarket food labels, detect hidden sugars & harmful additives",
  },
  [PATHS.menuDecider]: {
    title: "Restaurant Menu Decider",
    icon: "🍽️",
    subtitle: "Cross-reference restaurant dishes with your remaining daily calories & macros",
  },
  [PATHS.dashboard]: {
    title: "Nutrition Dashboard",
    icon: "📊",
    subtitle: "Daily calorie budget, macro tracking, water log & history",
  },
  [PATHS.dietPlan]: {
    title: "Diet Plan & Biometric Goals",
    icon: "🎯",
    subtitle: "Personalized nutrition targets, macros & workout regimen",
  },
  [PATHS.profile]: {
    title: "Profile & Account Settings",
    icon: "👤",
    subtitle: "Custom avatar, theme preferences, display name & security",
  },
};

export default function TopBar({ onOpenMobile, onOpenVoiceLog }) {
  const { user } = useAuth();
  const { day, targets } = useAppState();
  const location = useLocation();

  const meta = PAGE_METADATA[location.pathname] || {
    title: "NutriScan AI",
    icon: "🥗",
    subtitle: "Smart Pre-Meal Nutrition Intelligence",
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const remainingKcal = Math.max(0, (targets?.kcal ?? 0) - (day?.totals?.kcal ?? 0));

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Hamburger Menu & Page Title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={onOpenMobile}
            className="lg:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
            title="Open Navigation Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.icon}</span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {meta.title}
              </h1>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Date pill + Remaining Calories + Profile Link */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Today Date Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <span>📅</span>
            <span>{todayStr}</span>
          </div>

          {/* Remaining Calories Pill */}
          {targets?.kcal && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
              <span>🔥</span>
              <span className="hidden sm:inline">Remaining:</span>
              <span>{remainingKcal} kcal</span>
            </div>
          )}

          {/* Quick Voice Log Button */}
          {onOpenVoiceLog && (
            <button
              type="button"
              onClick={onOpenVoiceLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm transition active:scale-95"
              title="Log meal instantly with voice"
            >
              <span className="text-sm">🎙️</span>
              <span className="hidden sm:inline">Voice Log</span>
            </button>
          )}

          {/* Mobile Profile Avatar */}
          <Link
            to={PATHS.profile}
            className="lg:hidden w-8 h-8 rounded-full ring-2 ring-emerald-500/30 overflow-hidden"
            title="Profile"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                {(user?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
